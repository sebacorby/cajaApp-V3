@echo off
setlocal EnableExtensions EnableDelayedExpansion

if "%~1"=="" (
    echo Usage: kill-port.bat PORT
    exit /b 2
)

set "PORT=%~1"
for /f "delims=0123456789" %%A in ("%PORT%") do (
    echo ERROR: PORT must be numeric.
    exit /b 2
)

set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    set "FOUND=1"
    echo Stopping LISTENING process PID %%P on port %PORT%...
    taskkill /F /T /PID %%P
    if errorlevel 1 (
        echo ERROR: Could not stop PID %%P. Re-run this command from an elevated terminal if required.
        exit /b 1
    )
)

if "%FOUND%"=="0" (
    echo Port %PORT% has no LISTENING process.
    exit /b 0
)

netstat -ano -p tcp | findstr /R /C:":%PORT% .*LISTENING" >nul
if errorlevel 1 (
    echo Port %PORT% is free.
    exit /b 0
)

echo ERROR: Port %PORT% is still in use.
exit /b 1
