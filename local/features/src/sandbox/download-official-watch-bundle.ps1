[CmdletBinding()]
param(
    [Parameter()]
    [ValidatePattern('^https://www\.nicovideo\.jp/watch/[a-zA-Z0-9]+$')]
    [string]$WatchUrl = 'https://www.nicovideo.jp/watch/sm9'
)

$ErrorActionPreference = 'Stop'
$outputDirectory = Join-Path $PSScriptRoot 'official-watch-bundle'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$watchPath = Join-Path $outputDirectory 'watch-page.html'
Invoke-WebRequest -Uri $WatchUrl -UseBasicParsing -OutFile $watchPath
$html = Get-Content -Raw -LiteralPath $watchPath

$assetBase = 'https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/'
$assetNames = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)

foreach ($match in [regex]::Matches(
        $html,
        'https://resource\.video\.nimg\.jp/web/scripts/nvpc_next/assets/([^"''< ]+\.js)'
    )) {
    [void]$assetNames.Add($match.Groups[1].Value)
}

$manifestName = $assetNames |
    Where-Object { $_ -match '^manifest-[a-zA-Z0-9_-]+\.js$' } |
    Select-Object -First 1
if (-not $manifestName) {
    throw '視聴ページからmanifestを特定できませんでした。'
}

$manifestPath = Join-Path $outputDirectory $manifestName
Invoke-WebRequest -Uri ($assetBase + $manifestName) -UseBasicParsing -OutFile $manifestPath
$manifest = Get-Content -Raw -LiteralPath $manifestPath
$watchRoute = [regex]::Match(
    $manifest,
    '"routes/_web\.watch\.\$id\.\$":\{(?<route>.+?)\}(?=\},"url")'
)
if (-not $watchRoute.Success) {
    throw 'manifestからwatchルートを特定できませんでした。'
}

foreach ($match in [regex]::Matches(
        $watchRoute.Groups['route'].Value,
        '/assets/([^" ]+\.js)'
    )) {
    [void]$assetNames.Add($match.Groups[1].Value)
}

$pending = [System.Collections.Generic.Queue[string]]::new()
foreach ($assetName in $assetNames) {
    $pending.Enqueue($assetName)
}
$downloaded = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)

while ($pending.Count -gt 0) {
    $assetName = $pending.Dequeue()
    if (-not $downloaded.Add($assetName)) {
        continue
    }
    if ($assetName -notmatch '^[a-zA-Z0-9_.-]+\.js$') {
        throw "不正なアセット名を検出しました: $assetName"
    }

    $assetPath = Join-Path $outputDirectory $assetName
    if (-not (Test-Path -LiteralPath $assetPath)) {
        Invoke-WebRequest -Uri ($assetBase + $assetName) -UseBasicParsing -OutFile $assetPath
    }

    $assetSource = Get-Content -Raw -LiteralPath $assetPath
    foreach ($dependency in [regex]::Matches(
            $assetSource,
            '(?:from|import\()\s*["''`]\./(?<name>[a-zA-Z0-9_.-]+\.js)["''`]'
        )) {
        $dependencyName = $dependency.Groups['name'].Value
        if (-not $downloaded.Contains($dependencyName)) {
            $pending.Enqueue($dependencyName)
        }
    }
}

Write-Output ("取得完了: {0} JavaScript files -> {1}" -f $downloaded.Count, $outputDirectory)
