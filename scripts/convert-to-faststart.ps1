<# 
.SYNOPSIS
  mp4 を faststart（moov 先頭）化して _faststart 付きで保存

.PARAMETER InputPath
  処理対象のファイルまたはフォルダのパス。 (既定: カレントディレクトリ)

.PARAMETER Recurse
  サブフォルダも再帰処理

.PARAMETER Overwrite
  出力ファイルが既に存在する場合に上書き

.PARAMETER DryRun
  実行せず予定だけ表示

.EXAMPLE
  # カレント配下を再帰で処理
  .\Convert-ToFaststart.ps1 -Recurse

.EXAMPLE
  # D:\videos を処理（上書き許可）
  .\Convert-ToFaststart.ps1 -InputPath D:\videos -Recurse -Overwrite
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
  [Parameter(Position=0)]
  [Alias('i','input')]
  [string]$InputPath = (Get-Location).Path,
  [Alias('r','recursive')]
  [switch]$Recurse,
  [Alias('o')]
  [switch]$Overwrite,
  [Alias('d')]
  [switch]$DryRun,
  [Alias('q','silent')]
  [switch]$Quiet,
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$AdditionalArgs = @()
)

# --- GNU 風オプションの補完 ---
if ($AdditionalArgs.Count -gt 0) {
  for ($i = 0; $i -lt $AdditionalArgs.Count; $i++) {
    $arg = $AdditionalArgs[$i]
    switch -Regex ($arg) {
      '^--recursive$' {
        $Recurse = $true
        continue
      }
      '^--no-recursive$' {
        $Recurse = $false
        continue
      }
      '^--overwrite$' {
        $Overwrite = $true
        continue
      }
      '^--no-overwrite$' {
        $Overwrite = $false
        continue
      }
      '^--dry-run$' {
        $DryRun = $true
        continue
      }
      '^--no-dry-run$' {
        $DryRun = $false
        continue
      }
      '^--quiet$' {
        $Quiet = $true
        continue
      }
      '^--no-quiet$' {
        $Quiet = $false
        continue
      }
      '^--input(?:=(.*))?$' {
        $value = $Matches[1]
        if (-not $value) {
          $i++
          if ($i -ge $AdditionalArgs.Count) {
            throw "引数 '--input' に値が指定されていません。"
          }
          $value = $AdditionalArgs[$i]
        }
        $InputPath = $value
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

# --- 前提チェック ---
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Error "ffmpeg が見つかりません。PATH を通すか、フルパス指定にしてください。"
  return 1
}

# --- 取得 ---
$searchOpt = @{ Path = $InputPath; Filter = '*.mp4'; File = $true }
if ($Recurse) { $searchOpt.Recurse = $true }

$files = Get-ChildItem @searchOpt | Sort-Object FullName
if (-not $files) {
  Write-Warning "対象の .mp4 が見つかりませんでした: $InputPath"
  return 0
}

# --- 進行 ---
$processed = 0
$skipped   = 0
$errors    = 0

foreach ($f in $files) {
  $dir  = $f.DirectoryName
  $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $out  = Join-Path $dir ($base + '_faststart' + $f.Extension)

  # すでに _faststart 付き or 同名出力がある場合
  $alreadyFaststartName = $f.BaseName.EndsWith('_faststart')
  if ($alreadyFaststartName) {
    Write-Verbose "名前的に faststart 済みと判断: $($f.FullName)"
    $skipped++; continue
  }
  if ((Test-Path -LiteralPath $out) -and (-not $Overwrite)) {
    Write-Verbose "出力が既に存在: $out  （-Overwrite で上書き可能）"
    $skipped++; continue
  }

  $cmd = @(
    '-hide_banner'
    '-y' # Overwrite は ffmpeg 側は常に -y。PowerShellで制御
    '-i', $f.FullName
    '-c', 'copy'                # 再エンコード無し
    '-movflags', '+faststart'   # moov を先頭へ
    $out
  )

  if ($DryRun) {
    Write-Host "[DRYRUN] ffmpeg $($cmd -join ' ')" -ForegroundColor Yellow
    $processed++; continue
  }

  if ($PSCmdlet.ShouldProcess($f.FullName, "to $out")) {
    # 既存出力は PowerShell 側で制御
    if ((Test-Path -LiteralPath $out) -and $Overwrite) {
      Remove-Item -LiteralPath $out -Force -ErrorAction SilentlyContinue
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName  = $ffmpeg.Source
    # ArgumentList は読み取り専用のコレクションなので Add で詰める
    foreach ($a in $cmd) { [void]$psi.ArgumentList.Add($a) }
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardOutput = $true
    $psi.UseShellExecute = $false

    $p = [System.Diagnostics.Process]::Start($psi)
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()

    if ($p.ExitCode -eq 0 -and (Test-Path -LiteralPath $out)) {
      # タイムスタンプ継承（任意）
      try {
        (Get-Item -LiteralPath $out).LastWriteTimeUtc = (Get-Item -LiteralPath $f.FullName).LastWriteTimeUtc
      } catch {}
      if (-not $Quiet) {
        Write-Host "OK  $($f.Name)  ->  $(Split-Path -Leaf $out)"
      }
      $processed++
    } else {
      Write-Host "NG  $($f.Name)" -ForegroundColor Red
      if ($stderr) { Write-Verbose $stderr }
      $errors++
    }
  }
}

Write-Host "`nDone. processed=$processed, skipped=$skipped, errors=$errors"
exit $errors
