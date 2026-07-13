#requires -Version 5.1

<#
.SYNOPSIS
NicoCache_nl の Java プロセスだけを特定して終了します。

.DESCRIPTION
java.exe / javaw.exe のプロセス名だけでは判定せず、コマンドラインに独立した
「-jar ...\NicoCache_nl.jar」引数があるプロセスを対象にします。

GUI 版では、NicoCache_nl が Windows の終了時に使用する WM_ENDSESSION を送り、
内部の正常終了処理を待ちます。タイムアウト後も同じプロセスが残っている場合は、
PID と指紋を再確認してから、既定値「いいえ」の対話確認を行います。

.PARAMETER ExitTimeoutSeconds
正常終了を待つ秒数です。NicoCache_nl 内部の終了待ちは既定で最大60秒のため、
このスクリプトでは既定値を65秒にしています。

.PARAMETER ListOnly
対象プロセスを表示するだけで、終了要求を送りません。

.PARAMETER SkipGuiShutdown
GUIウィンドウを使った正常終了要求を省略し、強制終了の判定へ進みます。
CUI版として起動している場合や、GUI操作を避けたい場合に使用します。

.PARAMETER Force
正常終了できなかった場合の対話確認を省略します。PID、作成時刻、コマンドラインの
指紋は、強制終了の直前にも再確認します。

.EXAMPLE
.\stop-nicocache.ps1

.EXAMPLE
.\stop-nicocache.ps1 -ListOnly

.EXAMPLE
.\stop-nicocache.ps1 -WhatIf

.EXAMPLE
.\stop-nicocache.ps1 -SkipGuiShutdown -Force
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [ValidateRange(1, 3600)]
    [int]$ExitTimeoutSeconds = 65,

    [switch]$ListOnly,

    [switch]$SkipGuiShutdown,

    [switch]$Force
)

Set-StrictMode -Version Latest

$nativeMethodsSource = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class FilterMatomeNicoCacheNativeMethods
{
    public delegate bool EnumWindowsProc(IntPtr windowHandle, IntPtr parameter);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(
        IntPtr windowHandle,
        out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(
        IntPtr windowHandle,
        StringBuilder text,
        int maximumCount);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(
        IntPtr windowHandle,
        StringBuilder text,
        int maximumCount);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr windowHandle,
        uint message,
        UIntPtr wordParameter,
        IntPtr longParameter,
        uint flags,
        uint timeoutMilliseconds,
        out UIntPtr result);
}
'@

if (-not ('FilterMatomeNicoCacheNativeMethods' -as [type])) {
    Add-Type -TypeDefinition $nativeMethodsSource
}

$nicoCacheJarPattern = '(?i)(?:^|\s)-jar\s+(?:"(?:[^"]*[\\/])?NicoCache_nl\.jar"|(?:[^\s"]*[\\/])?NicoCache_nl\.jar)(?=\s|$)'

function Test-NicoCacheFingerprint {
    param(
        [Parameter(Mandatory)]
        [Microsoft.Management.Infrastructure.CimInstance]$Process
    )

    if ($Process.Name -notin @('java.exe', 'javaw.exe')) {
        return $false
    }

    return [string]$Process.CommandLine -match $nicoCacheJarPattern
}

function Get-NicoCacheProcess {
    $processes = Get-CimInstance Win32_Process `
        -Filter "Name = 'java.exe' OR Name = 'javaw.exe'" `
        -ErrorAction Stop

    return @($processes | Where-Object { Test-NicoCacheFingerprint -Process $_ })
}

function Test-SameNicoCacheProcess {
    param(
        [Parameter(Mandatory)]
        [Microsoft.Management.Infrastructure.CimInstance]$OriginalProcess
    )

    $currentProcess = Get-CimInstance Win32_Process `
        -Filter "ProcessId = $($OriginalProcess.ProcessId)" `
        -ErrorAction SilentlyContinue

    if ($null -eq $currentProcess) {
        return $false
    }

    if (-not (Test-NicoCacheFingerprint -Process $currentProcess)) {
        return $false
    }

    return [string]$currentProcess.CreationDate -eq [string]$OriginalProcess.CreationDate
}

function Get-TopLevelWindow {
    param(
        [Parameter(Mandatory)]
        [uint32]$ProcessId
    )

    $targetProcessId = $ProcessId
    $windows = [System.Collections.Generic.List[object]]::new()
    $callback = [FilterMatomeNicoCacheNativeMethods+EnumWindowsProc] {
        param([IntPtr]$WindowHandle, [IntPtr]$Parameter)

        [void]$Parameter
        $windowProcessId = [uint32]0
        [void][FilterMatomeNicoCacheNativeMethods]::GetWindowThreadProcessId(
            $WindowHandle,
            [ref]$windowProcessId)

        if ($windowProcessId -eq $targetProcessId) {
            $title = [System.Text.StringBuilder]::new(512)
            $className = [System.Text.StringBuilder]::new(256)
            [void][FilterMatomeNicoCacheNativeMethods]::GetWindowText(
                $WindowHandle,
                $title,
                $title.Capacity)
            [void][FilterMatomeNicoCacheNativeMethods]::GetClassName(
                $WindowHandle,
                $className,
                $className.Capacity)

            $windows.Add([pscustomobject]@{
                    Handle    = $WindowHandle
                    ClassName = $className.ToString()
                    Title     = $title.ToString()
                })
        }

        return $true
    }

    [void][FilterMatomeNicoCacheNativeMethods]::EnumWindows(
        $callback,
        [IntPtr]::Zero)

    return @($windows)
}

