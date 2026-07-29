@echo off
setlocal

echo DEPRECATED: use scripts\kill-port.bat PORT for CajaApp services.
if "%~1"=="" (
    echo Usage: kill-ollama-port.bat PORT
    echo Example: kill-ollama-port.bat 11436
    exit /b 2
)

call "%~dp0kill-port.bat" "%~1"
exit /b %errorlevel%
