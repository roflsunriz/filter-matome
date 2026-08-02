package extensions;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.common.Logger;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Processor;
import dareka.processor.Resource;
import dareka.processor.StringResource;
import dareka.processor.impl.Cache;
import dareka.processor.impl.VideoDescriptor;
import dareka.NLMain;
import javax.swing.JTextArea;
import javax.swing.JScrollPane;
import java.text.SimpleDateFormat;
import java.util.Date;

/** Calls MediaInfo and returns its JSON response. */
public class nlMediaInfo implements Extension2, Processor {
	public static final int REVISION = 260802001;
	public static final String VER_STRING = "nlMediaInfo_"+REVISION;
	public static final String LOG_PREFIX = "MediaInfo";
	public static final String PROP_DEBUG = "MediaInfoDebug";
	private static final String MASTER_PLAYLIST_NAME = "master.m3u8";
	private static final String FFMPEG_COMMAND = "ffmpeg";
	private static final String FFMPEG_ALLOWED_EXTENSIONS =
			"m3u8,cmfv,cmfa,m4s,m4a,mp4,ts,webm,flv,key";
	private static final String FFMPEG_PROTOCOL_WHITELIST = "file,crypto,data";
	private static final int MAX_PROCESS_ERROR_LENGTH = 16000;

	private static final String[] PROCESSOR_SUPPORTED_METHODS = { "GET" };
	private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
			"^https?://www\\.nicovideo\\.jp/cache/mediainfo\\?([a-z]{2}\\d+(low)?(?:\\[\\w+,\\d+,\\d+\\]\\w*\\.(?:flv|mp4))?)");

	private static JTextArea logArea;
	private static final int MAX_LOG_LENGTH = 100000;

	// Extension2 interface
	public void registerExtensions(ExtensionManager mgr) {
		mgr.registerProcessor(this);
		
		if (logArea == null && NLMain.isLaunchGUI()) {
			logArea = new JTextArea();
			logArea.setEditable(false);
			logArea.setLineWrap(true);
			logArea.setWrapStyleWord(true);
			logArea.setFont(new java.awt.Font("MS Gothic", java.awt.Font.PLAIN, 12));
			JScrollPane scrollPane = new JScrollPane(logArea);
			NLMain.addTab("MediaInfo", null, scrollPane, "MediaInfoログ");
		}
	}
	
	public String getVersionString() {
		return VER_STRING;
	}
	
	// Processor Interface
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
		Matcher m = PROCESSOR_SUPPORTED_PATTERN.matcher(requestHeader.getURI());
		if (m.find()) {
			String altid = m.group(1);
			VideoDescriptor video = Cache.getPreferredCachedVideo(altid);
			if (video != null) {
				File cacheFile = new Cache(video).getCacheFile();
				String html = getMediaInfoJSON(cacheFile);
				if (html != null) {
					StringResource r = new StringResource(html);
					r.addResponseHeader(HttpHeader.CONTENT_TYPE, "application/json");
					r.addNoCacheResponseHeaders();
					return r;
				}
			}
		}
		return StringResource.getNotFound();
	}
	
	private String getMediaInfoJSON(File cacheFile) {
		if (cacheFile == null || !cacheFile.exists()) {
			logError("MediaInfo input not found: "
					+ (cacheFile == null ? "null" : cacheFile.getPath()));
			return null;
		}

		File mediaInfoInput = cacheFile;
		File temporaryMediaFile = null;
		try {
			File playlist = resolveHlsPlaylist(cacheFile);
			if (playlist != null) {
				temporaryMediaFile = File.createTempFile("nlMediaInfo-", ".mp4");
				if (!convertHlsToMp4(playlist, temporaryMediaFile)) {
					return null;
				}
				mediaInfoInput = temporaryMediaFile;
			} else if (cacheFile.isDirectory()) {
				logError("HLS playlist not found in cache: " + cacheFile.getPath());
				return null;
			}

			return executeMediaInfo(mediaInfoInput, cacheFile);
		} catch (IOException e) {
			logError("Failed to prepare MediaInfo input: " + e.getMessage());
		} finally {
			if (temporaryMediaFile != null && temporaryMediaFile.exists()
					&& !temporaryMediaFile.delete()) {
				logError("Failed to delete temporary MediaInfo input: "
						+ temporaryMediaFile.getPath());
			}
		}
		return null;
	}

	/**
	 * Resolve a cache file or directory to an HLS playlist. The playlist is only
	 * used as FFmpeg input; MediaInfo receives the remuxed media file instead.
	 */
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

		// Older HLS caches can contain exactly one media playlist without a
		// master playlist. Do not guess when both audio.m3u8 and video.m3u8 exist.
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

	private boolean convertHlsToMp4(File playlist, File output) {
		try {
			CommandResult result = runCommand(buildFfmpegCommand(playlist, output, true));
			if (result.exitCode != 0 && isUnsupportedExtensionPicky(result)) {
				if (output.exists() && !output.delete()) {
					logError("Failed to remove incomplete FFmpeg output: "
							+ output.getPath());
				}
				result = runCommand(buildFfmpegCommand(playlist, output, false));
			}
			if (result.exitCode != 0) {
				logError("FFmpeg failed with exit code " + result.exitCode + ": "
						+ summarizeProcessError(result));
				return false;
			}
			if (!output.isFile() || output.length() == 0) {
				logError("FFmpeg produced an empty media file: " + output.getPath());
				return false;
			}
			return true;
		} catch (IOException e) {
			logError("FFmpeg could not be started. Install it or add 'ffmpeg' to PATH: "
					+ e.getMessage());
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			logError("FFmpeg execution interrupted: " + e.getMessage());
		}
		return false;
	}

	static List<String> buildFfmpegCommand(
			File playlist, File output, boolean extensionPickyOption) {
		List<String> command = new ArrayList<String>();
		command.add(FFMPEG_COMMAND);
		command.add("-hide_banner");
		command.add("-nostdin");
		command.add("-xerror");
		command.add("-loglevel");
		command.add("error");
		command.add("-allowed_extensions");
		command.add(FFMPEG_ALLOWED_EXTENSIONS);
		command.add("-protocol_whitelist");
		command.add(FFMPEG_PROTOCOL_WHITELIST);
		if (extensionPickyOption) {
			command.add("-extension_picky");
			command.add("0");
		}
		command.add("-i");
		command.add(playlist.getAbsolutePath());
		command.add("-map");
		command.add("0:v:0");
		command.add("-map");
		command.add("0:a:0?");
		command.add("-c");
		command.add("copy");
		command.add("-movflags");
		command.add("+faststart");
		command.add("-f");
		command.add("mp4");
		command.add("-y");
		command.add(output.getAbsolutePath());
		return command;
	}

	static boolean isUnsupportedExtensionPicky(CommandResult result) {
		if (result == null) {
			return false;
		}
		String output = (result.stderr + "\n" + result.stdout).toLowerCase(Locale.ROOT);
		if (!output.contains("extension_picky")) {
			return false;
		}
		return output.contains("not found")
				|| output.contains("unrecognized")
				|| output.contains("unknown option")
				|| output.contains("option not found");
	}

	private String executeMediaInfo(File mediaInfoInput, File originalInput) {
		List<String> command = Arrays.asList(
				"mediainfo", "--Output=JSON", mediaInfoInput.getAbsolutePath());
		try {
			CommandResult result = runCommand(command);
			if (result.exitCode != 0 || result.stdout.trim().isEmpty()) {
				logError("MediaInfo failed with exit code " + result.exitCode + ": "
						+ summarizeProcessError(result));
				return null;
			}

			String normalizedResult = replaceMediaInfoReference(
					result.stdout, mediaInfoInput, originalInput);
			logMediaInfoResult(originalInput, mediaInfoInput, normalizedResult);
			return normalizedResult;
		} catch (IOException e) {
			logError("MediaInfo could not be started: " + e.getMessage());
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			logError("MediaInfo execution interrupted: " + e.getMessage());
		}
		return null;
	}

	private static String replaceMediaInfoReference(
			String json, File analysisInput, File originalInput) {
		if (analysisInput.equals(originalInput)) {
			return json;
		}
		String analysisReference = escapeJson(analysisInput.getAbsolutePath());
		String originalReference = escapeJson(originalInput.getAbsolutePath());
		String target = "\"@ref\":\"" + analysisReference + "\"";
		String replacement = "\"@ref\":\"" + originalReference + "\"";
		return json.replace(target, replacement);
	}

	private static String escapeJson(String value) {
		StringBuilder escaped = new StringBuilder(value.length() + 16);
		for (int index = 0; index < value.length(); index++) {
			char character = value.charAt(index);
			switch (character) {
			case '\\':
				escaped.append("\\\\");
				break;
			case '"':
				escaped.append("\\\"");
				break;
			case '\b':
				escaped.append("\\b");
				break;
			case '\f':
				escaped.append("\\f");
				break;
			case '\n':
				escaped.append("\\n");
				break;
			case '\r':
				escaped.append("\\r");
				break;
			case '\t':
				escaped.append("\\t");
				break;
			default:
				if (character < 0x20) {
					escaped.append(String.format("\\u%04x", (int) character));
				} else {
					escaped.append(character);
				}
			}
		}
		return escaped.toString();
	}

	private static CommandResult runCommand(List<String> command)
			throws IOException, InterruptedException {
		Process process = new ProcessBuilder(command)
				.redirectErrorStream(false)
				.start();
		StreamCollector stdout = new StreamCollector(process.getInputStream(), 0);
		StreamCollector stderr = new StreamCollector(
				process.getErrorStream(), MAX_PROCESS_ERROR_LENGTH);
		Thread stdoutThread = new Thread(stdout, "nlMediaInfo-stdout");
		Thread stderrThread = new Thread(stderr, "nlMediaInfo-stderr");
		stdoutThread.setDaemon(true);
		stderrThread.setDaemon(true);
		stdoutThread.start();
		stderrThread.start();
		try {
			int exitCode = process.waitFor();
			stdoutThread.join();
			stderrThread.join();
			if (stdout.error != null) {
				throw stdout.error;
			}
			if (stderr.error != null) {
				throw stderr.error;
			}
			return new CommandResult(exitCode, stdout.content.toString(),
					stderr.content.toString());
		} finally {
			if (process.isAlive()) {
				process.destroy();
			}
		}
	}

	private static String summarizeProcessError(CommandResult result) {
		String message = result.stderr.trim();
		if (message.isEmpty()) {
			message = result.stdout.trim();
		}
		return message.length() > 2000 ? message.substring(0, 2000) + "..." : message;
	}

	static final class CommandResult {
		private final int exitCode;
		private final String stdout;
		private final String stderr;

		private CommandResult(int exitCode, String stdout, String stderr) {
			this.exitCode = exitCode;
			this.stdout = stdout;
			this.stderr = stderr;
		}
	}

	private static final class StreamCollector implements Runnable {
		private final InputStream input;
		private final int maxLength;
		private final StringBuilder content = new StringBuilder();
		private IOException error;

		private StreamCollector(InputStream input, int maxLength) {
			this.input = input;
			this.maxLength = maxLength;
		}

		public void run() {
			try {
				InputStreamReader reader = new InputStreamReader(input, "UTF-8");
				try {
					char[] buffer = new char[1024];
					for (int length; (length = reader.read(buffer)) != -1; ) {
						if (maxLength == 0 || content.length() < maxLength) {
							int remaining = maxLength == 0
									? length
									: Math.min(length, maxLength - content.length());
							content.append(buffer, 0, remaining);
						}
					}
				} finally {
					reader.close();
				}
			} catch (IOException e) {
				error = e;
			}
		}
	}

	private void logMediaInfoResult(File originalInput, File analysisInput, String result) {
		if (logArea == null) {
			return;
		}
		final String formattedMessage = String.format(
				"[%s] MediaInfo result for %s (analysis input: %s):\n%s\n"
						+ "----------------------------------------\n",
				new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
				originalInput.getPath(),
				analysisInput.getPath(),
				result);
		javax.swing.SwingUtilities.invokeLater(() -> {
			if (logArea.getText().length() > MAX_LOG_LENGTH) {
				logArea.setText(logArea.getText()
						.substring(logArea.getText().length() - MAX_LOG_LENGTH / 2));
			}
			logArea.append(formattedMessage);
			logArea.setCaretPosition(logArea.getDocument().getLength());
		});
	}
	
	private void logError(String message) {
		Logger.warning(LOG_PREFIX + ": " + message);
		if (logArea != null) {
			final String errorMessage = String.format(
				"[%s] ERROR: %s\n" +
				"----------------------------------------\n",
				new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
				message
			);
			
			javax.swing.SwingUtilities.invokeLater(() -> {
				logArea.append(errorMessage);
				logArea.setCaretPosition(logArea.getDocument().getLength());
			});
		}
	}
	
}
