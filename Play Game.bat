@echo off
title ARPG Test Game
cd /d "%~dp0"

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

rem --- First run only: install dependencies ---
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
echo  Starting the game - your browser will open automatically.
echo  Keep this window open while playing. Close it to quit.
echo.
call npm run dev -- --open
pause
