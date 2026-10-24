@echo off
setlocal
title Hollow Wake - Local World Server
cd /d "%~dp0"
node "scripts\host-world.cjs" %*
if errorlevel 1 pause
