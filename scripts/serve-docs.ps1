[CmdletBinding()]
param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 8000,
    [switch]$SkipPrepare,
    [switch]$PrepareOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $SkipPrepare) {
    Write-Host "Preparing MkDocs sources..."
    python scripts/prepare_mkdocs_docs.py
}

if ($PrepareOnly) {
    Write-Host "Prepared MkDocs sources at .mkdocs-build/docs"
    exit 0
}

Write-Host "Starting MkDocs server on http://${HostName}:${Port}/"
mkdocs serve --dev-addr "${HostName}:${Port}"