function Send-NicoCacheShutdownMessage {
    param(
        [Parameter(Mandatory)]
        [uint32]$ProcessId
    )

    $logWindow = Get-TopLevelWindow -ProcessId $ProcessId |
        Where-Object {
            $_.ClassName -eq 'SunAwtFrame' -and
            $_.Title -match '^NicoCache_nl(?:$|\s|\()'
        } |
        Select-Object -First 1

    if ($null -eq $logWindow) {
        return [pscustomobject]@{
            Attempted = $false
            Detail    = '正常終了通知を受け取るNicoCache_nl GUIウィンドウが見つかりません。'
        }
    }

    $wmQueryEndSession = [uint32]0x0011
    $wmEndSession = [uint32]0x0016
    $sendMessageTimeoutFlags = [uint32]0x0003 # SMTO_BLOCK | SMTO_ABORTIFHUNG
    $messageTimeoutMilliseconds = [uint32]5000
    $messageResult = [UIntPtr]::Zero

    $queryResponse = [FilterMatomeNicoCacheNativeMethods]::SendMessageTimeout(
        $logWindow.Handle,
        $wmQueryEndSession,
        [UIntPtr]::Zero,
        [IntPtr]::Zero,
        $sendMessageTimeoutFlags,
        $messageTimeoutMilliseconds,
        [ref]$messageResult)

    if ($queryResponse -eq [IntPtr]::Zero -or $messageResult -eq [UIntPtr]::Zero) {
        return [pscustomobject]@{
            Attempted = $false
            Detail    = 'NicoCache_nl GUIが正常終了の問い合わせに応答しませんでした。'
        }
    }

    $messageResult = [UIntPtr]::Zero
    $endResponse = [FilterMatomeNicoCacheNativeMethods]::SendMessageTimeout(
        $logWindow.Handle,
        $wmEndSession,
        [UIntPtr]::new(1),
        [IntPtr]::Zero,
        $sendMessageTimeoutFlags,
        $messageTimeoutMilliseconds,
        [ref]$messageResult)

    if ($endResponse -eq [IntPtr]::Zero) {
        return [pscustomobject]@{
            Attempted = $true
            Detail    = 'NicoCache_nl GUIへの正常終了通知は応答待ちでタイムアウトしました。終了処理が継続している可能性があります。'
        }
    }

    return [pscustomobject]@{
        Attempted = $true
        Detail    = 'NicoCache_nlの内部shutdown処理へ正常終了を要求しました。'
    }
}

