$feDir = "C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\workspace\frontend"
$nodeExe = "I:\Tools\node-v24.18.0-win-x64\node.exe"
$outLog = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\frontend-ipv4-startup.log"
$errLog = "C:\Users\javie\AppData\Local\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\evidence\frontend-ipv4-startup.err"
$cmd = "cmd /c cd /d `"$feDir`" ^&^& set PORT=11437 ^&^& set HOSTNAME=127.0.0.1 ^&^& set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:11436 ^&^& `"$nodeExe`" node_modules\next\dist\bin\next dev -p 11437 -H 127.0.0.1 > `"$outLog`" 2> `"$errLog`""
$proc = Start-Process cmd.exe -ArgumentList "/c",$cmd -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 15
if ($proc.HasExited) {
    "Frontend exited with code: $($proc.ExitCode)"
} else {
    "Frontend startup PID: $($proc.Id)"
}
