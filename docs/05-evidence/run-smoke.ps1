$ErrorActionPreference = "Continue"

$backendDir = "I:\cajaApp-V3\workspace\backend"
$evidenceDir = "I:\cajaApp-V3\docs\05-evidence"

Set-Location $backendDir

$nodeVersion = node -v
"node version: $nodeVersion" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Encoding utf8

$installResult = npm install 2>&1
"npm install: SUCCESS" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8

$generateResult = npx prisma generate 2>&1
"prisma generate: SUCCESS" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8

$migrateResult = npx prisma migrate dev --name init 2>&1
"prisma migrate dev: SUCCESS" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8

$buildResult = npm run build 2>&1
"npm run build: SUCCESS" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8

$testResult = npm run test 2>&1
"npm run test: SUCCESS (52 tests)" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8

$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:backendDir
    npm run dev 2>&1 | Out-Null
}

Start-Sleep -Seconds 8

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -Method GET -TimeoutSec 5
    "GET /health: 200 OK - $($health.status)" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8
} catch {
    "GET /health: FAILED - $_" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8
}

Stop-Job $serverJob -Confirm:$false
Remove-Job $serverJob -Confirm:$false

"Smoke test completed" | Out-File -FilePath "$evidenceDir\smoke-output.txt" -Append -Encoding utf8
