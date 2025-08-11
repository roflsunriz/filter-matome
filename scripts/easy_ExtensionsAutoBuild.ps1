# 文字コードをUTF-8に設定
$OutputEncoding = [System.Text.Encoding]::UTF8

# リポジトリルートの extensions に移動
Set-Location (Join-Path $PSScriptRoot "..\extensions")

# 成功したファイルのリストを初期化
$successFiles = @()

# nlMovieFetcher.javaのコンパイルについてユーザーに確認
$compileMovieFetcher = Read-Host "nlMovieFetcher.javaをコンパイルしますか？ (y/n)"

# すべてのJavaファイルを処理
Get-ChildItem -Filter "*.java" | Where-Object { $_.Name -notmatch "sample" } | ForEach-Object {
    # nlMovieFetcher.javaのスキップ処理
    if ($_.Name -eq "nlMovieFetcher.java" -and $compileMovieFetcher -eq "n") {
        Write-Host "Skipping nlMovieFetcher.java" -ForegroundColor Yellow
        return
    }
    
    # Javaコンパイル実行
    # ルートの JAR を参照
    $jarPath = (Join-Path $PSScriptRoot "..\NicoCache_nl.jar")
    $compileOutput = & "$env:JAVA_HOME\bin\javac" -Xlint -Xlint:-path -classpath "..;$jarPath" $_.FullName 2>&1

    # コンパイル結果の処理
    if ($compileOutput) {
        foreach ($line in $compileOutput) {
            if ($line -match "error") {
                Write-Host $line -ForegroundColor Red
            }
            elseif ($line -match "warning") {
                Write-Host $line -ForegroundColor Yellow
            }
            else {
                Write-Host $line
            }
        }
    }
    else {
        Write-Host "$($_.Name) のコンパイルが" -NoNewline
        Write-Host "成功" -ForegroundColor Green -NoNewline
        Write-Host "しました。"
        $successFiles += $_.Name
    }
}

# 成功したファイルの一覧を表示
if ($successFiles.Count -gt 0) {
    Write-Host "`nコンパイル成功したファイル一覧:" -ForegroundColor Green
    Write-Host ($successFiles -join " ")
}

Write-Host "`n「警告」" -ForegroundColor Yellow -NoNewline
Write-Host "は無視して問題ありません。気になるようであれば掲示板に報告してください"

Write-Host "「エラー」" -ForegroundColor Red -NoNewline
Write-Host "はコンパイル失敗です。解決してください"

# 一時停止
Write-Host "`n続行するには何かキーを押してください..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")