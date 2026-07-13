# Sets up fully-offline transcription (PRD G4 local mode) on Windows:
# downloads the prebuilt whisper.cpp CLI and the base.en model, then points
# MiniFlow's settings.json at them.
#
# Run from PowerShell:  .\scripts\setup-local-mode.ps1
# Upgrade path (PRD §7): rerun with -Model small.en for better accuracy.

param(
    [string]$Model = "base.en",
    [string]$WhisperVersion = "v1.7.4"
)

$ErrorActionPreference = "Stop"

$installDir = Join-Path $env:LOCALAPPDATA "MiniFlow\whisper"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

# 1. whisper.cpp prebuilt Windows binary (CPU build; works everywhere)
$zipUrl = "https://github.com/ggerganov/whisper.cpp/releases/download/$WhisperVersion/whisper-bin-x64.zip"
$zipPath = Join-Path $installDir "whisper-bin.zip"
if (-not (Test-Path (Join-Path $installDir "whisper-cli.exe"))) {
    Write-Host "Downloading whisper.cpp $WhisperVersion..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $installDir -Force
    Remove-Item $zipPath
}
$binary = Get-ChildItem -Path $installDir -Recurse -Filter "whisper-cli.exe" |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $binary) {
    # Older releases name it main.exe
    $binary = Get-ChildItem -Path $installDir -Recurse -Filter "main.exe" |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $binary) { throw "Could not find whisper-cli.exe in the downloaded archive." }

# 2. ggml model
$modelFile = Join-Path $installDir "ggml-$Model.bin"
if (-not (Test-Path $modelFile)) {
    Write-Host "Downloading ggml-$Model model (~150 MB for base.en)..."
    Invoke-WebRequest `
        -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$Model.bin" `
        -OutFile $modelFile
}

# 3. Point MiniFlow's settings at both
$settingsDir = Join-Path $env:APPDATA "miniflow"
New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
$settingsPath = Join-Path $settingsDir "settings.json"
$settings = @{}
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json -AsHashtable
}
$settings.whisperBinaryPath = $binary
$settings.whisperModelPath = $modelFile
$settings | ConvertTo-Json -Depth 5 | Set-Content $settingsPath

Write-Host ""
Write-Host "Local mode ready:"
Write-Host "  binary: $binary"
Write-Host "  model:  $modelFile"
Write-Host "Flip the tray menu to 'Local (private)' — audio never leaves this PC."
