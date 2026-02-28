#requires -Version 7.0
<#
.SYNOPSIS
  filter-matome から NicoCache_nl へシンボリックリンクを一括作成するスクリプト

.DESCRIPTION
  C:\filter-matome 配下のファイル/フォルダを C:\NicoCache_nl 配下へ
  シンボリックリンクとして一括作成します。
  管理者権限が必要です。未昇格の場合は昇格プロンプトを表示します。

.PARAMETER DryRun
  実際にはリンクを作成せず、作成予定のリンク一覧を表示します。

.PARAMETER Force
  既存のシンボリックリンクを強制的に再作成します。

.EXAMPLE
  .\create-all-symlinks.ps1
  .\create-all-symlinks.ps1 --dry-run
  .\create-all-symlinks.ps1 -DryRun -Force
#>

param(
    [switch]$DryRun,
    [Alias('f')]
    [switch]$Force,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$AdditionalArgs = @()
)

# --- GNU 風オプションの補完 ---
foreach ($arg in $AdditionalArgs) {
    switch ($arg) {
        '--dry-run'  { $DryRun = $true }
        '--force'    { $Force  = $true }
        '--no-force' { $Force  = $false }
        default      { throw "未対応の引数: $arg" }
    }
}

# --- 管理者権限チェック ---
function Test-IsAdministrator {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not $DryRun -and -not (Test-IsAdministrator)) {
    Write-Warning "シンボリックリンクの作成には管理者権限が必要です。"
    $response = Read-Host "管理者権限に昇格して再実行しますか？ (Y/n)"
    if ($response -eq '' -or $response -match '^[Yy]') {
        $scriptPath = $MyInvocation.MyCommand.Path
        $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $scriptPath)
        if ($DryRun) { $argList += '--dry-run' }
        if ($Force)  { $argList += '--force' }
        Start-Process pwsh -Verb RunAs -ArgumentList $argList
        exit 0
    }
    else {
        Write-Warning "管理者権限がないため終了します。"
        exit 1
    }
}

# --- リンクマッピング定義 ---
# Source = リンク元（実体: filter-matome 側）
# Link   = リンク先（シンボリックリンク: NicoCache_nl 側）
$linkMappings = @(
    @{ Source = 'C:\filter-matome\scripts';                                          Link = 'C:\NicoCache_nl\scripts' }
    @{ Source = 'C:\filter-matome\local\background-images';                          Link = 'C:\NicoCache_nl\local\background-images' }
    @{ Source = 'C:\filter-matome\local\features';                                   Link = 'C:\NicoCache_nl\local\features' }
    @{ Source = 'C:\filter-matome\local\images';                                     Link = 'C:\NicoCache_nl\local\images' }
    @{ Source = 'C:\filter-matome\local\mime.types';                                 Link = 'C:\NicoCache_nl\local\mime.types' }
    @{ Source = 'C:\filter-matome\nlFilters\100_common.txt';                         Link = 'C:\NicoCache_nl\local\nlFilters\100_common.txt' }
    @{ Source = 'C:\filter-matome\nlFilters\101_disable_official_function.txt';       Link = 'C:\NicoCache_nl\local\nlFilters\101_disable_official_function.txt' }
    @{ Source = 'C:\filter-matome\nlFilters\102_mlink_video_controller.txt';          Link = 'C:\NicoCache_nl\local\nlFilters\102_mlink_video_controller.txt' }
    @{ Source = 'C:\filter-matome\nlFilters\103_comment_filter2.txt';                 Link = 'C:\NicoCache_nl\local\nlFilters\103_comment_filter2.txt' }
    @{ Source = 'C:\filter-matome\nlFilters\104_video_player.txt';                    Link = 'C:\NicoCache_nl\local\nlFilters\104_video_player.txt' }
    @{ Source = 'C:\filter-matome\nlFilters\105_premium_hide.txt';                    Link = 'C:\NicoCache_nl\local\nlFilters\105_premium_hide.txt' }
    @{ Source = 'C:\filter-matome\nlFilters\106_watch_history.txt';                   Link = 'C:\NicoCache_nl\local\nlFilters\106_watch_history.txt' }
    @{ Source = 'C:\filter-matome\extensions\CommentFilterLogger.class';              Link = 'C:\NicoCache_nl\local\extensions\CommentFilterLogger.class' }
    @{ Source = 'C:\filter-matome\extensions\CustomCacheReturner.class';              Link = 'C:\NicoCache_nl\local\extensions\CustomCacheReturner.class' }
    @{ Source = 'C:\filter-matome\extensions\downloadThruFFmpeg.class';               Link = 'C:\NicoCache_nl\local\extensions\downloadThruFFmpeg.class' }
    @{ Source = 'C:\filter-matome\extensions\ExtUtil.class';                          Link = 'C:\NicoCache_nl\local\extensions\ExtUtil.class' }
    @{ Source = 'C:\filter-matome\extensions\nlMediaInfo.class';                      Link = 'C:\NicoCache_nl\local\extensions\nlMediaInfo.class' }
    @{ Source = 'C:\filter-matome\nico-cache-gui-launcher.bat';                      Link = 'C:\NicoCache_nl\nico-cache-gui-launcher.bat' }
    @{ Source = 'C:\filter-matome\nico-cache-nl-starter.bat';                        Link = 'C:\NicoCache_nl\nico-cache-nl-starter.bat' }
    @{ Source = 'C:\filter-matome\local\features\dist\cacheDataManager.iife.js';     Link = 'C:\NicoCache_nl\local\list.js' }
)

