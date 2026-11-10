@echo off
cd /d "%~dp0"
title REDLINE - Android Build
if not exist node_modules call npm install
if errorlevel 1 goto fail
echo Enter the PUBLIC HTTPS address hosting your REDLINE backend.
echo Example: https://play.teamtrader.co.za
echo IMPORTANT: This cannot be localhost, and assets must remain accessible.
set /p "VITE_PUBLIC_SERVER_URL=Server URL: "
if "%VITE_PUBLIC_SERVER_URL%"=="" (
 echo Android build cancelled: server URL is required.
 pause
 exit /b 1
)
if not exist android (
 call npx cap add android
 if errorlevel 1 goto fail
)
call npm run android:landscape
if errorlevel 1 goto fail
call npm run android:sync
if errorlevel 1 goto fail
call npm run android:open
if errorlevel 1 goto fail
exit /b 0
:fail
echo Build failed. Check Node.js, Android Studio and Android SDK installation.
pause
exit /b 1
