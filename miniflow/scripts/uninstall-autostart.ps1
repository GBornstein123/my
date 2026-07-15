# Turns off MiniFlow auto-start and stops any running copy.
#
# Run it with:
#   powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-autostart.ps1

$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$shortcut = Join-Path $startup "MiniFlow.lnk"

if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "Auto-start removed ($shortcut)." -ForegroundColor Green
} else {
    Write-Host "No auto-start shortcut was installed." -ForegroundColor Yellow
}

# Stop any running instance so the tray dot goes away.
$running = Get-Process electron -ErrorAction SilentlyContinue
if ($running) {
    $running | Stop-Process -Force
    Write-Host "Stopped the running MiniFlow." -ForegroundColor Green
}

Write-Host "MiniFlow will no longer start on login."
Write-Host "You can still run it by hand any time with:  npm start"
