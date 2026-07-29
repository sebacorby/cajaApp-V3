@echo off
set "BACKENDDIR=C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\candidate\workspace\backend"
set "NODEEXE=I:\Tools\node-v24.18.0-win-x64\node.exe"
set "OUTFILE=C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\candidate-full-suite-ipv4.out.txt"
set "EXITFILE=C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\candidate-full-suite-ipv4.exit"
cd /d "%BACKENDDIR%"
set NODE_ENV=test
"%NODEEXE%" node_modules/vitest/vitest.mjs run --reporter=json > "%OUTFILE%" 2>&1
echo %ERRORLEVEL% > "%EXITFILE%"
