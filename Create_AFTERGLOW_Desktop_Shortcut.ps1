# Create Desktop Shortcut for AFTERGLOW / MOPAS Workspace
# Put this file inside your React/Vite project folder, next to package.json.
# Right-click it and choose "Run with PowerShell".

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatPath = Join-Path $ProjectDir "Open_AFTERGLOW_Project.bat"

if (!(Test-Path (Join-Path $ProjectDir "package.json"))) {
    Write-Host "ERROR: package.json was not found. Put this script inside your Vite project folder." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (!(Test-Path $BatPath)) {
    Write-Host "ERROR: Open_AFTERGLOW_Project.bat was not found in this folder." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "AFTERGLOW MOPAS Workspace.lnk"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatPath
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$Shortcut.Description = "Open AFTERGLOW / MOPAS Productivity Workspace"
$Shortcut.Save()

Write-Host ""
Write-Host "Desktop shortcut created successfully:" -ForegroundColor Green
Write-Host $ShortcutPath
Write-Host ""
Read-Host "Press Enter to exit"
