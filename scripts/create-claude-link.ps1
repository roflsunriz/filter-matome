[CmdletBinding()]
param(
    [string]$TargetFileName = "AGENTS.md",
    [string]$LinkName = "CLAUDE.md",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath ".."))
$targetPath = Join-Path -Path $repositoryRoot -ChildPath $TargetFileName
$linkPath = Join-Path -Path $repositoryRoot -ChildPath $LinkName

if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
    throw "Target file not found: $targetPath"
}

if (Test-Path -LiteralPath $linkPath) {
    $existingItem = Get-Item -LiteralPath $linkPath -Force

    if ($existingItem.LinkType -eq "SymbolicLink") {
        $existingTarget = $existingItem.Target
        if ($existingTarget -is [array]) {
            $existingTarget = $existingTarget[0]
        }

        if ($existingTarget) {
            $resolvedExistingTarget = [System.IO.Path]::GetFullPath((Join-Path -Path $existingItem.Directory.FullName -ChildPath $existingTarget))
            if ($resolvedExistingTarget -eq $targetPath) {
                Write-Host "Symbolic link already exists: $linkPath -> $existingTarget"
                exit 0
            }
        }
    }

    if (-not $Force) {
        throw "Path already exists: $linkPath (use -Force to replace it)"
    }

    Remove-Item -LiteralPath $linkPath -Force -Recurse
}

$relativeTargetPath = [System.IO.Path]::GetRelativePath($repositoryRoot, $targetPath)
New-Item -ItemType SymbolicLink -Path $linkPath -Target $relativeTargetPath | Out-Null

Write-Host "Created symbolic link: $linkPath -> $relativeTargetPath"
