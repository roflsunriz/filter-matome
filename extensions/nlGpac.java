package extensions;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import dareka.NLMain;
import dareka.common.Logger;
import dareka.common.LoggerHandler;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Processor;
import dareka.processor.Resource;
import dareka.processor.StringResource;
import dareka.processor.impl.Cache;
import dareka.processor.impl.VideoDescriptor;

/** Uses GPAC to inspect cached media and returns one normalized JSON document. */
public class nlGpac implements Extension2, Processor {
	public static final int REVISION = 26081801;
	public static final String VER_STRING = "nlGpac_" + REVISION;
	public static final String LOG_PREFIX = "GPAC";
	private static final String GPAC_PATH_PROPERTY = "gpac.path";
	private static final String GPAC_PATH_ENVIRONMENT = "GPAC_PATH";
	private static final String MASTER_PLAYLIST_NAME = "master.m3u8";
	private static final int MAX_PROCESS_ERROR_LENGTH = 16000;
	private static final int MAX_PROCESS_OUTPUT_LENGTH = 16 * 1024 * 1024;
	private static final long PROCESS_TIMEOUT_SECONDS = 120;
	private static final String[] PROCESSOR_SUPPORTED_METHODS = { "GET" };
	private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
			"^https?://nicocachenl\\.test/api/v1/extensions/filter-matome/gpac/([a-z]{2}\\d+(low)?(?:\\[\\w+,\\d+,\\d+\\]\\w*\\.(?:flv|mp4))?)");
	private static final Pattern SUMMARY_FRAME_COUNT_PATTERN = Pattern.compile(
			"(?m)^\\s*Nb Frames:\\s*(\\d+)");
	private static final Pattern SUMMARY_TOTAL_SIZE_PATTERN = Pattern.compile(
			"(?m)^\\s*Total size:\\s*([\\d,]+)\\s*bytes");
	private static final Pattern SUMMARY_DURATION_PATTERN = Pattern.compile(
			"(?m)^\\s*Cumulated Duration:.*\\((\\d+):(\\d+):(\\d+(?:\\.\\d+)?)\\)");
	private static final Pattern SUMMARY_BITRATE_PATTERN = Pattern.compile(
			"(?m)^\\s*Bitrate:\\s*avg\\s+([\\d.]+)\\s+max\\s+([\\d.]+)\\s+(kbps|Mbps)");
	private static final Pattern PID_ELEMENT_PATTERN = Pattern.compile(
			"(?s)<PIDConfigure\\b[^>]*/>");
	private static final Pattern REMOTE_MANIFEST_REFERENCE_PATTERN = Pattern.compile(
			"(?i)(?:https?|ftp|rtmp|udp|srt|ws|wss)://");

	private volatile LoggerHandler extensionLogger;

	// Extension2 interface
	public void registerExtensions(ExtensionManager mgr) {
		mgr.registerProcessor(this);

		if (extensionLogger == null) {
			extensionLogger = NLMain.getExtLogger(
					this, LOG_PREFIX, null, false);
		}
	}

	public String getVersionString() {
		return VER_STRING;
	}

	// Processor interface
	public String[] getSupportedMethods() {
		return PROCESSOR_SUPPORTED_METHODS;
	}

	public Pattern getSupportedURLAsPattern() {
		return PROCESSOR_SUPPORTED_PATTERN;
	}

	public String getSupportedURLAsString() {
		return null;
	}

	public Resource onRequest(HttpRequestHeader requestHeader, Socket browser)
			throws IOException {
		Matcher matcher = PROCESSOR_SUPPORTED_PATTERN.matcher(requestHeader.getURI());
		if (matcher.find()) {
			String altid = matcher.group(1);
			VideoDescriptor video = Cache.getPreferredCachedVideo(altid);
			if (video != null) {
				File cacheFile = new Cache(video).getCacheFile();
				String json = getGpacJSON(cacheFile);
				if (json != null) {
					StringResource resource = new StringResource(json);
					resource.addResponseHeader(HttpHeader.CONTENT_TYPE, "application/json");
					resource.addNoCacheResponseHeaders();
					return resource;
				}
			}
		}
		return StringResource.getNotFound();
	}

	private String getGpacJSON(File cacheFile) {
		if (cacheFile == null || !cacheFile.exists()) {
			logError("GPAC input not found: "
					+ (cacheFile == null ? "null" : cacheFile.getPath()));
			return null;
		}

		File analysisInput = resolveHlsPlaylist(cacheFile);
		boolean manifestInput = analysisInput != null;
		if (analysisInput == null) {
			if (cacheFile.isDirectory()) {
				logError("HLS playlist not found in cache: " + cacheFile.getPath());
				return null;
			}
			analysisInput = cacheFile;
		}
		if (manifestInput && !isLocalManifest(analysisInput)) {
			return null;
		}

		try {
			Map<String, Object> result = runCommand(
					buildGpacCommand(analysisInput, manifestInput));
			int exitCode = ((Integer) result.get("exitCode")).intValue();
			String stdout = (String) result.get("stdout");
			if (exitCode != 0 || stdout.trim().isEmpty()) {
				logError("GPAC failed with exit code " + exitCode + ": "
						+ summarizeProcessError(result));
				return null;
			}
			if (Boolean.TRUE.equals(result.get("stdoutTruncated"))) {
				logError("GPAC output exceeded " + MAX_PROCESS_OUTPUT_LENGTH
						+ " characters and was rejected as incomplete");
				return null;
			}

			String json = normalizeInspectXml(
					stdout, cacheFile, analysisInput, manifestInput);
			if (json == null) {
				return null;
			}
			logGpacResult(cacheFile, analysisInput, json);
			return json;
		} catch (IOException e) {
			logError("GPAC could not be started: " + e.getMessage()
					+ ". Set -D" + GPAC_PATH_PROPERTY + " or "
					+ GPAC_PATH_ENVIRONMENT + " to the GPAC executable if needed.");
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			logError("GPAC execution interrupted: " + e.getMessage());
		} catch (ParserConfigurationException | SAXException e) {
			logError("GPAC XML output could not be parsed: " + e.getMessage());
		}
		return null;
	}

	/** Resolves a directory or a direct playlist to the single GPAC input manifest. */
	static File resolveHlsPlaylist(File cacheFile) {
		if (cacheFile == null || !cacheFile.exists()) {
			return null;
		}
		if (!cacheFile.isDirectory()) {
			return isM3u8(cacheFile) ? cacheFile : null;
		}

		File masterPlaylist = resolveNamedPlaylist(cacheFile);
		if (masterPlaylist != null) {
			return masterPlaylist;
		}

		// A cache without a master playlist is accepted only when it has one
		// unambiguous media playlist. Separate audio/video playlists need a master.
		List<File> playlists = new ArrayList<File>();
		collectPlaylists(cacheFile, playlists);
		return playlists.size() == 1 ? playlists.get(0) : null;
	}

	private static File resolveNamedPlaylist(File directory) {
		File[] children = directory.listFiles();
		if (children == null) {
			return null;
		}
		Arrays.sort(children, (left, right) ->
				left.getName().compareToIgnoreCase(right.getName()));
		for (File child : children) {
			if (child.isFile()
					&& MASTER_PLAYLIST_NAME.equalsIgnoreCase(child.getName())) {
				return child;
			}
		}
		for (File child : children) {
			if (!child.isDirectory()) {
				continue;
			}
			File nestedMasterPlaylist = resolveNamedPlaylist(child);
			if (nestedMasterPlaylist != null) {
				return nestedMasterPlaylist;
			}
		}
		return null;
	}

	private static void collectPlaylists(File directory, List<File> playlists) {
		File[] children = directory.listFiles();
		if (children == null) {
			return;
		}
		Arrays.sort(children, (left, right) ->
				left.getName().compareToIgnoreCase(right.getName()));
		for (File child : children) {
			if (child.isFile() && isM3u8(child)) {
				playlists.add(child);
			} else if (child.isDirectory()) {
				collectPlaylists(child, playlists);
			}
		}
	}

	private static boolean isM3u8(File file) {
		return file.isFile()
				&& file.getName().toLowerCase(Locale.ROOT).endsWith(".m3u8");
	}

	static List<String> buildGpacCommand(File input, boolean manifestInput) {
		List<String> command = new ArrayList<String>();
		command.add(resolveGpacCommand());
		// GPAC's profile 0 prevents this read-only inspection from writing a user
		// configuration file. GPAC still uses its installed filters and codecs.
		command.add("-p=0");
		command.add("-se");
		command.add("-i");
		String source = input.getAbsolutePath();
		if (manifestInput) {
			// Select one complete, highest-bandwidth representation and its dependent
			// streams; inspect then consumes the full selected presentation.
			source += ":algo=none:start_with=max_bw";
		}
		command.add(source);
		command.add("inspect:xml:stats:allp");
		return command;
	}

	private boolean isLocalManifest(File playlist) {
		try {
			String content = Files.readString(playlist.toPath(), StandardCharsets.UTF_8);
			Matcher matcher = REMOTE_MANIFEST_REFERENCE_PATTERN.matcher(content);
			if (matcher.find()) {
				logError("Remote URL is not allowed in cached HLS manifest: "
						+ playlist.getPath());
				return false;
			}
			return true;
		} catch (IOException e) {
			logError("HLS manifest could not be read: " + playlist.getPath()
					+ " (" + e.getMessage() + ")");
			return false;
		}
	}

	private static String resolveGpacCommand() {
		Set<String> candidates = new LinkedHashSet<String>();
		addGpacPath(candidates, System.getProperty(GPAC_PATH_PROPERTY));
		addGpacPath(candidates, System.getenv(GPAC_PATH_ENVIRONMENT));
		addGpacRoot(candidates, "C:\\PathArea\\GPAC");
		addGpacRoot(candidates, "C:\\PathArea\\gpac");
		addGpacRoot(candidates, "C:\\PathArea\\bin");

		String localAppData = System.getenv("LOCALAPPDATA");
		addGpacRoot(candidates, joinPath(localAppData, "Programs\\GPAC"));
		addGpacRoot(candidates, joinPath(localAppData, "GPAC"));

		String programFiles = System.getenv("ProgramFiles");
		addGpacRoot(candidates, joinPath(programFiles, "GPAC"));
		String programFilesX86 = System.getenv("ProgramFiles(x86)");
		addGpacRoot(candidates, joinPath(programFilesX86, "GPAC"));

		String userProfile = System.getenv("USERPROFILE");
		addGpacRoot(candidates, joinPath(userProfile, "scoop\\apps\\gpac\\current"));

		for (String candidate : candidates) {
			if (new File(candidate).isFile()) {
				return candidate;
			}
		}
		// ProcessBuilder resolves the final candidate through PATH, including
		// installations managed outside the known Windows locations.
		return "gpac";
	}

	private static void addGpacRoot(Set<String> candidates, String root) {
		if (root == null || root.trim().isEmpty()) {
			return;
		}
		addGpacPath(candidates, root);
		addGpacPath(candidates, new File(root, "bin").getPath());
	}

	private static void addGpacPath(Set<String> candidates, String value) {
		if (value == null || value.trim().isEmpty()) {
			return;
		}
		File path = new File(value.trim());
		if (path.isDirectory()) {
			candidates.add(new File(path, "gpac.exe").getPath());
			candidates.add(new File(path, "gpac").getPath());
		} else {
			candidates.add(path.getPath());
		}
	}

	private static String joinPath(String base, String child) {
		if (base == null || base.trim().isEmpty()) {
			return null;
		}
		return new File(base, child).getPath();
	}

	static String normalizeInspectXml(
			String xml, File originalInput, File analysisInput, boolean manifestInput)
			throws ParserConfigurationException, SAXException, IOException {
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
		factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
		factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
		factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
		factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
		factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
		factory.setXIncludeAware(false);
		factory.setExpandEntityReferences(false);

		Document document = factory.newDocumentBuilder().parse(
				new InputSource(new StringReader(xml)));
		NodeList pidNodes = document.getElementsByTagName("PIDConfigure");
		List<String> summaries = extractPidSummaries(xml);
		List<LinkedHashMap<String, String>> tracks =
				new ArrayList<LinkedHashMap<String, String>>();
		String tool = "";
		for (int index = 0; index < pidNodes.getLength(); index++) {
			Node node = pidNodes.item(index);
			if (!(node instanceof Element)) {
				continue;
			}
			String summary = index < summaries.size() ? summaries.get(index) : "";
			LinkedHashMap<String, String> track = buildTrackProperties(
					(Element) node, summary);
			tracks.add(track);
			if (tool.isEmpty() && !track.getOrDefault("tool", "").isEmpty()) {
				tool = track.get("tool");
			}
		}
		if (tracks.isEmpty()) {
			throw new SAXException("GPAC returned no PIDConfigure elements");
		}
		return buildJson(originalInput, analysisInput, manifestInput, tool, tracks);
	}

	private static List<String> extractPidSummaries(String xml) {
		List<String> summaries = new ArrayList<String>();
		Matcher matcher = PID_ELEMENT_PATTERN.matcher(xml);
		List<Integer> starts = new ArrayList<Integer>();
		List<Integer> ends = new ArrayList<Integer>();
		while (matcher.find()) {
			starts.add(matcher.start());
			ends.add(matcher.end());
		}
		for (int index = 0; index < ends.size(); index++) {
			int nextStart = index + 1 < starts.size()
					? starts.get(index + 1) : xml.indexOf("</GPACInspect>", ends.get(index));
			if (nextStart < 0) {
				nextStart = xml.length();
			}
			summaries.add(xml.substring(ends.get(index), nextStart));
		}
		return summaries;
	}

	private static LinkedHashMap<String, String> buildTrackProperties(
			Element element, String summaryText) {
		LinkedHashMap<String, String> properties =
				new LinkedHashMap<String, String>();
		NamedNodeMap attributes = element.getAttributes();
		for (int index = 0; index < attributes.getLength(); index++) {
			Node attribute = attributes.item(index);
			properties.put(attribute.getNodeName(), attribute.getNodeValue());
		}

		Map<String, String> summary = parseSummary(summaryText);
		String type = mapStreamType(properties.get("StreamType"));
		LinkedHashMap<String, String> result =
				new LinkedHashMap<String, String>();
		result.put("@type", type);
		result.putAll(properties);

		long summaryFrameCount = parseLong(summary.get("frames"));
		long summaryTotalSize = parseLong(summary.get("size"));
		double summaryDuration = parseFraction(summary.get("duration"));
		long summaryAverageBitrate = parseLong(summary.get("avgBitrate"));
		long summaryMaxBitrate = parseLong(summary.get("maxBitrate"));
		if (summaryFrameCount > 0) {
			result.put("NumFrames", String.valueOf(summaryFrameCount));
		}
		if (summaryTotalSize > 0) {
			result.put("MediaDataSize", String.valueOf(summaryTotalSize));
		}
		if (summaryAverageBitrate > 0
				&& parseLong(properties.get("Bitrate")) == 0) {
			result.put("Bitrate", String.valueOf(summaryAverageBitrate));
		}
		if (summaryMaxBitrate > 0 && parseLong(properties.get("Maxrate")) == 0) {
			result.put("Maxrate", String.valueOf(summaryMaxBitrate));
		}

		String bitrate = result.remove("Bitrate");
		if (bitrate != null && !bitrate.isEmpty()) {
			result.put("BitRate", bitrate);
		}
		putAlias(result, "NumFrames", "FrameCount");
		putAlias(result, "NumChannels", "Channels");
		putAlias(result, "FPS", "FrameRate");
		putAlias(result, "MediaDataSize", "StreamSize");
		putAlias(result, "ServiceWidth", "Width");
		putAlias(result, "ServiceHeight", "Height");
		String format = firstNonEmpty(
				properties.get("CodecID"), properties.get("Codec"),
				properties.get("StreamType"));
		if (format != null) {
			result.put("Format", format);
		}

		double duration = summaryDuration > 0
				? summaryDuration : parseFraction(properties.get("Duration"));
		if (duration > 0) {
			if (summaryDuration > 0) {
				result.put("MeasuredDuration", formatDecimal(summaryDuration));
			}
			result.put("DurationSeconds", formatDecimal(duration));
		}
		if ("Video".equals(type) && !result.containsKey("FPS")
				&& summaryFrameCount > 0 && duration > 0) {
			String frameRate = formatDecimal(summaryFrameCount / duration);
			result.put("FPS", frameRate);
			result.put("FrameRate", frameRate);
		}
		return result;
	}

	private static String buildJson(
			File originalInput,
			File analysisInput,
			boolean manifestInput,
			String tool,
			List<LinkedHashMap<String, String>> tracks) {
		int videoCount = 0;
		int audioCount = 0;
		int otherCount = 0;
		long totalBitrate = 0;
		long totalMediaDataSize = 0;
		double durationSeconds = 0;
		for (LinkedHashMap<String, String> track : tracks) {
			if ("Video".equals(track.get("@type"))) {
				videoCount++;
			} else if ("Audio".equals(track.get("@type"))) {
				audioCount++;
			} else {
				otherCount++;
			}
			long bitrate = parseLong(track.get("BitRate"));
			if (bitrate == 0) {
				bitrate = parseLong(track.get("Bitrate"));
			}
			totalBitrate += bitrate;
			long mediaDataSize = parseLong(track.get("StreamSize"));
			if (mediaDataSize == 0) {
				mediaDataSize = parseLong(track.get("MediaDataSize"));
			}
			totalMediaDataSize += mediaDataSize;
			durationSeconds = Math.max(durationSeconds,
					parseFraction(track.get("DurationSeconds")));
		}

		LinkedHashMap<String, String> general = new LinkedHashMap<String, String>();
		general.put("@type", "General");
		general.put("Format", "GPAC inspect");
		general.put("Format_URL", "https://gpac.io");
		general.put("CompleteName", originalInput.getAbsolutePath());
		general.put("FileName", originalInput.getName());
		general.put("GpacInput", analysisInput.getAbsolutePath());
		general.put("GpacInspection", "inspect:xml:stats:allp");
		general.put("GpacQuality", manifestInput ? "max_bw" : "direct");
		general.put("StreamCount", String.valueOf(tracks.size()));
		general.put("VideoCount", String.valueOf(videoCount));
		general.put("AudioCount", String.valueOf(audioCount));
		general.put("OtherCount", String.valueOf(otherCount));
		if (totalBitrate > 0) {
			general.put("OverallBitRate", String.valueOf(totalBitrate));
			general.put("OverallBitRate_Mode", "GPAC PID bitrate sum");
		}
		if (totalMediaDataSize > 0) {
			general.put("MediaDataSize", String.valueOf(totalMediaDataSize));
		}
		if (durationSeconds > 0) {
			general.put("Duration", formatDecimal(durationSeconds));
			general.put("DurationSeconds", formatDecimal(durationSeconds));
		}
		long sourceSize = getSourceSize(originalInput);
		if (sourceSize > 0) {
			general.put("FileSize", String.valueOf(sourceSize));
		}

		StringBuilder json = new StringBuilder(8192);
		json.append("{\"creatingLibrary\":{");
		appendJsonProperty(json, "name", "GPAC", true);
		appendJsonProperty(json, "version", tool.isEmpty() ? "unknown" : tool, false);
		appendJsonProperty(json, "url", "https://gpac.io", false);
		json.append("},\"media\":{");
		appendJsonProperty(json, "@ref", originalInput.getAbsolutePath(), true);
		appendJsonProperty(json, "Input", analysisInput.getAbsolutePath(), false);
		appendJsonProperty(json, "InputType", manifestInput ? "HLS/DASH manifest" : "media file", false);
		json.append(",\"track\":[");
		appendJsonMap(json, general);
		for (LinkedHashMap<String, String> track : tracks) {
			json.append(',');
			appendJsonMap(json, track);
		}
		json.append("]},\"gpac\":{");
		appendJsonProperty(json, "tool", tool.isEmpty() ? "unknown" : tool, true);
		appendJsonProperty(json, "analysis", "full-duration PID inspection", false);
		appendJsonProperty(json, "quality", manifestInput ? "highest bandwidth representation" : "direct media input", false);
		json.append("}}");
		return json.toString();
	}

	private static void appendJsonMap(StringBuilder json, Map<String, String> values) {
		json.append('{');
		boolean first = true;
		for (Map.Entry<String, String> entry : values.entrySet()) {
			appendJsonProperty(json, entry.getKey(), entry.getValue(), first);
			first = false;
		}
		json.append('}');
	}

	private static void appendJsonProperty(
			StringBuilder json, String name, String value, boolean first) {
		if (!first) {
			json.append(',');
		}
		json.append('"');
		appendJsonString(json, name);
		json.append("\":\"");
		appendJsonString(json, value == null ? "" : value);
		json.append('"');
	}

	private static void appendJsonString(StringBuilder json, String value) {
		for (int index = 0; index < value.length(); index++) {
			char character = value.charAt(index);
			switch (character) {
			case '\\':
				json.append("\\\\");
				break;
			case '"':
				json.append("\\\"");
				break;
			case '\b':
				json.append("\\b");
				break;
			case '\f':
				json.append("\\f");
				break;
			case '\n':
				json.append("\\n");
				break;
			case '\r':
				json.append("\\r");
				break;
			case '\t':
				json.append("\\t");
				break;
			default:
				if (character < 0x20) {
					json.append(String.format(Locale.ROOT, "\\u%04x", (int) character));
				} else {
					json.append(character);
				}
			}
		}
	}

	private static long getSourceSize(File source) {
		if (source.isFile()) {
			return source.length();
		}
		if (!source.isDirectory()) {
			return 0;
		}
		try (Stream<Path> paths = Files.walk(source.toPath())) {
			return paths.filter(Files::isRegularFile)
					.mapToLong(path -> {
						try {
							return Files.size(path);
						} catch (IOException e) {
							return 0;
						}
					})
					.sum();
		} catch (IOException e) {
			return 0;
		}
	}

	private static long parseLong(String value) {
		if (value == null || value.trim().isEmpty()) {
			return 0;
		}
		try {
			return Long.parseLong(value.replace(",", "").trim());
		} catch (NumberFormatException e) {
			return 0;
		}
	}

	private static double parseFraction(String value) {
		if (value == null || value.trim().isEmpty()) {
			return 0;
		}
		String[] parts = value.trim().split("/", -1);
		try {
			if (parts.length == 2) {
				double numerator = Double.parseDouble(parts[0]);
				double denominator = Double.parseDouble(parts[1]);
				return denominator == 0 ? 0 : numerator / denominator;
			}
			return Double.parseDouble(parts[0]);
		} catch (NumberFormatException e) {
			return 0;
		}
	}

	private static String formatDecimal(double value) {
		return String.format(Locale.ROOT, "%.3f", value)
				.replaceAll("0+$", "")
				.replaceAll("\\.$", "");
	}

	private static Map<String, Object> runCommand(List<String> command)
			throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command)
				.redirectErrorStream(false);
		File executable = new File(command.get(0));
		if (executable.isFile() && executable.getParentFile() != null) {
			// Keep GPAC's generated probe/config helpers beside the installed tool,
			// never in NicoCache_nl's working directory.
			processBuilder.directory(executable.getParentFile());
		}
		Process process = processBuilder.start();
		StringBuilder stdoutContent = new StringBuilder();
		StringBuilder stderrContent = new StringBuilder();
		boolean[] stdoutTruncated = { false };
		boolean[] stderrTruncated = { false };
		IOException[] stdoutError = { null };
		IOException[] stderrError = { null };
		InputStream stdoutInput = process.getInputStream();
		InputStream stderrInput = process.getErrorStream();
		Thread stdoutThread = new Thread(() -> collectStream(
				stdoutInput, MAX_PROCESS_OUTPUT_LENGTH, stdoutContent,
				stdoutTruncated, stdoutError), "nlGpac-stdout");
		Thread stderrThread = new Thread(() -> collectStream(
				stderrInput, MAX_PROCESS_ERROR_LENGTH, stderrContent,
				stderrTruncated, stderrError), "nlGpac-stderr");
		stdoutThread.setDaemon(true);
		stderrThread.setDaemon(true);
		stdoutThread.start();
		stderrThread.start();
		try {
			boolean finished = process.waitFor(PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS);
			if (!finished) {
				process.destroy();
				if (!process.waitFor(5, TimeUnit.SECONDS)) {
					process.destroyForcibly();
				}
				throw new IOException("GPAC timed out after "
						+ PROCESS_TIMEOUT_SECONDS + " seconds");
			}
			stdoutThread.join();
			stderrThread.join();
			if (stdoutError[0] != null) {
				throw stdoutError[0];
			}
			if (stderrError[0] != null) {
				throw stderrError[0];
			}
			Map<String, Object> result = new LinkedHashMap<String, Object>();
			result.put("exitCode", Integer.valueOf(process.exitValue()));
			result.put("stdout", stdoutContent.toString());
			result.put("stderr", stderrContent.toString());
			result.put("stdoutTruncated", Boolean.valueOf(stdoutTruncated[0]));
			result.put("stderrTruncated", Boolean.valueOf(stderrTruncated[0]));
			return result;
		} finally {
			if (process.isAlive()) {
				process.destroy();
			}
		}
	}

	private static void collectStream(
			InputStream input,
			int maxLength,
			StringBuilder content,
			boolean[] truncated,
			IOException[] error) {
		try (InputStreamReader reader = new InputStreamReader(
				input, StandardCharsets.UTF_8)) {
			char[] buffer = new char[4096];
			for (int length; (length = reader.read(buffer)) != -1;) {
				if (content.length() < maxLength) {
					int remaining = Math.min(length, maxLength - content.length());
					content.append(buffer, 0, remaining);
					if (remaining < length) {
						truncated[0] = true;
					}
				} else {
					truncated[0] = true;
				}
			}
		} catch (IOException e) {
			error[0] = e;
		}
	}

	private static String summarizeProcessError(Map<String, Object> result) {
		String message = ((String) result.get("stderr")).trim();
		if (message.isEmpty()) {
			message = ((String) result.get("stdout")).trim();
		}
		return message.length() > 2000 ? message.substring(0, 2000) + "..." : message;
	}

	private static Map<String, String> parseSummary(String text) {
		LinkedHashMap<String, String> summary =
				new LinkedHashMap<String, String>();
		Matcher frames = SUMMARY_FRAME_COUNT_PATTERN.matcher(text);
		Matcher size = SUMMARY_TOTAL_SIZE_PATTERN.matcher(text);
		Matcher duration = SUMMARY_DURATION_PATTERN.matcher(text);
		Matcher bitrate = SUMMARY_BITRATE_PATTERN.matcher(text);
		if (frames.find()) {
			summary.put("frames", frames.group(1));
		}
		if (size.find()) {
			summary.put("size", size.group(1));
		}
		if (duration.find()) {
			double seconds = Integer.parseInt(duration.group(1)) * 3600.0
					+ Integer.parseInt(duration.group(2)) * 60.0
					+ Double.parseDouble(duration.group(3));
			summary.put("duration", formatDecimal(seconds));
		}
		if (bitrate.find()) {
			double multiplier = "Mbps".equalsIgnoreCase(bitrate.group(3))
					? 1000000.0 : 1000.0;
			summary.put("avgBitrate", formatDecimal(
					Double.parseDouble(bitrate.group(1)) * multiplier));
			summary.put("maxBitrate", formatDecimal(
					Double.parseDouble(bitrate.group(2)) * multiplier));
		}
		return summary;
	}

	private static void putAlias(
			Map<String, String> result, String sourceName, String aliasName) {
		String value = result.get(sourceName);
		if (value != null && !value.isEmpty() && !result.containsKey(aliasName)) {
			result.put(aliasName, value);
		}
	}

	private static String firstNonEmpty(String... values) {
		for (String value : values) {
			if (value != null && !value.isEmpty()) {
				return value;
			}
		}
		return null;
	}

	private static String mapStreamType(String streamType) {
		if (streamType == null) {
			return "Other";
		}
		if ("Visual".equalsIgnoreCase(streamType)) {
			return "Video";
		}
		if ("Audio".equalsIgnoreCase(streamType)) {
			return "Audio";
		}
		if (streamType.toLowerCase(Locale.ROOT).contains("text")) {
			return "Text";
		}
		return "Other";
	}

	private void logGpacResult(File originalInput, File analysisInput, String result) {
		final String formattedMessage = String.format(
				"GPAC result for %s (analysis input: %s):\n%s\n"
						+ "----------------------------------------\n",
				originalInput.getPath(), analysisInput.getPath(), result);
		logInfo(formattedMessage.trim());
	}

	private void logError(String message) {
		LoggerHandler logger = extensionLogger;
		if (logger != null) {
			logger.warning(message);
		} else {
			Logger.warning(LOG_PREFIX + ": " + message);
		}
	}

	private void logInfo(String message) {
		LoggerHandler logger = extensionLogger;
		if (logger != null) {
			logger.info(message);
		} else {
			Logger.info(LOG_PREFIX + ": " + message);
		}
	}
}
