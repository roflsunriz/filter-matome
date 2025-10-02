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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class downloadThruFFmpeg implements Extension2, Processor {
    
    public static final int REVISION = 251002004;  // 2025/10/02 v004 - Remove -f hls, add compatibility options
    public static final String VER_STRING = "downloadThruFFmpeg_"+REVISION;
    private static final String[] PROCESSOR_SUPPORTED_METHODS = { "GET" };
    private static final Pattern PROCESSOR_SUPPORTED_PATTERN = Pattern.compile(
        "^https?://www\\.nicovideo\\.jp/cache/ffmpeg\\?(video|audio)=([a-z]{2}\\d{1,11})");
    
    private static final File CACHE_DIR = new File("C:\\NicoCache_nl");

    private static JTextArea logArea;
    private static final int MAX_LOG_LENGTH = 100000;
    
    // 処理中のリクエストを管理するセット
    private static final Set<String> processingRequests = ConcurrentHashMap.newKeySet();
    
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
            
            // リクエストの一意識別子を作成
            String requestKey = String.format("%s_%s", type, altid);
            
            // 既に処理中の場合は即座にレスポンスを返す
            if (!processingRequests.add(requestKey)) {
                logInfo("既に処理中のリクエストです: " + requestKey);
                StringResource r = new StringResource("Processing in progress".getBytes());
                r.addResponseHeader("Content-Type", "text/plain");
                r.addResponseHeader("X-Status", "Already Processing");
                r.addNoCacheResponseHeaders();
                return r;
            }
            
            try {
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
                    logError("保存がキャンセルされました");
                    StringResource r = new StringResource("Cancelled".getBytes());
                    r.addResponseHeader("Content-Type", "text/plain");
                    r.addResponseHeader("X-Status", "Cancelled");
                    r.addNoCacheResponseHeaders();
                    return r;
                }
                
                File outputFile = chooser.getSelectedFile();
                
                if (outputFile == null) {
                    logError("出力ファイルが選択されていません");
                    return StringResource.getNotFound();
                }
                
                if (!outputFile.exists()) {
                    // 変換処理を別スレッドで実行
                    Thread converterThread = new Thread(() -> {
                        try {
                            logInfo("変換処理を開始: " + outputFile.getName());
                            boolean success = convertWithFFmpeg(hlsFile, outputFile, type);
                            if (success) {
                                logInfo("変換完了: " + outputFile.getAbsolutePath());
                            } else {
                                logError("変換失敗: " + outputFile.getName());
                            }
                        } finally {
                            // 処理完了後にセットから削除
                            processingRequests.remove(requestKey);
                        }
                    });
                    converterThread.start();
                    
                    // 即座にレスポンスを返す
                    StringResource r = new StringResource("Processing started".getBytes());
                    r.addResponseHeader("Content-Type", "text/plain");
                    r.addResponseHeader("X-File-Path", outputFile.getAbsolutePath());
                    r.addResponseHeader("X-Status", "Processing");
                    r.addNoCacheResponseHeaders();
                    return r;
                }
                
                // ファイルが既に存在する場合
                if (outputFile.exists()) {
                    StringResource r = new StringResource(new byte[0]);
                    r.addResponseHeader("Content-Length", "0");
                    r.addResponseHeader("X-File-Path", outputFile.getAbsolutePath());
                    r.addResponseHeader(HttpHeader.CONTENT_TYPE, "text/plain");
                    r.addResponseHeader("X-Status", "Already Exists");
                    r.addNoCacheResponseHeaders();
                    return r;
                }
            } finally {
                // ファイルが既に存在する場合などの即座に処理が終わるケースで削除
                if (!Thread.currentThread().getName().contains("Thread-")) {
                    processingRequests.remove(requestKey);
                }
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
                
                // ビデオストリーム用
                cmdList.add("-protocol_whitelist");
                cmdList.add("file,http,https,tcp,tls,crypto,data");
                cmdList.add("-allowed_extensions");
                cmdList.add("ALL");
                cmdList.add("-i");
                cmdList.add(new File(input, "video.m3u8").getAbsolutePath());
                
                // オーディオストリーム用  
                cmdList.add("-protocol_whitelist");
                cmdList.add("file,http,https,tcp,tls,crypto,data");
                cmdList.add("-allowed_extensions");
                cmdList.add("ALL");
                cmdList.add("-i");
                cmdList.add(new File(input, "audio.m3u8").getAbsolutePath());
                
            } else {
                // 旧形式HLS (playlist.m3u8を検索)
                playlistPath = findPlaylistM3u8(input);
                if (playlistPath == null) {
                    logError("HLSフォーマットが不正です。playlist.m3u8が見つかりません");
                    return false;
                }
                cmdList.add("-protocol_whitelist");
                cmdList.add("file,http,https,tcp,tls,crypto,data");
                cmdList.add("-allowed_extensions");
                cmdList.add("ALL");
                cmdList.add("-i");
                cmdList.add(playlistPath.getAbsolutePath());
            }
        } else {
            // 通常ファイル処理
            cmdList.add("-i");
            cmdList.add(input.getAbsolutePath());
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
            cmdList.add("-movflags");
            cmdList.add("+faststart");
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

        // 互換性オプション（convert-any-to-h264.batから）
        cmdList.add("-strict");
        cmdList.add("experimental");
        cmdList.add("-fps_mode");
        cmdList.add("cfr");
        cmdList.add("-vsync");
        cmdList.add("1");
        cmdList.add("-async");
        cmdList.add("1");
        
        // 上書きフラグ
        cmdList.add("-y");
        cmdList.add(output.getAbsolutePath());

        // コマンドをログに出力（デバッグ用）
        logInfo("実行コマンド: " + String.join(" ", cmdList));
        
        Process proc = null;
        try {
            ProcessBuilder pb = new ProcessBuilder(cmdList);
            // 作業ディレクトリをキャッシュディレクトリに設定
            pb.directory(CACHE_DIR);
            // エラーストリームを標準出力にマージしない（個別に処理）
            pb.redirectErrorStream(false);
            
            proc = pb.start();
            
            // ログ収集用スレッド起動
            startLogCollector(proc.getInputStream(), "INFO");
            startLogCollector(proc.getErrorStream(), "ERROR");

            int exitCode = proc.waitFor();
            
            if (exitCode != 0) {
                logError("FFmpegが異常終了しました。終了コード: " + exitCode);
            }
            
            return exitCode == 0;
        } catch (IOException e) {
            logError("FFmpeg実行エラー: " + e.getMessage());
            if (proc != null) {
                proc.destroyForcibly();
            }
            return false;
        } catch (InterruptedException e) {
            logError("FFmpeg処理が中断されました: " + e.getMessage());
            if (proc != null) {
                proc.destroyForcibly();
            }
            Thread.currentThread().interrupt();
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
    
    private void logInfo(String message) {
        if (logArea != null) {
            final String infoMessage = String.format(
                "[%s] INFO: %s\n",
                new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date()),
                message
            );
            
            javax.swing.SwingUtilities.invokeLater(() -> {
                logArea.append(infoMessage);
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