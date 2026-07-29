@echo off
cd /d "%~dp0workspace\backend"
echo Building backend...
call npm run build
if %errorlevel% neq 0 (
    echo BUILD FAILED
    pause
    exit /b %errorlevel%
)
echo Build complete. Run the startup script to start the backend.
pause
