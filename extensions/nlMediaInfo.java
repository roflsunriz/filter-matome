package extensions;

import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.common.CloseUtil;
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
	public static final int REVISION = 260802;
	public static final String VER_STRING = "nlMediaInfo_"+REVISION;
	public static final String LOG_PREFIX = "MediaInfo";
	public static final String PROP_DEBUG = "MediaInfoDebug";
	private static final String MASTER_PLAYLIST_NAME = "master.m3u8";

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
		File mediaInfoInput = resolveMediaInfoInput(cacheFile);
		if (mediaInfoInput == null) {
			logError("MediaInfo input not found: "
					+ (cacheFile == null ? "null" : cacheFile.getPath()));
			return null;
		}

		String[] cmdarray = {
			"mediainfo", "--Output=JSON", mediaInfoInput.getPath()
		};
		Process proc = null;
		InputStreamReader in = null;
		try {
			proc = Runtime.getRuntime().exec(cmdarray);
			in = new InputStreamReader(proc.getInputStream(),"UTF-8");
			StringBuilder sb = new StringBuilder(1024 * 8);
			char[] cbuf = new char[1024];
			for (int n; (n = in.read(cbuf)) != -1; )
				sb.append(cbuf, 0, n);
			proc.waitFor();
			String result = sb.toString();
			
			if (logArea != null) {
				final String formattedMessage = String.format(
					"[%s] MediaInfo result for %s:\n%s\n" +
					"----------------------------------------\n",
					new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
					mediaInfoInput.getPath(),
					result
				);
				
				javax.swing.SwingUtilities.invokeLater(() -> {
					if (logArea.getText().length() > MAX_LOG_LENGTH) {
						logArea.setText(logArea.getText()
							.substring(logArea.getText().length() - MAX_LOG_LENGTH/2));
					}
					logArea.append(formattedMessage);
					logArea.setCaretPosition(logArea.getDocument().getLength());
				});
			}
			
			return result;
		} catch (IOException e) {
			logError("IO Error: " + e.getMessage());
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			logError("Execution interrupted: " + e.getMessage());
		} finally {
			if (proc != null) {
				CloseUtil.close(in);
				CloseUtil.close(proc.getOutputStream());
				CloseUtil.close(proc.getErrorStream());
				proc.destroy();
			}
		}
		return null;
	}

	/**
	 * Resolve a CMAF/Domand cache directory to its master playlist so that
	 * MediaInfo analyzes the complete HLS presentation instead of each segment.
	 * Legacy HLS directories without a master playlist keep the old fallback.
	 */
	private static File resolveMediaInfoInput(File cacheFile) {
		if (cacheFile == null || !cacheFile.exists()) {
			return null;
		}
		if (!cacheFile.isDirectory()) {
			return cacheFile;
		}

		File directMasterPlaylist = new File(cacheFile, MASTER_PLAYLIST_NAME);
		if (directMasterPlaylist.isFile()) {
			return directMasterPlaylist;
		}

		File nestedMasterPlaylist = resolveMasterPlaylist(cacheFile);
		return nestedMasterPlaylist == null ? cacheFile : nestedMasterPlaylist;
	}

	private static File resolveMasterPlaylist(File directory) {
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
			File nestedMasterPlaylist = resolveMasterPlaylist(child);
			if (nestedMasterPlaylist != null) {
				return nestedMasterPlaylist;
			}
		}
		return null;
	}
	
	private void logError(String message) {
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
