@echo off
setlocal EnableDelayedExpansion

REM Accept port as argument, default to 11434
set PORT=%1
if "%PORT%"=="" set PORT=11434

title Kill Processes on Port %PORT%

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo This script requires administrator privileges.
    echo Right-click and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Finding processes on port %PORT%...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
    echo Found LISTENING PID: %%a
    taskkill /F /PID %%a 2>nul
    if !errorLevel! equ 0 (
        echo   Killed PID %%a
    ) else (
        echo   Failed to kill PID %%a
    )
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr ESTABLISHED') do (
    echo Found ESTABLISHED PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Verifying port %PORT% is free...
netstat -ano | findstr :%PORT%
if %errorLevel% neq 0 (
    echo.
    echo SUCCESS: Port %PORT% is now free!
) else (
    echo.
    echo WARNING: Port %PORT% still has connections. Try closing the app from system tray.
)

echo.
pause
