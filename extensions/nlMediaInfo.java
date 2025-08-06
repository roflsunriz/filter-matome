package extensions;

import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;
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

/**
 * MediaInfo‚ðŒÄ‚Ño‚·‚¾‚¯
 */
public class nlMediaInfo implements Extension2, Processor {
	
	public static final int REVISION = 170202;
	public static final String VER_STRING = "nlMediaInfo_"+REVISION;
	public static final String LOG_PREFIX = "MediaInfo";
	public static final String PROP_DEBUG = "MediaInfoDebug";
	
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
			NLMain.addTab("MediaInfo", null, scrollPane, "MediaInfoo—Í");
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
			File cacheFile = new Cache(video).getCacheFile();
			if (cacheFile != null) {
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
		String[] cmdarray = { "mediainfo", "--Output=JSON", cacheFile.getPath() };
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
					cacheFile.getName(),
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
