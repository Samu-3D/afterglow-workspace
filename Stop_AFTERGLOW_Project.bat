@echo off
title Stop AFTERGLOW / MOPAS Workspace
echo Stopping Vite / Node dev server...
taskkill /F /IM node.exe >nul 2>nul
echo Done.
pause