# --- リンク先ルートフォルダの存在チェック ---
$targetRoot = 'C:\NicoCache_nl'
if (-not (Test-Path -LiteralPath $targetRoot)) {
    Write-Warning "リンク先のフォルダが存在しません: $targetRoot"
    Write-Warning "NicoCache_nl がインストールされているか確認してください。"
    exit 1
}

# リンク先の親ディレクトリをすべて検証
$missingParents = @()
foreach ($mapping in $linkMappings) {
    $parentDir = Split-Path -LiteralPath $mapping.Link -Parent
    if (-not (Test-Path -LiteralPath $parentDir)) {
        if ($missingParents -notcontains $parentDir) {
            $missingParents += $parentDir
        }
    }
}
if ($missingParents.Count -gt 0) {
    Write-Warning "リンク先のフォルダが存在しません:"
    foreach ($dir in $missingParents) {
        Write-Warning "  $dir"
    }
    Write-Warning "NicoCache_nl のディレクトリ構成を確認してください。"
    exit 1
}

# --- 安全な削除ヘルパー ---
function Remove-ItemSafely {
    param([string]$PathToRemove)
    if (-not (Test-Path -LiteralPath $PathToRemove)) { return }
    $sriCmd = Get-Command sri -ErrorAction SilentlyContinue
    if ($sriCmd) {
        try {
            & $sriCmd.Name $PathToRemove -ErrorAction Stop
        }
        catch {
            Write-Warning "sri での削除に失敗: $PathToRemove -> $($_.Exception.Message)"
            throw
        }
    }
    else {
        try {
            Remove-Item -LiteralPath $PathToRemove -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Remove-Item での削除に失敗: $PathToRemove -> $($_.Exception.Message)"
            throw
        }
    }
}

# --- メイン処理 ---
$modeLabel = if ($DryRun) { "[DRY-RUN] " } else { "" }
Write-Host "${modeLabel}シンボリックリンク一括作成を開始します。" -ForegroundColor Cyan
Write-Host "${modeLabel}リンク数: $($linkMappings.Count)" -ForegroundColor Cyan
Write-Host ""

$created  = 0
$skipped  = 0
$existing = 0
$failed   = 0

foreach ($mapping in $linkMappings) {
    $source = $mapping.Source
    $link   = $mapping.Link

    # リンク元の存在チェック
    if (-not (Test-Path -LiteralPath $source)) {
        Write-Warning "リンク元が存在しません。スキップ: $source"
        $skipped++
        continue
    }

    # Dry-run モード
    if ($DryRun) {
        Write-Host "[DRY-RUN] $link -> $source" -ForegroundColor Yellow
        $created++
        continue
    }

    # 既存リンクの処理
    if (Test-Path -LiteralPath $link) {
        $item = Get-Item -LiteralPath $link -Force
        if ($item.LinkType -eq 'SymbolicLink') {
            $currentTarget = $item.Target
            if ($currentTarget -eq $source) {
                if (-not $Force) {
                    Write-Host "[既存] $link -> $source" -ForegroundColor DarkGray
                    $existing++
                    continue
                }
            }
            Write-Host "既存のシンボリックリンクを削除: $link" -ForegroundColor DarkYellow
            Remove-ItemSafely -PathToRemove $link
        }
        else {
            Write-Warning "リンク先にシンボリックリンクでないファイル/フォルダが存在します: $link"
            Write-Warning "安全のためスキップします。手動で確認してください。"
            $skipped++
            continue
        }
    }

    # シンボリックリンク作成
    try {
        New-Item -ItemType SymbolicLink -Path $link -Target $source -ErrorAction Stop | Out-Null
        Write-Host "[作成] $link -> $source" -ForegroundColor Green
        $created++
    }
    catch {
        Write-Error "リンク作成に失敗: $link -> $source : $($_.Exception.Message)"
        $failed++
    }
}

# --- サマリー ---
Write-Host ""
Write-Host "${modeLabel}--- 結果サマリー ---" -ForegroundColor Cyan
Write-Host "  作成: $created" -ForegroundColor Green
Write-Host "  既存: $existing" -ForegroundColor DarkGray
Write-Host "  スキップ: $skipped" -ForegroundColor Yellow
Write-Host "  失敗: $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'DarkGray' })

if ($failed -gt 0) {
    exit 1
}
