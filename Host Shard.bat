@echo off
title Hollow Wake - Shard (hosted world)
cd /d "%~dp0"

rem =====================================================================
rem  THE SHARD - hosts one world on this machine for other players.
rem  Players join from the game: Co-op (Beta) -> Join a Server ->
rem  ws://<this machine>:8787 (on the same PC: ws://localhost:8787).
rem  Close this window (or Ctrl-C) to stop; the world is saved first.
rem  Dials: docs/engine/shard.md (port, seed, --open, --ephemeral).
rem =====================================================================

rem --- Check that Node.js is installed ---
where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo  The shard needs Node.js, which isn't installed yet.
    echo  Opening the download page now - install the "LTS" version,
    echo  then double-click this launcher again.
    echo.
    start "" https://nodejs.org/
    pause
    exit /b 1
)

rem --- First run only: install dependencies ---
if not exist "node_modules" (
    echo Setting up - this only happens the first time...
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
echo  Standing the world up - keep this window open while others play.
echo  Every option after the launcher name is passed through, e.g.
echo    "Host Shard.bat" --port 8787 --open --seed 0x1234
echo.
call npm.cmd run shard -- --open %*
if errorlevel 1 (
    echo.
    echo  The shard stopped with an error - see the messages above.
    pause
)
