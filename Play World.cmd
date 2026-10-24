@echo off
setlocal
title Hollow Wake - Seamless World
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
    echo The desktop runtime is missing. Run npm install in this folder first.
    pause
    exit /b 1
)
rem The entry script selects the existing integration checkout and isolated saves.
rem Keep errors visible; the game itself uses the normal desktop launcher.
node "node_modules\electron\cli.js" "scripts\play-world.cjs" --play %*
if errorlevel 1 pause
