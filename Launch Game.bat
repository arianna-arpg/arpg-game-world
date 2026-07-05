@echo off
title ARPG Test Game - Launcher
cd /d "%~dp0"

rem =====================================================================
rem  DESKTOP LAUNCHER - the normal way to play.
rem  Opens the game's own window (no browser), shows the installed
rem  version, checks GitHub for updates, and can update+rebuild itself.
rem  ("Play Game.bat" remains the browser/dev-server mode.)
rem =====================================================================

rem --- Check that Node.js is installed ---
where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo  This game needs Node.js, which isn't installed yet.
    echo  Opening the download page now - install the "LTS" version,
    echo  then double-click this launcher again.
    echo.
    start "" https://nodejs.org/
    pause
    exit /b 1
)

rem --- First run only: install dependencies (includes the desktop shell) ---
if not exist "node_modules" (
    echo Setting up the game - this only happens the first time...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  Setup failed - see the messages above.
        pause
        exit /b 1
    )
)

echo.
echo  Opening the launcher... keep this window open while playing.
echo  (Build and update progress also appears here.)
echo.
call npx electron .
if errorlevel 1 pause
