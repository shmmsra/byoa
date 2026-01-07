$ErrorActionPreference = "Stop"

$Repo = "shmmsra/byoa"
$InstallDir = "$env:LOCALAPPDATA\BYOAssistant"
$AppName = "BYOAssistant.exe"

Write-Host "Finding latest release..."
try {
    $LatestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
    $LatestReleaseUrl = $LatestRelease.assets | Where-Object { $_.name -like "byoa-windows-*-app.zip" } | Select-Object -ExpandProperty browser_download_url -First 1
} catch {
    Write-Error "Failed to fetch release info: $_"
    exit 1
}

if (-not $LatestReleaseUrl) {
    Write-Error "Error: Could not find a release for Windows."
    exit 1
}

Write-Host "Found release artifact: $LatestReleaseUrl"
Write-Host "Downloading..."
$TempZip = "$env:TEMP\byoa_install.zip"
try {
    Invoke-WebRequest -Uri $LatestReleaseUrl -OutFile $TempZip
} catch {
    Write-Error "Failed to download: $_"
    exit 1
}

Write-Host "Installing to $InstallDir..."
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Path $InstallDir | Out-Null

Write-Host "Extracting..."
Expand-Archive -Path $TempZip -DestinationPath $InstallDir -Force

Remove-Item -Path $TempZip

$ExePath = "$InstallDir\$AppName"
if (Test-Path $ExePath) {
    Write-Host "Installation complete! Installed to: $InstallDir"
    Write-Host "You can run the app from: $ExePath"
} else {
    Write-Error "App executable not found after extraction. Installation may have failed."
    exit 1
}
