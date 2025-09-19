@echo off
cd %~dp0
setlocal enabledelayedexpansion

echo ドラッグ・アンド・ドロップされたファイル/フォルダを処理します！

rem デバッグ情報の表示
echo 引数の数: %#
echo 全引数: "%*"
echo.

:CODEC_MENU
echo.
echo 変換後のコーデックを選択します！
echo 1: AVC (H.264) - 互換性重視
echo 2: HEVC (H.265) - 圧縮効率が良い
echo 3: AV1 - 最新の圧縮技術
echo.
set /p codec_choice="番号を入力してください (デフォルト:1): "
if "!codec_choice!"=="" set codec_choice=1

rem コーデック設定
if !codec_choice!==1 (
    set "vcodec=-c:v libx264 -preset slower -crf 23 -profile:v high -tune animation"
    set "target_codec=h264"
    echo AVC (H.264^)で変換します！
) else if !codec_choice!==2 (
    set "vcodec=-c:v libx265 -preset medium -crf 28 -profile:v main -tune animation"
    set "target_codec=hevc"
    echo HEVC (H.265^)で変換します！
) else if !codec_choice!==3 (
    set "vcodec=-c:v libsvtav1 -preset 4 -crf 30"
    set "target_codec=av1"
    echo AV1で変換します！
) else (
    echo 無効な選択です！AVC (H.264^)を使います！
    set "vcodec=-c:v libx264 -preset slower -crf 23 -profile:v high -tune animation"
    set "target_codec=h264"
)

echo.
echo 処理を開始します！
echo.

rem ドロップされたパスをチェック
if "%~1"=="" (
    echo ファイルがドロップされていません！
    echo 動画ファイルまたはHLSフォルダをドロップしてください！
    pause
    exit /b
)

rem 全引数を結合してパスを作成
set "full_path=%*"
set "full_path=!full_path:"=!"

rem 出力ファイル名を生成
for %%F in ("!full_path!") do set "output_name=%%~nxF"
set "output_name=!output_name:.hls=!"

rem キャッシュ途中のファイルをチェック
echo !output_name! | findstr /r /c:"^nltmp_" >nul
if !errorlevel! equ 0 (
    echo.
    echo 警告: キャッシュ途中のファイルです！
    echo "!full_path!"
    echo ダウンロードが完了するまで待ってください！
    echo.
    pause
    exit /b
)

echo 処理開始: "!full_path!"
echo 出力ファイル名: "convert_!output_name!.mp4"

rem パスの存在確認
if not exist "!full_path!" (
    echo エラー: パスが見つかりません: "!full_path!"
    echo 正しいパスかどうか確認してください！
    pause
    exit /b
)

rem HLSフォルダかどうかをチェック
if exist "!full_path!\master.m3u8" (
    echo HLS形式を検出しました: "!full_path!"
    
    rem フォルダ構造を確認
    echo.
    echo フォルダ構造を確認します:
    dir "!full_path!" /s /b
    echo.
    
    rem 新形式のチェック（audio.m3u8が存在する場合）
    if exist "!full_path!\audio.m3u8" (
        set "video_path=!full_path!\video.m3u8"
        set "audio_path=!full_path!\audio.m3u8"
        
        echo 新形式HLSを変換中です...
        echo 動画パス: "!video_path!"
        echo 音声パス: "!audio_path!"
        ffmpeg -protocol_whitelist "file,http,https,tcp,tls,crypto,data" -allowed_extensions "ALL" -i "!video_path!" -protocol_whitelist "file,http,https,tcp,tls,crypto,data" -allowed_extensions "ALL" -i "!audio_path!" !vcodec! -vf format=pix_fmts=yuv420p -movflags +faststart -c:a aac -profile:a aac_low -b:a 192k -ar 48000 -ac 2 -strict experimental -fps_mode cfr -vsync 1 -async 1 "convert_!output_name!.mp4"
        if !errorlevel! equ 0 (
            echo 新形式HLSの変換が成功しました: "!full_path!"
        ) else (
            echo 新形式HLSの変換に失敗しました: "!full_path!"
        )
    ) else (
        rem playlist.m3u8の場所を探す
        for /f "delims=" %%i in ('dir /s /b "!full_path!\playlist.m3u8" 2^>nul') do (
            set "playlist_path=%%i"
        )
        
        if defined playlist_path (
            echo playlist.m3u8を見つけました: "!playlist_path!"
            echo 旧形式HLSを変換中です...
            ffmpeg -protocol_whitelist "file,http,https,tcp,tls,crypto,data" -allowed_extensions "ALL" -i "!playlist_path!" !vcodec! -vf format=pix_fmts=yuv420p -movflags +faststart -c:a aac -profile:a aac_low -b:a 192k -ar 48000 -ac 2 -strict experimental -fps_mode cfr -vsync 1 -async 1 "convert_!output_name!.mp4"
            if !errorlevel! equ 0 (
                echo 旧形式HLSの変換が成功しました: "!full_path!"
            ) else (
                echo 旧形式HLSの変換に失敗しました: "!full_path!"
            )
        ) else (
            echo エラー: playlist.m3u8が見つかりません！
            echo フォルダ構造を確認してください！
            pause
            exit /b
        )
    )
) else (
    rem 通常のファイル処理
    for /f "tokens=*" %%v in ('ffprobe -v error -select_streams v:0 -show_entries stream^=codec_name -of default^=noprint_wrappers^=1:nokey^=1 "!full_path!"') do set vcodec_in=%%v
    for /f "tokens=*" %%a in ('ffprobe -v error -select_streams a:0 -show_entries stream^=codec_name -of default^=noprint_wrappers^=1:nokey^=1 "!full_path!"') do set acodec=%%a

    if "!vcodec_in!"=="!target_codec!" if "!acodec!"=="aac" (
        echo コーデックが既に!target_codec!/AACなのでストリームコピーします...
        ffmpeg -i "!full_path!" -c copy "convert_!output_name!.mp4"
        echo ストリームコピーが完了しました: "!full_path!"
    ) else (
        echo 通常ファイルを変換中です...
        ffmpeg -i "!full_path!" !vcodec! -vf format=pix_fmts=yuv420p -movflags +faststart -c:a aac -profile:a aac_low -b:a 192k -ar 48000 -ac 2 -strict experimental -fps_mode cfr -vsync 1 -async 1 "convert_!output_name!.mp4"
        if !errorlevel! equ 0 (
            echo 変換が成功しました: "!full_path!"
        ) else (
            echo 変換に失敗しました: "!full_path!"
        )
    )
)

echo.
echo 全ての処理が終わりました！お疲れ様でした！
pause
exit /b