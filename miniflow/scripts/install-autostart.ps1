# Makes MiniFlow start automatically on login and run silently (no terminal
# window, no taskbar entry — just the tray dot). Also starts it right now.
#
# Run it with:
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1
#
# Undo any time with scripts\uninstall-autostart.ps1.

$ErrorActionPreference = "Stop"

# scripts\  ->  app dir is one level up.
$appDir = Split-Path -Parent $PSScriptRoot
$vbs = Join-Path $PSScriptRoot "miniflow-hidden-launch.vbs"

if (-not (Test-Path $vbs)) {
    throw "Launcher not found at $vbs — is this the right folder?"
}

$electronExe = Join-Path $appDir "node_modules\electron\dist\electron.exe"
if (-not (Test-Path $electronExe)) {
    throw "Electron isn't installed. Run 'npm install' in $appDir first."
}

# Drop a shortcut into the current user's Startup folder so Windows launches
# it at login. wscript.exe runs the .vbs, which starts Electron hidden.
$startup = [Environment]::GetFolderPath("Startup")
$shortcut = Join-Path $startup "MiniFlow.lnk"

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcut)
$sc.TargetPath = "wscript.exe"
$sc.Arguments = '"' + $vbs + '"'
$sc.WorkingDirectory = $appDir
$sc.WindowStyle = 7           # minimized/hidden
$sc.Description = "MiniFlow voice dictation"
$sc.Save()

Write-Host ""
Write-Host "Auto-start installed." -ForegroundColor Green
Write-Host "  Shortcut: $shortcut"
Write-Host "  Launches: $vbs (hidden)"

# Kill any copy already running (avoids the single-instance lock silently
# blocking the fresh one), then start hidden now.
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 400
Start-Process "wscript.exe" -ArgumentList ('"' + $vbs + '"')

Write-Host ""
Write-Host "MiniFlow is starting now — look for the tray dot (no window will open)." -ForegroundColor Green
Write-Host "It will now start by itself every time you log in." -ForegroundColor Green
Write-Host "To turn this off later: powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-autostart.ps1"
