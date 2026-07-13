[Diagnostics.CodeAnalysis.SuppressMessageAttribute(
    'PSAvoidUsingWriteHost',
    '',
    Justification = '対話型ビルド画面へ完了待ちを直接表示するためWrite-Hostが必要です。')]
param()

# コンソールの色を設定（緑背景に黄色文字）
$Host.UI.RawUI.BackgroundColor = "DarkGreen"
$Host.UI.RawUI.ForegroundColor = "Yellow"
Clear-Host

# ウィンドウタイトルを設定
$Host.UI.RawUI.WindowTitle = "AutoBuilder"

# リポジトリルートに移動
Set-Location (Join-Path $PSScriptRoot "..")

# antコマンドを実行（ルートの build.xml を対象）
ant extract jar

# コンソールを開いたままにする
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
