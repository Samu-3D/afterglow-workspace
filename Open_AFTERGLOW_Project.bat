@echo off
title AFTERGLOW / MOPAS Workspace
setlocal

REM Keep this file inside your React/Vite project folder, next to package.json
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

if not exist "package.json" (
  echo ERROR: package.json was not found.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js / npm is not installed or not found in PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  call npm install
)

REM Open browser after a short delay, then run Vite dev server
start "" "http://localhost:5173"
call npm run dev

endlocal
