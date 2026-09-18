@echo off
title Hollow Wake - Launcher
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

rem --- THE TERMINAL -----------------------------------------------------
rem  Player mode hands off to the desktop shell and CLOSES this window: the
rem  launcher's own log panel carries build and update output, so a launched
rem  game leaves no console behind. The launcher's Developer mode with its
rem  "Terminal window" toggle on (launcher.config.local.json: dev.developer
rem  and dev.console both true) keeps this window open so main-process
rem  output has somewhere to land. Read here, before the shell starts, so a
rem  toggle applies to the NEXT launch.
if not exist "launcher.config.local.json" goto :detach
findstr /R /C:"\"developer\": *true" "launcher.config.local.json" >nul 2>nul || goto :detach
findstr /R /C:"\"console\": *true" "launcher.config.local.json" >nul 2>nul || goto :detach
echo.
echo  Developer mode: keeping this terminal open (main-process output lands here).
echo.
call npx electron .
if errorlevel 1 pause
exit /b

:detach
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
    exit /b 0
)
echo  The desktop shell's binary is missing - falling back to npx (keeps this window).
call npx electron .
if errorlevel 1 pause
