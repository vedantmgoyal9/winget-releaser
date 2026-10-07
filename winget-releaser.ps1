#!/usr/bin/env pwsh

param(
    [string]$PackageIdentifier = $env:INPUT_IDENTIFIER,
    [string]$Version = $env:INPUT_VERSION,
    [string]$InstallersRegex = $env:INPUT_INSTALLERS_REGEX,
    [int]$MaxVersionsToKeep = $env:INPUT_MAX_VERSIONS_TO_KEEP,
    [string]$ReleaseRepository = $env:INPUT_RELEASE_REPOSITORY,
    [string]$ReleaseTag = $env:INPUT_RELEASE_TAG,
    [string]$ReleaseNotesUrl = $env:INPUT_RELEASE_NOTES_URL,
    [string]$RepositoryOwner = $env:INPUT_REPOSITORY_OWNER,
    [switch]$Test
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
# Ensures the PR URL from komac update is printed
# https://docs.rs/supports-hyperlinks/latest/supports_hyperlinks/#forcing-hyperlinks-in-tools-that-use-supports-hyperlinks
$env:FORCE_HYPERLINK = 0
# Fixes non-ASCII characters being garbled in logs when Tee-Object is used
[console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ($Test) {
    Write-Output "==> Setting up test environment variables"
    if (-not $env:GITHUB_TOKEN) {
        throw "Please provide a GITHUB_TOKEN environment variable."
    }
    if (-not $InstallersRegex) {
        $InstallersRegex = '.(exe|msi|msix|appx)(bundle){0,1}$'
    }
    $env:DRY_RUN = "true"
    $env:CI = "true"
    $env:GH_TOKEN = $env:GITHUB_TOKEN
}

# Check if at least one version of the package is already present in winget-pkgs repository
try {
    komac list-versions $PackageIdentifier | Out-Null
}
catch {
    Write-Output "::error::Package '$PackageIdentifier' does not exist in the winget-pkgs repository. Please add at least one version of the package to winget-pkgs before using this action."
    exit 1
}

# Check if max-versions-to-keep is valid
if ($MaxVersionsToKeep -lt 0) {
    Write-Output "::error::Invalid input: max-versions-to-keep should be a positive integer or unset to keep all versions."
    exit 1
}

# Get release information
Write-Output "==> Fetching release information from $RepositoryOwner/$ReleaseRepository at tag $ReleaseTag..."
$ReleaseInfo = gh api "repos/$RepositoryOwner/$ReleaseRepository/releases/tags/$ReleaseTag" | ConvertFrom-Json

if ([string]::IsNullOrEmpty($Version)) {
    $ResolvedVersion = $ReleaseInfo.tag_name -replace '^v'
}
else {
    $ResolvedVersion = $Version -replace '^v'
}

$Urls = ($ReleaseInfo.assets.Where({ $_.name -match $InstallersRegex }).browser_download_url)

if (-not $Urls) {
    Write-Output "::error::No release assets found matching installers-regex '$InstallersRegex' for $RepositoryOwner/$ReleaseRepository@$ReleaseTag."
    exit 1
}

Write-Output "==> Syncing fork with upstream..."
komac sync-fork

$KomacArgs = @('update', $PackageIdentifier, '--version', $ResolvedVersion, '--urls', $Urls, '--submit')

if ($MaxVersionsToKeep -eq 1) {
    $KomacArgs += '--replace'
}

if (-not [string]::IsNullOrEmpty($ReleaseNotesUrl)) {
    $KomacArgs += @('--release-notes-url', $ReleaseNotesUrl)
}

Write-Output "==> Running komac update..."
# Flatten nested URL array before joining
Write-Output "$ komac $(@($KomacArgs | ForEach-Object { $_ }) -Join " ")"
komac @KomacArgs | Tee-Object -Variable KomacOutput

if ($env:DRY_RUN -ne "true") {
    # The PR URL should always be the last line of output
    $PrUrl = $KomacOutput.Split("`n", [StringSplitOptions]::RemoveEmptyEntries) | Select-Object -Last 1
    Add-Content $env:GITHUB_OUTPUT -Value "pr-url=$PrUrl"
}

Write-Output "==> Cleaning up stale branches..."
komac cleanup --all

if (-not $MaxVersionsToKeep) {
    exit 0
}

# Remove previous versions w.r.t. max-versions-to-keep (if any)
Write-Output "==> Checking for versions to remove based on max-versions-to-keep ($MaxVersionsToKeep)..."

#[Issue #307] -NoEnumerate has been added so that $Versions does not get converted to a string, when only one version exists in winget-pkgs
$Versions = komac list-versions $PackageIdentifier --json | ConvertFrom-Json -NoEnumerate
$Reason = 'This version is older than what has been set in `max-versions-to-keep` by the publisher.'
# Calculate how many versions to keep (accounting for replaced version)
$VersionsToKeep = if ($MaxVersionsToKeep -eq 1) { 1 } else { $MaxVersionsToKeep - 1 }
$VersionsToDelete = $Versions | Select-Object -SkipLast $VersionsToKeep

if (-not $VersionsToDelete) {
    Write-Output "==> No versions to remove. All good :)"
    exit 0
}

Write-Output "==> Versions to be removed: $($VersionsToDelete -join ', ')"
foreach ($Ver in $VersionsToDelete) {
    Write-Output "==> Removing version: $Ver"
    if ($env:DRY_RUN -eq "true") {
        Write-Output "==> Skipping removal due to DRY_RUN being set."
        continue
    }
    komac remove $PackageIdentifier --version $Ver --reason "$Reason" --submit
}
