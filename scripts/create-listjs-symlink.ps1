<#
.SYNOPSIS
  NicoCache_nl 用の `C:\NicoCache_nl\local\list.js` と `list.js.map` へのシンボリックリンクを作成するスクリプト

.DESCRIPTION
  指定したビルド成果物（例: cache-data-manager.es.js）へ固定パス `C:\NicoCache_nl\local\list.js` を指すシンボリックリンクを作成します。
  map ファイルが存在すれば `list.js.map` も作ります。

.PARAMETER Target
  作成したいシンボリックリンクのターゲットとなるビルド成果物のフルパス（例: C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js）

.PARAMETER LocalBase
  リンクを作成するローカルディレクトリのベースパス。既定値は `C:\NicoCache_nl\local`。

.PARAMETER Force
  既存の `list.js` / `list.js.map` を強制的に削除して上書きする場合はスイッチを指定します。

.EXAMPLE
  .\create-listjs-symlink.ps1 -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js" -Force

#>

param(
    [Parameter(Position=0)]
    [string]$Target = "C:\\NicoCache_nl\\local\\features\\dist\\cache-data-manager.es.js",

    [string]$LocalBase = "C:\\NicoCache_nl\\local",

    [switch]$Force
)

# 引数で Target が渡されていない場合はプロンプトで入力を待つ
if (-not $PSBoundParameters.ContainsKey('Target')) {
    $promptMsg = "Target を入力してください（Enter で既定値 '$Target' を使用）"
    $userInput = Read-Host $promptMsg
    if ($userInput -ne '') { $Target = $userInput }
}

function Remove-Item-Safely {
    param([string]$PathToRemove)
    if (-not (Test-Path $PathToRemove)) { return }
    # ユーザー環境に Safe-Remove-Item (sri) がエイリアスとして存在すれば使う
    $sriCmd = Get-Command sri -ErrorAction SilentlyContinue
    if ($sriCmd) {
        try {
            # まず一般的なパラメーター形式で試す（多くの実装が対応）
            & $sriCmd.Name -Path $PathToRemove -Force -ErrorAction Stop
        } catch {
            try {
                # -Path/-Force に未対応な実装向けに位置引数で試す
                & $sriCmd.Name $PathToRemove -ErrorAction Stop
            } catch {
                Write-Warning "sri による削除に失敗しました: $PathToRemove -> $($_.Exception.Message)"
                throw
            }
        }
    } else {
        try {
            Remove-Item -Path $PathToRemove -Force -ErrorAction Stop
        } catch {
            Write-Warning "Remove-Item による削除に失敗しました: $PathToRemove -> $($_.Exception.Message)"
            throw
        }
    }
}

# 絶対パスに変換
$linkPath = Join-Path $LocalBase "list.js"
$mapLinkPath = Join-Path $LocalBase "list.js.map"
$targetMap = "$Target.map"

Write-Host "リンク作成: $linkPath -> $Target"

if (-not (Test-Path $Target)) {
    Write-Error "ターゲットファイルが見つかりません: $Target"
    exit 1
}

try {
    # 既存のリンク/ファイルを削除（Force 指定か、ファイルが存在する場合）
    if ($Force -or (Test-Path $linkPath)) {
        Write-Host "既存の $linkPath を削除します"
        Remove-Item-Safely -PathToRemove $linkPath
    }

    if ($Force -or (Test-Path $mapLinkPath)) {
        # map はターゲットの map が存在しない場合でも削除対象となる
        Write-Host "既存の $mapLinkPath を削除します"
        Remove-Item-Safely -PathToRemove $mapLinkPath
    }

    # シンボリックリンクを作成
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $Target -ErrorAction Stop | Out-Null
    Write-Host "作成しました: $linkPath -> $Target"

    if (Test-Path $targetMap) {
        New-Item -ItemType SymbolicLink -Path $mapLinkPath -Target $targetMap -ErrorAction Stop | Out-Null
        Write-Host "作成しました: $mapLinkPath -> $targetMap"
    } else {
        Write-Host "対応する map ファイルが見つかりませんでした: $targetMap"
    }

    # 確認表示
    Get-Item $linkPath | Select-Object Mode, LinkType, Target | Format-List
    Resolve-Path $linkPath | ForEach-Object { Write-Host "ResolvedPath: $_" }
    Write-Host "Test-Path list.js: $(Test-Path $linkPath)"

} catch {
    Write-Error "処理中にエラーが発生しました: $($_.Exception.Message)"
    exit 1
}

Write-Host "完了。管理者権限または開発者モードが必要な場合があります。"


