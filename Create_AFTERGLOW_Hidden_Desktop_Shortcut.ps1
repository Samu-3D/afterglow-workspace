# Create Hidden Desktop Shortcut for AFTERGLOW / MOPAS Workspace
# Put this file inside your React/Vite project folder, next to package.json.
# Right-click it and choose "Run with PowerShell".

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VbsPath = Join-Path $ProjectDir "Open_AFTERGLOW_Project_Hidden.vbs"
$BatPath = Join-Path $ProjectDir "Open_AFTERGLOW_Project.bat"

if (!(Test-Path (Join-Path $ProjectDir "package.json"))) {
    Write-Host "ERROR: package.json was not found. Put this script inside your Vite project folder." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (!(Test-Path $VbsPath)) {
    Write-Host "ERROR: Open_AFTERGLOW_Project_Hidden.vbs was not found in this folder." -ForegroundColor Red
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
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$VbsPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$Shortcut.Description = "Open AFTERGLOW / MOPAS Productivity Workspace hidden"
$Shortcut.Save()

Write-Host ""
Write-Host "Hidden desktop shortcut created successfully:" -ForegroundColor Green
Write-Host $ShortcutPath
Write-Host ""
Read-Host "Press Enter to exit"
