#requires -Version 7.0
<#
.SYNOPSIS
  NicoCache_nl の `C:\NicoCache_nl\local\list.js` と `list.js.map` へシンボリックリンクを張るスクリプト

.DESCRIPTION
  指定のビルド成果物（例: cache-data-manager.es.js）から `C:\NicoCache_nl\local\list.js` へのシンボリックリンクを作成します。
  map ファイル（<Target>.map）が存在する場合のみ `list.js.map` も作成します。
  .map が存在しない場合は自動的に map 関連の処理をスキップします。

.PARAMETER Target
  シンボリックリンクのターゲットとなるビルド成果物の JS ファイルパス（例: C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js）

.PARAMETER LocalBase
  ローカルのリンク設置ベースパス。既定は `C:\NicoCache_nl\local`。

.PARAMETER Force
  既存の `list.js` / `list.js.map` がある場合に強制的に削除してから作成します。

.EXAMPLE
  .\create-listjs-symlink.ps1 -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js" -Force
#>

param(
    [Parameter(Position=0)]
    [string]$Target = "C:\\NicoCache_nl\\local\\features\\dist\\cache-data-manager.es.js",

    [string]$LocalBase = "C:\\NicoCache_nl\\local",

    [switch]$Force
)

# 対話的 Target 入力（未指定時はデフォルトを案内）
if (-not $PSBoundParameters.ContainsKey('Target')) {
    $promptMsg = "Target を入力してください（Enter で既定 '$Target' を使用）"
    $userInput = Read-Host $promptMsg
    if ($userInput -ne '') { $Target = $userInput }
}

function Remove-Item-Safely {
    param([string]$PathToRemove)
    if (-not (Test-Path $PathToRemove)) { return }
    # 安全に消したいので、sri コマンドがあればそれを優先利用
    $sriCmd = Get-Command sri -ErrorAction SilentlyContinue
    if ($sriCmd) {
        try {
            & $sriCmd.Name -Path $PathToRemove -Force -ErrorAction Stop
        } catch {
            try {
                & $sriCmd.Name $PathToRemove -ErrorAction Stop
            } catch {
                Write-Warning "sri の削除に失敗しました: $PathToRemove -> $($_.Exception.Message)"
                throw
            }
        }
    } else {
        try {
            Remove-Item -Path $PathToRemove -Force -ErrorAction Stop
        } catch {
            Write-Warning "Remove-Item の削除に失敗しました: $PathToRemove -> $($_.Exception.Message)"
            throw
        }
    }
}

# パス類
$linkPath    = Join-Path $LocalBase "list.js"
$mapLinkPath = Join-Path $LocalBase "list.js.map"
$targetMap   = "$Target.map"
$hasMap      = Test-Path $targetMap

Write-Host "作成対象: $linkPath -> $Target"
if (-not $hasMap) {
    Write-Host "map ファイルが存在しないため、list.js.map の更新はスキップします: $targetMap"
}

if (-not (Test-Path $Target)) {
    Write-Error "ターゲットファイルが見つかりません: $Target"
    exit 1
}

try {
    # 既存のリンク/ファイルを整理
    if ($Force -or (Test-Path $linkPath)) {
        Write-Host "既存 $linkPath を削除します"
        Remove-Item-Safely -PathToRemove $linkPath
    }

    if ($hasMap) {
        if ($Force -or (Test-Path $mapLinkPath)) {
            Write-Host "既存 $mapLinkPath を削除します"
            Remove-Item-Safely -PathToRemove $mapLinkPath
        }
    }

    # シンボリックリンクを作成
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $Target -ErrorAction Stop | Out-Null
    Write-Host "作成しました: $linkPath -> $Target"

    if ($hasMap) {
        New-Item -ItemType SymbolicLink -Path $mapLinkPath -Target $targetMap -ErrorAction Stop | Out-Null
        Write-Host "作成しました: $mapLinkPath -> $targetMap"
    }

    # 確認出力
    Get-Item $linkPath | Select-Object Mode, LinkType, Target | Format-List
    Resolve-Path $linkPath | ForEach-Object { Write-Host "ResolvedPath: $_" }
    Write-Host "Test-Path list.js: $(Test-Path $linkPath)"
    if (Test-Path $mapLinkPath) { Write-Host "Test-Path list.js.map: $(Test-Path $mapLinkPath)" }

} catch {
    Write-Error "処理中にエラーが発生しました: $($_.Exception.Message)"
    exit 1
}

Write-Host "完了。必要に応じてアプリ側のコードを確認してください。"

