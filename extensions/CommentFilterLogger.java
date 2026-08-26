package extensions;

import dareka.NLMain;
import dareka.common.LoggerHandler;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Resource;
import dareka.processor.StringResource;
import dareka.processor.Processor;
import dareka.common.json.Json;
import dareka.common.json.JsonArray;
import dareka.common.json.JsonObject;
import dareka.common.json.JsonValue;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.Socket;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class CommentFilterLogger implements Extension2, Processor {
    
    public static final int REVISION = 26081801;
    public static final String VER_STRING = "CommentFilterLogger_" + REVISION;
    
    private static final String[] PROCESSOR_SUPPORTED_METHODS = { "POST" };
    private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
            "^https?://nicocachenl\\.test/api/v1/extensions/filter-matome/comment-filter/logs$");
    
    private volatile LoggerHandler extensionLogger;
    
    private static final int BUFFER_SIZE = 1024 * 1024;  // 1MB
    private static final int MAX_FILTER_VALUE_LENGTH = 50;  // フィルター表現の最大長

    // Extension2 interface
    public void registerExtensions(ExtensionManager mgr) {
        mgr.registerProcessor(this);
        if (extensionLogger == null) {
            extensionLogger = NLMain.getExtLogger(
                    this, "CommentFilter", null, true);
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

    // エラー時のデバッグ情報を専用ログへ追加するヘルパーメソッド
    private void appendErrorLog(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.warning(message);
        }
    }

    private void appendInfoLog(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.info(message);
        }
    }
    
    private boolean isValidJson(String json) {
        if (!json.startsWith("[") || !json.endsWith("]")) {
            return false;
        }
        
        int bracketCount = 0;
        int squareBracketCount = 0;
        boolean inString = false;
        boolean escaped = false;
        
        for (char c : json.toCharArray()) {
            if (escaped) {
                escaped = false;
                continue;
            }
            
            switch (c) {
                case '\\':
                    escaped = true;
                    break;
                case '"':
                    if (!escaped) {
                        inString = !inString;
                    }
                    break;
                case '{':
                    if (!inString) bracketCount++;
                    break;
                case '}':
                    if (!inString) bracketCount--;
                    break;
                case '[':
                    if (!inString) squareBracketCount++;
                    break;
                case ']':
                    if (!inString) squareBracketCount--;
                    break;
            }
            
            if (bracketCount < 0 || squareBracketCount < 0) {
                return false;
            }
        }
        
        return bracketCount == 0 && squareBracketCount == 0;
    }
    
    public Resource onRequest(HttpRequestHeader requestHeader, Socket browser) 
            throws IOException {
        InputStream in = browser.getInputStream();
        long contentLength = requestHeader.getContentLength();
        
        if (contentLength <= 0) {
            appendErrorLog("Content-Lengthが0以下です: " + contentLength);
            return StringResource.getBadRequest();
        }
        
        // バッファサイズのチェック
        if (contentLength > BUFFER_SIZE * 2) {
            appendErrorLog("要求されたContent-Lengthが大きすぎます: " + contentLength + " > " + (BUFFER_SIZE * 2));
            return StringResource.getBadRequest();
        }
        
        // バイトデータとして直接読み込む
        byte[] buffer = new byte[(int)contentLength];
        int totalBytesRead = 0;
        int bytesRead;
        
        // 全データを読み込む（最大3回まで試行）
        int retryCount = 0;
        while (totalBytesRead < contentLength && retryCount < 3) {
            bytesRead = in.read(buffer, totalBytesRead, (int)contentLength - totalBytesRead);
            if (bytesRead == -1) break;
            totalBytesRead += bytesRead;
            retryCount++;
            
            // 1回目で全データを読み込めた場合は即座に終了
            if (totalBytesRead == contentLength) break;
        }
        
        if (totalBytesRead != contentLength) {
            appendErrorLog("データの読み込みが完了しませんでした: " + totalBytesRead + "/" + contentLength);
            return StringResource.getBadRequest();
        }
        
        // UTF-8でデコード（1回だけ文字列変換）
        String jsonData = new String(buffer, 0, totalBytesRead, "UTF-8").trim();
        
        if (jsonData.isEmpty()) {
            appendErrorLog("受信したJSONデータが空です");
            return StringResource.getBadRequest();
        }

        // JSONの妥当性チェック（最小限のチェックのみ）
        if (!jsonData.startsWith("[") || !jsonData.endsWith("]")) {
            appendErrorLog("無効なJSON形式です（配列の開始/終了が不正）");
            return StringResource.getBadRequest();
        }

        try {
            // JSONArrayとして解析
            JsonValue parsedValue = Json.parse(jsonData);
            if (parsedValue == null) {
                appendErrorLog("JSONの解析に失敗しました");
                return StringResource.getBadRequest();
            }

            JsonArray logsArray = parsedValue.getArray();
            if (logsArray == null) {
                appendErrorLog("JSONArrayの取得に失敗しました");
                return StringResource.getBadRequest();
            }
            
            // 全てのログメッセージを一度に結合
            StringBuilder allMessages = new StringBuilder();
            
            // 各ログエントリーを処理
            for (int i = 0; i < logsArray.size(); i++) {
                JsonObject log = logsArray.get(i).getObject();
                
                // 各フィールドを取得（nullの場合はデフォルト値を使用）
                String title = getStringOrDefault(log, "title", "不明");
                String userId = getStringOrDefault(log, "userId", "不明");
                String comment = getStringOrDefault(log, "comment", "不明");
                String videoId = getStringOrDefault(log, "videoId", "不明");
                
                // reasons配列の処理
                StringBuilder reasonsInfo = new StringBuilder();
                JsonValue reasonsValue = log.get("reasons");
                if (reasonsValue != null && !reasonsValue.isNull()) {
                    JsonArray reasons = reasonsValue.getArray();
                    for (int j = 0; j < reasons.size(); j++) {
                        if (j > 0) reasonsInfo.append(", ");
                        reasonsInfo.append(reasons.get(j).getString());
                    }
                }
                
                // フィルター詳細の処理
                StringBuilder filterInfo = new StringBuilder();
                JsonValue filterDetailsValue = log.get("filterDetails");
                
                if (filterDetailsValue != null && !filterDetailsValue.isNull()) {
                    JsonArray filterDetails = filterDetailsValue.getArray();
                    
                    for (int j = 0; j < filterDetails.size(); j++) {
                        JsonObject detail = filterDetails.get(j).getObject();
                        
                        String type = getStringOrDefault(detail, "type", "不明");
                        JsonValue valueValue = detail.get("value");
                        String value = valueValue != null && !valueValue.isNull() ? valueValue.getString() : null;
                        
                        if (j > 0) filterInfo.append(", ");
                        filterInfo.append(type);
                        if (value != null) {
                            filterInfo.append("(").append(value).append(")");
                        }
                    }
                }
                
                allMessages.append(String.format(
                    "[%s]\n" +
                    "動画: %s\n" +
                    "動画ID: %s\n" +
                    "ユーザー: %s\n" +
                    "コメント: %s\n" +
                    "理由: %s\n" +
                    "フィルター: %s\n" +
                    "----------------------------------------\n",
                    new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
                    title,
                    videoId,
                    userId,
                    comment,
                    reasonsInfo.toString(),
                    filterInfo.toString()
                ));
            }
            
            // 全てのログを一度に専用タブへ追加
            appendInfoLog(allMessages.toString().trim());
            
            return new StringResource("ok");
        } catch (Exception e) {
            appendErrorLog("フィルターログ処理エラー: " + e.getMessage());
            return StringResource.getBadRequest();
        }
    }
    
    // JsonObjectからの安全な文字列取得用のヘルパーメソッド
    private String getStringOrDefault(JsonObject obj, String key, String defaultValue) {
        JsonValue value = obj.get(key);
        if (value == null || value.isNull()) {
            return defaultValue;
        }
        try {
            return value.getString();
        } catch (Exception e) {
            return defaultValue;
        }
    }
}
