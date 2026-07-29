$feDir = "C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\workspace\frontend"
$nodeExe = "I:\Tools\node-v24.18.0-win-x64\node.exe"
$pwCli = "$feDir\node_modules\@playwright\test\cli.js"
$pwConfig = "$feDir\playwright.config.ts"
$outFile = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\focal-ipv4-run-1.out.txt"
$exitFile = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\focal-ipv4-run-1.exit"
$cmd = "cd /d `"$feDir`" ^&^& set CAJAAPP_FRONTEND_BASE_URL=http://127.0.0.1:11437 ^&^& set CAJAAPP_API_BASE_URL=http://127.0.0.1:11436 ^&^& `"$nodeExe`" `"$pwCli`" test --config=`"$pwConfig`" --reporter=list tests/ai-advisor.spec.ts > `"$outFile`" 2>&1 ^&^& echo %ERRORLEVEL% > `"$exitFile`""
$p = Start-Process cmd.exe -ArgumentList "/c",$cmd -PassThru -WindowStyle Hidden
$p.WaitForExit()
$exitCode = Get-Content $exitFile -Raw
"Focal IPv4 Run 1 exit: $exitCode"
