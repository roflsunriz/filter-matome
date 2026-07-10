#requires -Version 7.0
<#
.SYNOPSIS
  NicoCache_nl の `C:\NicoCache_nl\local\list.js` と `list.js.map` へシンボリックリンクを張るスクリプト

.DESCRIPTION
  指定のビルド成果物（例: features.js）から `C:\NicoCache_nl\local\list.js` へのシンボリックリンクを作成します。
  map ファイル（<Target>.map）が存在する場合のみ `list.js.map` も作成します。iifeの場合は.mapファイルは存在しません。
  .map が存在しない場合は自動的に map 関連の処理をスキップします。

.PARAMETER Target
  シンボリックリンクのリンク先となるビルド成果物のJSファイルパス。 (例: C:\NicoCache_nl\local\features\dist\features.js)

.PARAMETER LinkDir
  シンボリックリンクを作成するディレクトリ。 (既定: C:\NicoCache_nl\local)

.PARAMETER Force
  既存の `list.js` / `list.js.map` がある場合に強制的に削除してから作成します。

.EXAMPLE
  .\create-listjs-symlink.ps1 -Target "C:\NicoCache_nl\local\features\dist\features.js" -Force
#>

param(
    [Parameter(Position=0)]
    [Alias('t','target')]
    [string]$TargetFile = "C:\\NicoCache_nl\\local\\features\\dist\\features.js",

    [Alias('l','linkdirectory')]
    [string]$LinkDir = "C:\\NicoCache_nl\\local",

    [Alias('f')]
    [switch]$Force,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$AdditionalArgs = @()
)

$targetSpecified = $PSBoundParameters.ContainsKey('TargetFile')

# --- GNU 風オプションの補完 ---
if ($AdditionalArgs.Count -gt 0) {
    for ($i = 0; $i -lt $AdditionalArgs.Count; $i++) {
        $arg = $AdditionalArgs[$i]
        switch -Regex ($arg) {
            '^--force$' {
                $Force = $true
                continue
            }
            '^--no-force$' {
                $Force = $false
                continue
            }
            '^--target(?:=(.*))?$' {
                $value = $Matches[1]
                if (-not $value) {
                    $i++
                    if ($i -ge $AdditionalArgs.Count) {
                        throw "引数 '--target' に値が指定されていません。"
                    }
                    $value = $AdditionalArgs[$i]
                }
                $TargetFile = $value
                $targetSpecified = $true
                continue
            }
            '^--link-dir(?:=(.*))?$' {
                $value = $Matches[1]
                if (-not $value) {
                    $i++
                    if ($i -ge $AdditionalArgs.Count) {
                        throw "引数 '--link-dir' に値が指定されていません。"
                    }
                    $value = $AdditionalArgs[$i]
                }
                $LinkDir = $value
                continue
            }
            '^--linkdir(?:=(.*))?$' {
                $value = $Matches[1]
                if (-not $value) {
                    $i++
                    if ($i -ge $AdditionalArgs.Count) {
                        throw "引数 '--linkdir' に値が指定されていません。"
                    }
                    $value = $AdditionalArgs[$i]
                }
                $LinkDir = $value
                continue
            }
            '^--$' {
                continue
            }
            default {
                throw "未対応の引数: $arg"
            }
        }
    }
}

# 対話的 Target 入力（未指定時はデフォルトを案内）
if (-not $targetSpecified) {
    $promptMsg = "Target を入力してください（Enter で既定 '$Target' を使用）"
    $userInput = Read-Host -Prompt "リンク先のJSファイルパスを入力してください (既定値: '$TargetFile')"
    if ($userInput) { $TargetFile = $userInput }
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
$linkPath    = Join-Path $LinkDir "list.js"
$mapLinkPath = Join-Path $LinkDir "list.js.map"
$targetMap   = "$TargetFile.map"
$hasMap      = Test-Path $targetMap

Write-Host "作成対象: $linkPath -> $TargetFile"
if (-not $hasMap) {
    Write-Host "map ファイルが存在しないため、list.js.map の更新はスキップします: $targetMap"
}

if (-not (Test-Path $TargetFile)) {
    Write-Error "ターゲットファイルが見つかりません: $TargetFile"
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
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $TargetFile -ErrorAction Stop | Out-Null
    Write-Host "作成しました: $linkPath -> $TargetFile"

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
