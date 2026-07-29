$backendDir = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\candidate\workspace\backend"
$nodeExe = "I:\Tools\node-v24.18.0-win-x64\node.exe"
$outLog = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\backend-ipv4-startup.log"
$errLog = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\backend-ipv4-startup.err"
Set-Location $backendDir
$env:NODE_ENV = "development"
$env:PORT = "11436"
$env:HOST = "127.0.0.1"
$p = Start-Process $nodeExe -ArgumentList "node_modules/tsx/dist/cli.mjs","src/main.ts" -NoNewWindow -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WorkingDirectory $backendDir
Start-Sleep -Seconds 10
if ($p.HasExited) {
    "Backend exited with code: $($p.ExitCode)"
} else {
    "Backend running with PID: $($p.Id)"
}
