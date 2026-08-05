<#
.SYNOPSIS
    Installs NightLab, a local autonomous research lab.

.DESCRIPTION
    Run it the way it is meant to be run:

        irm https://get.nightlab.dev/install.ps1 | iex

    The script works out the platform, reads the release manifest, verifies what it downloaded
    against the digest the manifest states, and hands over to the lab's own `install`. Where a
    version goes and what ends up on PATH is decided by the lab itself, which is code that can be
    tested, rather than here.

    No administrator rights are needed: everything lands under your own profile.

.PARAMETER Version
    Install a named version instead of the current one.

.PARAMETER NoModifyPath
    Leave your PATH alone.
#>
[CmdletBinding()]
param(
    [string]$Version = $env:NIGHTLAB_VERSION,
    [switch]$NoModifyPath
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$BaseUrl = if ($env:NIGHTLAB_BASE_URL) { $env:NIGHTLAB_BASE_URL } else { 'https://get.nightlab.dev' }

function Write-Step([string]$Message) {
    Write-Host $Message
}

function Stop-Install([string]$Message) {
    Write-Host ''
    Write-Host "error: $Message" -ForegroundColor Red
    exit 1
}

# The platform names here are the ones the release is built and named for. Windows on ARM runs
# x64 builds through emulation, so it is served the same archive rather than refused.
function Get-Platform {
    $architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
    switch ($architecture) {
        'X64' { return 'windows-x64' }
        'Arm64' { return 'windows-x64' }
        default { Stop-Install "NightLab has no Windows build for $architecture." }
    }
}

function Get-Text([string]$Url) {
    try {
        return (Invoke-WebRequest -Uri $Url -UseBasicParsing).Content
    } catch {
        Stop-Install "Could not reach $Url"
    }
}

function Save-File([string]$Url, [string]$Destination) {
    try {
        Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
    } catch {
        Stop-Install "Could not download $Url"
    }
}

$platform = Get-Platform

if (-not $Version) {
    $Version = (Get-Text "$BaseUrl/latest").Trim()
    if (-not $Version) {
        Stop-Install "Could not read the current version from $BaseUrl/latest"
    }
}

Write-Step "NightLab $Version for $platform"

$manifest = Get-Text "$BaseUrl/$Version/manifest.json" | ConvertFrom-Json
$artifact = $manifest.artifacts.$platform
if (-not $artifact) {
    Stop-Install "This release has no build for $platform."
}
if ($artifact.sha256 -notmatch '^[0-9a-f]{64}$') {
    Stop-Install "The manifest states no usable digest for $platform, and nothing unverified is installed."
}

$workspace = Join-Path ([System.IO.Path]::GetTempPath()) ("nightlab-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workspace -Force | Out-Null

try {
    $archive = Join-Path $workspace $artifact.file
    Write-Step "downloading $($artifact.file)"
    Save-File "$BaseUrl/$Version/$($artifact.file)" $archive

    $actual = (Get-FileHash -Path $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $artifact.sha256) {
        Stop-Install @"
Checksum mismatch for $($artifact.file).
  expected  $($artifact.sha256)
  actual    $actual
Nothing was installed. This is worth reporting rather than retrying.
"@
    }

    $unpacked = Join-Path $workspace 'release'
    Expand-Archive -Path $archive -DestinationPath $unpacked -Force

    $executable = Join-Path $unpacked 'nightlab.exe'
    if (-not (Test-Path $executable)) {
        Stop-Install 'The archive holds no nightlab.exe.'
    }

    if ($NoModifyPath) {
        & $executable install --no-modify-path
    } else {
        & $executable install
    }
    if ($LASTEXITCODE -ne 0) {
        Stop-Install "The lab's own installer exited with $LASTEXITCODE."
    }
} finally {
    Remove-Item -Path $workspace -Recurse -Force -ErrorAction SilentlyContinue
}
