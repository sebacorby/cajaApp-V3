@echo off
set "FEDIR=C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\workspace\frontend"
set "NODEEXE=I:\Tools\node-v24.18.0-win-x64\node.exe"
set "OUTFILE=C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\order-ipv4.out.txt"
set "EXITFILE=C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\order-ipv4.exit"
cd /d "%FEDIR%"
set CAJAAPP_FRONTEND_BASE_URL=http://127.0.0.1:11437
set CAJAAPP_API_BASE_URL=http://127.0.0.1:11436
"%NODEEXE%" node_modules\@playwright\test\cli.js test --config=playwright.config.ts --reporter=list tests/month-close.spec.ts tests/ai-advisor.spec.ts > "%OUTFILE%" 2>&1
echo %ERRORLEVEL% > "%EXITFILE%"
