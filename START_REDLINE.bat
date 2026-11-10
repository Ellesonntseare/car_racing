@echo off
cd /d "%~dp0"
title REDLINE - Local Development
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 20 or later from https://nodejs.org/ and rerun this script.
 pause
 exit /b 1
)
if not exist node_modules (
 echo Installing game dependencies...
 call npm install
 if errorlevel 1 goto error
)
echo.
REM OPTIONAL FAST MODE: keep the downloaded GLB files on this PC and point to their folder.
REM This folder can contain Cars/, Maps/, Garage/ and other subfolders.
REM Edit it if you move your models to another location.
if not defined REDLINE_LOCAL_ASSET_DIR set "REDLINE_LOCAL_ASSET_DIR=%~dp0..\Car Racing"
REM Alternatively, if your Python folder server is already running on port 8000:
REM set "ASSET_ORIGIN=http://127.0.0.1:8000"
if not defined REDLINE_WEB_PORT set "REDLINE_WEB_PORT=5180"
echo REDLINE starts at http://localhost:%REDLINE_WEB_PORT%
start "" http://localhost:%REDLINE_WEB_PORT%
call npm run dev
pause
exit /b
:error
echo Installation failed. Verify your internet connection and Node.js version.
pause
exit /b 1
