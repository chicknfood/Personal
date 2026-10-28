@echo off
cd /d "%~dp0"

echo ===================================================
echo   Math Champions - Multiplication Trainer
echo ===================================================

where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  if not exist "node_modules\" (
    echo First-time setup: Installing packages...
    call npm install
  )
  echo Starting Multiplication Trainer and opening your browser...
  call npm start
) else (
  if exist "standalone.html" (
    echo Opening standalone version in your default web browser...
    start "" "standalone.html"
  ) else (
    echo Node.js was not found. Please install Node.js from https://nodejs.org/
    pause
  )
)
