@echo off
cd /d "C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\workspace\frontend"
set CAJAAPP_FRONTEND_BASE_URL=http://127.0.0.1:11437
set CAJAAPP_API_BASE_URL=http://127.0.0.1:11436
I:\Tools\node-v24.18.0-win-x64\node.exe node_modules\@playwright\test\cli.js test --config=playwright.config.ts --reporter=list tests/ai-advisor.spec.ts
echo EXIT:%ERRORLEVEL% >> "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\focal-ipv4-run-1.exit"
