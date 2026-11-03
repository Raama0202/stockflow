@echo off
setlocal
title StockFlow - Inventory Management
cd /d "%~dp0"

echo.
echo   ==============================================
echo     StockFlow - SaaS Inventory Management MVP
echo   ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [ERROR] Node.js was not found.
  echo   Install Node.js 22.13 or newer from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)

node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  for /f %%v in ('node -v') do echo   [ERROR] Node.js %%v is too old. StockFlow needs Node.js 22.13 or newer.
  echo   Download the latest LTS from https://nodejs.org
  echo.
  pause
  exit /b 1
)
for /f %%v in ('node -v') do echo   [1/3] Node.js %%v detected.

set NEED_INSTALL=0
if not exist "node_modules\" set NEED_INSTALL=1
if "%NEED_INSTALL%"=="0" (
  call npm ls --silent >nul 2>nul
  if errorlevel 1 set NEED_INSTALL=1
)
if "%NEED_INSTALL%"=="1" (
  echo   [2/3] Installing dependencies - first run only, this can take a minute...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   [ERROR] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
) else (
  echo   [2/3] Dependencies already installed.
)

echo   [3/3] Building the web app...
call npm run build --silent
if errorlevel 1 (
  echo.
  echo   [ERROR] Frontend build failed. See the messages above.
  pause
  exit /b 1
)

set OPEN_BROWSER=1
node --disable-warning=ExperimentalWarning server\index.js
if "%ERRORLEVEL%"=="3" (
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo.
echo   StockFlow has stopped.
pause
endlocal
