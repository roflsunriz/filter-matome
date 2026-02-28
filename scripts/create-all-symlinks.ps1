#requires -Version 7.0
<#
.SYNOPSIS
  filter-matome から NicoCache_nl へシンボリックリンクを一括作成するスクリプト

.DESCRIPTION
  SourceRoot 配下のファイル/フォルダを TargetRoot 配下へ
  シンボリックリンクとして一括作成します。
  管理者権限が必要です。未昇格の場合は昇格プロンプトを表示します。

.PARAMETER SourceRoot
  リンク元のルートフォルダ（既定: C:\filter-matome）

.PARAMETER TargetRoot
  リンク先のルートフォルダ（既定: C:\NicoCache_nl）

.PARAMETER DryRun
  実際にはリンクを作成せず、作成予定のリンク一覧を表示します。

.PARAMETER Force
  既存のシンボリックリンクを強制的に再作成します。

.EXAMPLE
  .\create-all-symlinks.ps1
  .\create-all-symlinks.ps1 --dry-run
  .\create-all-symlinks.ps1 -SourceRoot D:\filter-matome -TargetRoot D:\NicoCache_nl --dry-run
#>

[CmdletBinding(PositionalBinding = $false)]
param(
    [Alias('s')]
    [string]$SourceRoot = 'C:\filter-matome',

    [Alias('t')]
    [string]$TargetRoot = 'C:\NicoCache_nl',

    [switch]$DryRun,
    [Alias('f')]
    [switch]$Force,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$AdditionalArgs = @()
)

$sourceSpecified = $PSBoundParameters.ContainsKey('SourceRoot')
$targetSpecified = $PSBoundParameters.ContainsKey('TargetRoot')

# --- GNU 風オプションの補完 ---
for ($i = 0; $i -lt $AdditionalArgs.Count; $i++) {
    $arg = $AdditionalArgs[$i]
    switch -Regex ($arg) {
        '^--dry-run$'  { $DryRun = $true; continue }
        '^--force$'    { $Force  = $true; continue }
        '^--no-force$' { $Force  = $false; continue }
        '^--source-root(?:=(.*))?$' {
            $value = $Matches[1]
            if (-not $value) {
                $i++
                if ($i -ge $AdditionalArgs.Count) { throw "引数 '--source-root' に値が指定されていません。" }
                $value = $AdditionalArgs[$i]
            }
            $SourceRoot = $value; $sourceSpecified = $true; continue
        }
        '^--target-root(?:=(.*))?$' {
            $value = $Matches[1]
            if (-not $value) {
                $i++
                if ($i -ge $AdditionalArgs.Count) { throw "引数 '--target-root' に値が指定されていません。" }
                $value = $AdditionalArgs[$i]
            }
            $TargetRoot = $value; $targetSpecified = $true; continue
        }
        '^--$' { continue }
        default { throw "未対応の引数: $arg" }
    }
}

# --- 対話的なルートパス入力（未指定時のみ） ---
if (-not $sourceSpecified) {
    $userInput = Read-Host "リンク元ルートフォルダ (Enter で既定値: '$SourceRoot')"
    if ($userInput) { $SourceRoot = $userInput }
}
if (-not $targetSpecified) {
    $userInput = Read-Host "リンク先ルートフォルダ (Enter で既定値: '$TargetRoot')"
    if ($userInput) { $TargetRoot = $userInput }
}

$SourceRoot = $SourceRoot.TrimEnd('\')
$TargetRoot = $TargetRoot.TrimEnd('\')

Write-Host "リンク元: $SourceRoot" -ForegroundColor Cyan
Write-Host "リンク先: $TargetRoot" -ForegroundColor Cyan
Write-Host ""

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
        $argList += '--source-root', $SourceRoot
        $argList += '--target-root', $TargetRoot
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

# --- リンクマッピング定義（ルートからの相対パス） ---
# SourceRel = リンク元（SourceRoot からの相対パス）
# LinkRel   = リンク先（TargetRoot からの相対パス）
$relativeMappings = @(
    @{ SourceRel = 'scripts';                                          LinkRel = 'scripts' }
    @{ SourceRel = 'local\background-images';                          LinkRel = 'local\background-images' }
    @{ SourceRel = 'local\features';                                   LinkRel = 'local\features' }
    @{ SourceRel = 'local\images';                                     LinkRel = 'local\images' }
    @{ SourceRel = 'local\mime.types';                                 LinkRel = 'local\mime.types' }
    @{ SourceRel = 'nlFilters\100_common.txt';                         LinkRel = 'nlFilters\100_common.txt' }
    @{ SourceRel = 'nlFilters\101_disable_official_function.txt';       LinkRel = 'nlFilters\101_disable_official_function.txt' }
    @{ SourceRel = 'nlFilters\102_mlink_video_controller.txt';          LinkRel = 'nlFilters\102_mlink_video_controller.txt' }
    @{ SourceRel = 'nlFilters\103_comment_filter2.txt';                 LinkRel = 'nlFilters\103_comment_filter2.txt' }
    @{ SourceRel = 'nlFilters\104_video_player.txt';                    LinkRel = 'nlFilters\104_video_player.txt' }
    @{ SourceRel = 'nlFilters\105_premium_hide.txt';                    LinkRel = 'nlFilters\105_premium_hide.txt' }
    @{ SourceRel = 'nlFilters\106_watch_history.txt';                   LinkRel = 'nlFilters\106_watch_history.txt' }
    @{ SourceRel = 'extensions\CommentFilterLogger.class';              LinkRel = 'extensions\CommentFilterLogger.class' }
    @{ SourceRel = 'extensions\CustomCacheReturner.class';              LinkRel = 'extensions\CustomCacheReturner.class' }
    @{ SourceRel = 'extensions\downloadThruFFmpeg.class';               LinkRel = 'extensions\downloadThruFFmpeg.class' }
    @{ SourceRel = 'extensions\ExtUtil.class';                          LinkRel = 'extensions\ExtUtil.class' }
    @{ SourceRel = 'extensions\nlMediaInfo.class';                      LinkRel = 'extensions\nlMediaInfo.class' }
    @{ SourceRel = 'nico-cache-gui-launcher.bat';                      LinkRel = 'nico-cache-gui-launcher.bat' }
    @{ SourceRel = 'nico-cache-nl-starter.bat';                        LinkRel = 'nico-cache-nl-starter.bat' }
    @{ SourceRel = 'local\features\dist\cacheDataManager.iife.js';     LinkRel = 'local\list.js' }
)

$linkMappings = $relativeMappings | ForEach-Object {
    @{
        Source = Join-Path $SourceRoot $_.SourceRel
        Link   = Join-Path $TargetRoot $_.LinkRel
    }
}

# --- リンク先ルートフォルダの存在チェック ---
if (-not (Test-Path -LiteralPath $TargetRoot)) {
    Write-Warning "リンク先のフォルダが存在しません: $TargetRoot"
    Write-Warning "NicoCache_nl がインストールされているか確認してください。"
    exit 1
}

# リンク先の親ディレクトリをすべて検証
$missingParents = @()
foreach ($mapping in $linkMappings) {
    $parentDir = Split-Path -Path $mapping.Link -Parent
    if (-not $parentDir -or -not (Test-Path -LiteralPath $parentDir)) {
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
    if (-not $DryRun) {
        exit 1
    }
    Write-Warning "Dry-run モードのため続行します。"
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
