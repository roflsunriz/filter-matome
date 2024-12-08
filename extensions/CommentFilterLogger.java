package extensions;

import dareka.NLMain;
import dareka.common.Logger;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Resource;
import dareka.processor.StringResource;
import dareka.processor.Processor;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.Socket;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import javax.swing.JTextArea;
import javax.swing.JScrollPane;

public class CommentFilterLogger implements Extension2, Processor {
    
    public static final int REVISION = 240320;
    public static final String VER_STRING = "CommentFilterLogger_" + REVISION;
    
    private static final String[] PROCESSOR_SUPPORTED_METHODS = { "POST" };
    private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
            "^https?://www\\.nicovideo\\.jp/cache/filter_log");
    
    private static JTextArea logArea;
    
    private static final int BUFFER_SIZE = 8192;
    private static final int MAX_LOG_LENGTH = 100000;

    // JSON�p�[�X�p�̐��K�\���p�^�[�����X�V
    private static final Pattern JSON_PATTERN = Pattern.compile(
        "\"(title|userId|comment|reason|videoId)\"\\s*:\\s*\"([^\"]*)\"|" +
        "\"filterDetails\"\\s*:\\s*\\{\\s*\"type\"\\s*:\\s*\"([^\"]*)\",\\s*\"value\"\\s*:\\s*\"([^\"]*)\"\\s*\\}"
    );
    
    private static final int MAX_FILTER_VALUE_LENGTH = 50;  // �t�B���^�[�\���̍ő咷

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
            NLMain.addTab("CommentFilter", null, scrollPane, "�t�B���^�[���O");
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
        InputStream in = browser.getInputStream();
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(in, "UTF-8"),
            BUFFER_SIZE
        );
        
        long contentLength = requestHeader.getContentLength();
        if (contentLength <= 0 || contentLength > BUFFER_SIZE) {
            return StringResource.getNotFound();
        }
        
        char[] buffer = new char[(int)contentLength];
        int bytesRead = reader.read(buffer, 0, (int)contentLength);
        
        if (bytesRead > 0) {
            final String rawMessage = new String(buffer, 0, bytesRead);
            
            try {
                // ���K�\����JSON�����
                Matcher matcher = JSON_PATTERN.matcher(rawMessage);
                String title = "�s��";
                String userId = "�s��";
                String comment = "�s��";
                String reason = "�s��";
                String videoId = "�s��";
                String filterType = "";
                String filterValue = "";
                
                while (matcher.find()) {
                    if (matcher.group(1) != null) {
                        // �ʏ�̃t�B�[���h
                        String key = matcher.group(1);
                        String value = matcher.group(2);
                        
                        switch (key) {
                            case "title":
                                title = value;
                                break;
                            case "userId":
                                userId = value;
                                break;
                            case "comment":
                                comment = value;
                                break;
                            case "reason":
                                reason = value;
                                break;
                            case "videoId":
                                videoId = value;
                                break;
                        }
                    } else {
                        // filterDetails�̏ꍇ
                        filterType = matcher.group(3);
                        String value = matcher.group(4);
                        // �t�B���^�[�\������������ꍇ�͐؂�l�߂�
                        filterValue = value.length() > MAX_FILTER_VALUE_LENGTH 
                            ? value.substring(0, MAX_FILTER_VALUE_LENGTH) + "..." 
                            : value;
                    }
                }
                
                final String formattedMessage = String.format(
                    "[%s]\n" +
                    "����: %s\n" +
                    "����ID: %s\n" +
                    "���[�U�[: %s\n" +
                    "�R�����g: %s\n" +
                    "���R: %s\n" +
                    "�t�B���^�[: %s (%s)\n" +
                    "----------------------------------------\n",
                    new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
                    title,
                    videoId,
                    userId,
                    comment,
                    reason,
                    filterType,
                    filterValue
                );
                
                if (logArea != null) {
                    javax.swing.SwingUtilities.invokeLater(() -> {
                        if (logArea.getText().length() > MAX_LOG_LENGTH) {
                            logArea.setText(logArea.getText()
                                .substring(logArea.getText().length() - MAX_LOG_LENGTH/2));
                        }
                        logArea.append(formattedMessage);
                        logArea.setCaretPosition(logArea.getDocument().getLength());
                    });
                }
                
                return new StringResource("ok");
            } catch (Exception e) {
                System.err.println("?t?B???^?[???O???p?[?X?????s: " + e.getMessage());
                return StringResource.getNotFound();
            }
        }
        
        return StringResource.getNotFound();
    }
} 