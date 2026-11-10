@echo off
cd /d "%~dp0"
title REDLINE - All Cars and Maps Check
if not defined REDLINE_LOCAL_ASSET_DIR set "REDLINE_LOCAL_ASSET_DIR=C:\Users\elles\Downloads\Car Racing"
echo Scanning GLB models in "%REDLINE_LOCAL_ASSET_DIR%" and its subfolders...
echo.
node scripts/inspect-maps.mjs
if errorlevel 1 (
 echo.
 echo One or more files need attention. Check names and extraction folders above.
) else (
 echo.
 echo Model GLB headers passed. Road placement is checked next inside the game.
)
echo.
pause