function Wait-ProcessExit {
    param(
        [Parameter(Mandatory)]
        [uint32]$ProcessId,

        [Parameter(Mandatory)]
        [int]$TimeoutSeconds
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        if ($null -eq (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
            return $true
        }

        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)

    return $null -eq (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Confirm-ForcedStop {
    param(
        [Parameter(Mandatory)]
        [Microsoft.Management.Infrastructure.CimInstance]$Process,

        [Parameter(Mandatory)]
        [string]$Reason
    )

    $caption = 'NicoCache_nlの強制終了確認'
    $message = @"
$Reason
PID $($Process.ProcessId) ($($Process.Name)) はまだ実行中です。
このPIDだけを Stop-Process -Force で強制終了しますか？
"@
    $choices = [System.Management.Automation.Host.ChoiceDescription[]]@(
        [System.Management.Automation.Host.ChoiceDescription]::new(
            '&Yes',
            '指紋を再確認して、このPIDだけを強制終了します。'),
        [System.Management.Automation.Host.ChoiceDescription]::new(
            '&No',
            '強制終了せずに残します。')
    )

    try {
        return $Host.UI.PromptForChoice($caption, $message, $choices, 1) -eq 0
    }
    catch {
        Write-Warning '対話確認を表示できないため、強制終了しません。'
        return $false
    }
}

try {
    $targets = @(Get-NicoCacheProcess)
}
catch {
    Write-Error "プロセス情報を取得できませんでした: $($_.Exception.Message)"
    return
}

if ($targets.Count -eq 0) {
    Write-Information `
        'NicoCache_nl.jar の指紋を持つ java/javaw プロセスは見つかりませんでした。' `
        -InformationAction Continue
    return
}

Write-Information `
    '次のNicoCache_nlプロセスを検出しました。' `
    -InformationAction Continue
$targetTable = $targets |
    Select-Object `
        @{Name = 'PID'; Expression = { $_.ProcessId } },
        Name,
        ExecutablePath,
        @{Name = 'Fingerprint'; Expression = { '-jar ...\NicoCache_nl.jar' } } |
    Format-Table -AutoSize |
    Out-String
Write-Information $targetTable.TrimEnd() -InformationAction Continue

if ($ListOnly) {
    return
}

$results = foreach ($target in $targets) {
    $processId = [uint32]$target.ProcessId
    $targetDescription = "PID $processId ($($target.Name), -jar NicoCache_nl.jar)"

    if (-not (Test-SameNicoCacheProcess -OriginalProcess $target)) {
        [pscustomobject]@{
            PID    = $processId
            Status = 'スキップ'
            Detail = '操作直前の再確認でプロセスが消失したか、指紋が変化しました。'
        }
        continue
    }

    if ($SkipGuiShutdown) {
        $shutdownRequest = [pscustomobject]@{
            Attempted = $false
            Detail    = 'SkipGuiShutdownの指定によりGUI経由の正常終了を省略しました。'
        }
    }
    else {
        if (-not $PSCmdlet.ShouldProcess(
                $targetDescription,
                'NicoCache_nlの正常終了通知を送信')) {
            [pscustomobject]@{
                PID    = $processId
                Status = '未実行'
                Detail = 'ShouldProcessにより終了操作を実行しませんでした。'
            }
            continue
        }

        $shutdownRequest = Send-NicoCacheShutdownMessage -ProcessId $processId
    }
    Write-Information `
        "PID ${processId}: $($shutdownRequest.Detail)" `
        -InformationAction Continue

    if ($shutdownRequest.Attempted) {
        Write-Information `
            "PID ${processId}: 最大${ExitTimeoutSeconds}秒、正常終了を待ちます。" `
            -InformationAction Continue
        if (Wait-ProcessExit `
                -ProcessId $processId `
                -TimeoutSeconds $ExitTimeoutSeconds) {
            [pscustomobject]@{
                PID    = $processId
                Status = '正常終了'
                Detail = 'NicoCache_nlの内部shutdown処理で終了しました。'
            }
            continue
        }
    }

    if (-not (Test-SameNicoCacheProcess -OriginalProcess $target)) {
        [pscustomobject]@{
            PID    = $processId
            Status = '終了済み'
            Detail = '強制終了の確認前に対象プロセスが終了しました。'
        }
        continue
    }

    $forceReason = if ($shutdownRequest.Attempted) {
        "正常終了要求から${ExitTimeoutSeconds}秒以内に終了しませんでした。"
    }
    else {
        $shutdownRequest.Detail
    }

    if ($WhatIfPreference) {
        [void]$PSCmdlet.ShouldProcess($targetDescription, 'PIDを指定して強制終了')
        [pscustomobject]@{
            PID    = $processId
            Status = '未実行'
            Detail = 'WhatIfにより強制終了を実行しませんでした。'
        }
        continue
    }

    if (-not $Force -and
        -not (Confirm-ForcedStop -Process $target -Reason $forceReason)) {
        [pscustomobject]@{
            PID    = $processId
            Status = '実行中'
            Detail = 'ユーザー確認により強制終了しませんでした。'
        }
        continue
    }

    if ($Force) {
        Write-Information `
            "PID ${processId}: Forceの指定により強制終了の対話確認を省略します。" `
            -InformationAction Continue
    }

    if (-not (Test-SameNicoCacheProcess -OriginalProcess $target)) {
        [pscustomobject]@{
            PID    = $processId
            Status = 'スキップ'
            Detail = '強制終了直前の再確認でプロセスが消失したか、指紋が変化しました。'
        }
        continue
    }

    if ($PSCmdlet.ShouldProcess($targetDescription, 'PIDを指定して強制終了')) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            if (Wait-ProcessExit -ProcessId $processId -TimeoutSeconds 5) {
                [pscustomobject]@{
                    PID    = $processId
                    Status = '強制終了'
                    Detail = '確認後、このPIDだけを強制終了しました。'
                }
            }
            else {
                [pscustomobject]@{
                    PID    = $processId
                    Status = '実行中'
                    Detail = 'Stop-Process -Force後もプロセスが残っています。'
                }
            }
        }
        catch {
            [pscustomobject]@{
                PID    = $processId
                Status = 'エラー'
                Detail = $_.Exception.Message
            }
        }
    }
}

if ($null -ne $results) {
    Write-Information '' -InformationAction Continue
    Write-Information '終了結果' -InformationAction Continue
    $resultTable = $results | Format-Table -AutoSize | Out-String
    Write-Information $resultTable.TrimEnd() -InformationAction Continue
}
