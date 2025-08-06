package extensions;

import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.List;
import java.util.ArrayList;
import java.io.BufferedReader;
import javax.swing.JFileChooser;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.nio.file.Files;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;

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
import java.nio.file.Files;

public class downloadThruFFmpeg implements Extension2, Processor {
    
    public static final int REVISION = 240701;
    public static final String VER_STRING = "downloadThruFFmpeg_"+REVISION;
    private static final String[] PROCESSOR_SUPPORTED_METHODS = { "GET" };
    private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
        "^https?://www\\.nicovideo\\.jp/cache/ffmpeg\\?(video|audio)=([a-z]{2}\\d{1,11})");
    
    private static final File CACHE_DIR = new File("C:\\NicoCache_nl");

    private static JTextArea logArea;
    private static final int MAX_LOG_LENGTH = 100000;
    
    public void registerExtensions(ExtensionManager mgr) {
        mgr.registerProcessor(this);

        if (logArea == null && NLMain.isLaunchGUI()) {
            logArea = new JTextArea();
            logArea.setEditable(false);
            logArea.setLineWrap(true);
            logArea.setWrapStyleWord(true);
            logArea.setFont(new java.awt.Font("MS Gothic", java.awt.Font.PLAIN, 12));
            JScrollPane scrollPane = new JScrollPane(logArea);
            NLMain.addTab("downloadThruFFmpeg", null, scrollPane, "FFmpeg");
        }
    }

    public String getVersionString() {
        return VER_STRING;
    }

    public String[] getSupportedMethods() {
        return PROCESSOR_SUPPORTED_METHODS;
    }

    public Pattern getSupportedURLAsPattern() {
        return PROCESSOR_SUPPORTED_PATTERN;
    }

    public String getSupportedURLAsString() {
        return null;
    }

    public Resource onRequest(HttpRequestHeader requestHeader, Socket browser) throws IOException {
        Matcher m = PROCESSOR_SUPPORTED_PATTERN.matcher(requestHeader.getURI());
        if (m.find()) {
            String type = m.group(1);
            String altid = m.group(2);
            VideoDescriptor video = Cache.getPreferredCachedVideo(altid);
            File hlsFile = new Cache(video).getCacheFile();
            
            // 元ファイル名を取得
            String originalName = hlsFile.getName();
            // 拡張子と.hlsを除去
            String baseName = originalName.replaceFirst("\\.hls$", "").replaceFirst("\\.[^.]+$", "");
            
            // 日時情報を追加
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
            String defaultName = String.format("%s_%s.%s", 
                baseName,
                timestamp,
                type.equals("video") ? "mp4" : "aac"
            );
            
            // 保存ダイアログ表示
            JFileChooser chooser = new JFileChooser(CACHE_DIR);
            chooser.setSelectedFile(new File(defaultName));
            chooser.setDialogTitle("変換ファイルの保存場所を選択");
            
            // 親フレームを取得（NLMainのフレームを使用）
            java.awt.Frame parentFrame = java.awt.Frame.getFrames()[0];
            
            int result = chooser.showSaveDialog(parentFrame);
            if (result != JFileChooser.APPROVE_OPTION) {
                logError("保存がキャンセルされたのじゃ！");
                throw new IOException("ユーザーが保存をキャンセルしたのじゃ");
            }
            
            File outputFile = chooser.getSelectedFile();
            
            if (outputFile == null) {
                logError("出力ファイルが選択されていないのじゃ！");
                return StringResource.getNotFound();
            }
            
            if (!outputFile.exists()) {
                boolean success = convertWithFFmpeg(hlsFile, outputFile, type);
                if (!success) return StringResource.getNotFound();
            }
            
            if (outputFile.exists()) {
                StringResource r = new StringResource(new byte[0]);
                r.addResponseHeader("Content-Length", "0");
                r.addResponseHeader("X-File-Path", outputFile.getAbsolutePath());
                r.addResponseHeader(HttpHeader.CONTENT_TYPE, "text/plain");
                r.addNoCacheResponseHeaders();
                return r;
            }
        }
        return StringResource.getNotFound();
    }

    private boolean convertWithFFmpeg(File input, File output, String type) {
        List<String> cmdList = new ArrayList<>();
        cmdList.add("ffmpeg");
        
        boolean isHLS = input.isDirectory() && new File(input, "master.m3u8").exists();
        File playlistPath = null;

        if (isHLS) {
            // HLSフォルダ処理
            if (new File(input, "audio.m3u8").exists()) {
                // 新形式HLS (video.m3u8 + audio.m3u8)
                cmdList.add("-protocol_whitelist");
                cmdList.add("file,http,https,tcp,tls,crypto,data");
                cmdList.add("-allowed_extensions");
                cmdList.add("ALL");
                cmdList.add("-i");
                cmdList.add(new File(input, "video.m3u8").getPath());
                
                cmdList.add("-protocol_whitelist");
                cmdList.add("file,http,https,tcp,tls,crypto,data");
                cmdList.add("-allowed_extensions");
                cmdList.add("ALL");
                cmdList.add("-i");
                cmdList.add(new File(input, "audio.m3u8").getPath());
                
            } else {
                // 旧形式HLS (playlist.m3u8を検索)
                playlistPath = findPlaylistM3u8(input);
                if (playlistPath == null) {
                    logError("HLSフォーマットが不正なのじゃ！ playlist.m3u8が見つからないのじゃ");
                    return false;
                }
                cmdList.add("-protocol_whitelist");
                cmdList.add("file,http,https,tcp,tls,crypto,data");
                cmdList.add("-allowed_extensions");
                cmdList.add("ALL");
                cmdList.add("-i");
                cmdList.add(playlistPath.getPath());
            }
        } else {
            // 通常ファイル処理
            cmdList.add("-i");
            cmdList.add(input.getPath());
        }

        // コーデック設定
        if (type.equals("video")) {
            cmdList.add("-c:v");
            cmdList.add("libx264");
            cmdList.add("-preset");
            cmdList.add("slower");
            cmdList.add("-crf");
            cmdList.add("23");
            cmdList.add("-profile:v");
            cmdList.add("high");
            cmdList.add("-tune");
            cmdList.add("animation");
            cmdList.add("-vf");
            cmdList.add("format=pix_fmts=yuv420p");
        } else {
            cmdList.add("-vn");
        }

        // 音声設定（共通）
        cmdList.add("-c:a");
        cmdList.add("aac");
        cmdList.add("-profile:a");
        cmdList.add("aac_low");
        cmdList.add("-b:a");
        cmdList.add("192k");
        cmdList.add("-ar");
        cmdList.add("48000");
        cmdList.add("-ac");
        cmdList.add("2");

        // 共通オプション
        cmdList.add("-movflags");
        cmdList.add("faststart");
        cmdList.add("-fps_mode");
        cmdList.add("cfr");
        cmdList.add("-y");
        cmdList.add(output.getPath());

        String[] cmdarray = cmdList.toArray(new String[0]);
        
        Process proc = null;
        try {
            proc = Runtime.getRuntime().exec(cmdarray);
            
            // ログ収集用スレッド起動
            startLogCollector(proc.getInputStream(), "INFO");
            startLogCollector(proc.getErrorStream(), "ERROR");

            int exitCode = proc.waitFor();
            return exitCode == 0;
        } catch (IOException | InterruptedException e) {
            logError("FFmpeg実行エラー: " + e.getMessage());
            if (proc != null) {
                proc.destroyForcibly();
            }
            return false;
        } finally {
            if (proc != null) {
                CloseUtil.close(proc.getOutputStream());
                CloseUtil.close(proc.getErrorStream());
                CloseUtil.close(proc.getInputStream());
                proc.destroy();
            }
        }
    }
    
    private File findPlaylistM3u8(File dir) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    File found = findPlaylistM3u8(file);
                    if (found != null) return found;
                } else if (file.getName().equals("playlist.m3u8")) {
                    return file;
                }
            }
        }
        return null;
    }
    
    private void logError(String message) {
        if (logArea != null) {
            final String errorMessage = String.format(
                "[%s] ERROR: %s\n----------------------------------------\n",
                new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
                message
            );
            
            javax.swing.SwingUtilities.invokeLater(() -> {
                logArea.append(errorMessage);
                logArea.setCaretPosition(logArea.getDocument().getLength());
            });
        }
    }

    private void startLogCollector(InputStream stream, String level) {
        new Thread(() -> {
            try {
                // Shift_JISで読み込み→UTF-8に変換
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, "UTF-8")
                );
                
                char[] buffer = new char[1024];
                int readCount;
                while ((readCount = reader.read(buffer)) != -1) {
                    String chunk = new String(buffer, 0, readCount);
                    appendLog(String.format("[FFmpeg %s] %s", level, chunk));
                }
            } catch (UnsupportedEncodingException e) {
                logError("UTF-8エンコーディングがサポートされていません: " + e.getMessage());
            } catch (IOException e) {
                logError("ログ収集エラー: " + e.getMessage());
            }
        }).start();
    }

    private void appendLog(String message) {
        if (logArea != null) {
            javax.swing.SwingUtilities.invokeLater(() -> {
                logArea.append(message);
                logArea.setCaretPosition(logArea.getDocument().getLength());
            });
        }
    }
} 