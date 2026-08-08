package extensions;

import java.io.File;
import java.io.IOException;
import java.net.Socket;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

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

public class CustomCacheReturner implements Extension2, Processor {
    
    public static final int REVISION = 241214;
    public static final String VER_STRING = "CustomCacheReturner_" + REVISION;
    public static final String LOG_PREFIX = "CacheReturn";
    public static final String PROP_DEBUG = "CacheReturnDebug";
    
    private static final String[] PROCESSOR_SUPPORTED_METHODS = { "GET" };
    private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
            "^https?://www\\.nicovideo\\.jp/cache/find_cache\\?([a-z]{2}\\d+)");
    
    private volatile LoggerHandler extensionLogger;

    private void logging(String format, Object... args) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.info(format, args);
        } else {
            Logger.info(LOG_PREFIX, format, args);
        }
    }

    @Override
    public void registerExtensions(ExtensionManager mgr) {
        mgr.registerProcessor(this);

        if (extensionLogger == null) {
            extensionLogger = NLMain.getExtLogger(
                    this, LOG_PREFIX, PROP_DEBUG, false);
        }
    }
    
    @Override
    public String getVersionString() {
        return VER_STRING;
    }
    
    // Processor Interface
    @Override
    public String[] getSupportedMethods() {
        return PROCESSOR_SUPPORTED_METHODS;
    }
    
    @Override
    public Pattern getSupportedURLAsPattern() {
        return PROCESSOR_SUPPORTED_PATTERN;
    }
    
    @Override
    public String getSupportedURLAsString() {
        return null;
    }
    
    private String escapeFileName(String fileName) {
        try {
            // URLエンコードを行う
            String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8.toString());
            // JSON文字列用にエスケープ
            return encoded.replace("\"", "\\\"");
        } catch (Exception e) {
            logging("Error encoding filename: %s", fileName);
            return fileName;
        }
    }
    
    @Override
    public Resource onRequest(HttpRequestHeader requestHeader, Socket browser)
            throws IOException {
        Matcher m = PROCESSOR_SUPPORTED_PATTERN.matcher(requestHeader.getURI());
        if (m.find()) {
            String videoId = m.group(1);
            File cacheDir = new File("local/cache");
            File[] matchingFiles = cacheDir.listFiles((dir, name) -> 
                name.contains(videoId) && (name.endsWith(".hls") || name.endsWith(".mp4"))
            );

            StringBuilder resultJson = new StringBuilder();
            resultJson.append("{\"paths\":[");
            
            if (matchingFiles != null && matchingFiles.length > 0) {
                for (int i = 0; i < matchingFiles.length; i++) {
                    if (i > 0) resultJson.append(",");
                    // ファイル名をエスケープして追加
                    resultJson.append("\"").append(escapeFileName(matchingFiles[i].getName())).append("\"");
                }
            }
            
            resultJson.append("]}");
            String result = resultJson.toString();

            // ログに記録
            final String formattedMessage = String.format(
                "[%s] キャッシュ検索結果 for %s:\n%s\n" +
                "----------------------------------------\n",
                new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
                videoId,
                result
            );
            
            logging("%s", formattedMessage.trim());

            StringResource r = new StringResource(result);
            r.addResponseHeader(HttpHeader.CONTENT_TYPE, "application/json");
            r.addNoCacheResponseHeaders();
            return r;
        }
        return StringResource.getNotFound();
    }
}
