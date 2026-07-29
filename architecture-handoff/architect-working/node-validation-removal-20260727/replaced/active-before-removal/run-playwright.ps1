<#
.SYNOPSIS
    Ejecuta la suite completa de Playwright para CajaApp V3 y genera reporte.

.DESCRIPTION
    1. Valida que Node.js v24.18.0 esté disponible.
    2. Verifica que el ecosistema (backend:11436, frontend:3000) esté corriendo;
       si no, lo arranca automáticamente SIN rebuild (usa los artifacts existentes).
    3. Ejecuta: npx playwright test --project=chromium --workers=1 --retries=0 --trace=on
    4. Genera reporte HTML en playwright-report/ y lo abre al final.
    5. Guarda un log de ejecución con timestamp.
    6. LA VENTANA NO SE CIERRA AL TERMINAR — espera una tecla.

.NOTES
    - Requiere PowerShell 5.1+ o PowerShell 7.x
    - No modifica código, dependencias ni SQLite
    - Si hay un error, se muestra en pantalla y la ventana queda abierta
#>
[CmdletBinding()]
param(
    [string]$NodeHome = "I:\Tools\node-v24.18.0-win-x64",
    [string]$ProjectRoot = "I:\cajaApp-V3",
    [int]   $BackendPort  = 11436,
    [int]   $FrontendPort = 3000,
    [int]   $StartupTimeout = 60,
    [switch]$NoOpenReport
)

# No cerrar la ventana en errores — mostrar y continuar
$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Step {
    param([string]$Message)
    Write-Host "" 
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-KV {
    param([string]$Key, [string]$Value, [string]$Color = "DarkGray")
    Write-Host ("    {0,-18} {1}" -f "$Key`:", $Value) -ForegroundColor $Color
}

function Wait-HttpReady {
    param([string]$Url, [int]$TimeoutSeconds)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $attempts = 0
    while ((Get-Date) -lt $deadline) {
        $attempts++
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $attempts
            }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return 0
}

function Get-NodeVersion {
    param([string]$NodeExePath)
    $tmpFile = [System.IO.Path]::GetTempFileName()
    try {
        $proc = Start-Process -FilePath $NodeExePath -ArgumentList @("--version") `
            -RedirectStandardOutput $tmpFile -NoNewWindow -Wait -PassThru
        if ($proc.ExitCode -ne 0) { return $null }
        return (Get-Content -LiteralPath $tmpFile -Raw -ErrorAction SilentlyContinue).Trim()
    } finally {
        Remove-Item -LiteralPath $tmpFile -Force -ErrorAction SilentlyContinue
    }
}

function Pause-Script {
    Write-Host ""
    Write-Host "=============================================================" -ForegroundColor Yellow
    Write-Host "  Presiona ENTER para cerrar esta ventana..." -ForegroundColor Yellow
    Write-Host "=============================================================" -ForegroundColor Yellow
    $null = Read-Host
}

# ---------------------------------------------------------------------------
# Log global: todo lo que pasa en consola se duplica en un archivo
# ---------------------------------------------------------------------------
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $ProjectRoot "playwright-run-$timestamp.log"
Start-Transcript -Path $logFile -Append | Out-Null
Write-Host "Log guardado en: $logFile" -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# Ejecución principal con try/catch para capturar CUALQUIER error
# ---------------------------------------------------------------------------
try {
    # ---------------------------------------------------------------------------
    # Validación de entorno
    # ---------------------------------------------------------------------------
    $nodeExe = Join-Path $NodeHome "node.exe"
    if (-not (Test-Path -LiteralPath $nodeExe -PathType Leaf)) {
        throw "node.exe no encontrado en: $NodeHome"
    }
    $nodeVersion = Get-NodeVersion -NodeExePath $nodeExe
    if ($nodeVersion -ne "v24.18.0") {
        throw "Se requiere Node.js v24.18.0. Encontrado: $nodeVersion"
    }
    Write-Step "Entorno validado"
    Write-KV "node" "$nodeVersion  ($nodeExe)" -Color Green

    # Asegurar node/npm en PATH de este proceso
    $env:Path = "$NodeHome;$env:Path"

    # ---------------------------------------------------------------------------
    # Verificar / arrancar ecosistema
    # ---------------------------------------------------------------------------
    $backendDir  = Join-Path $ProjectRoot "workspace\backend"
    $frontendDir = Join-Path $ProjectRoot "workspace\frontend"
    $backendHealth = "http://127.0.0.1:$BackendPort/health"
    $frontendUrl   = "http://127.0.0.1:$FrontendPort"

    $backendUp = $false
    $frontendUp = $false

    try {
        $r = Invoke-WebRequest -Uri $backendHealth -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $backendUp = ($r.StatusCode -eq 200)
    } catch { }

    try {
        $r = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $frontendUp = ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
    } catch { }

    if (-not $backendUp) {
        Write-Step "Arrancando backend (node dist/main.js)"
        $env:PORT = "$BackendPort"
        $env:HOST = "127.0.0.1"
        $backendLog = Join-Path $env:TEMP "cajaapp-headless\backend.log"
        $backendErr  = Join-Path $env:TEMP "cajaapp-headless\backend.err.log"
        New-Item -ItemType File -Path $backendLog -Force | Out-Null
        New-Item -ItemType File -Path $backendErr  -Force | Out-Null
        $bProc = Start-Process -FilePath $nodeExe -ArgumentList @("dist/main.js") `
            -WorkingDirectory $backendDir `
            -RedirectStandardOutput $backendLog -RedirectStandardError $backendErr `
            -NoNewWindow -PassThru
        Write-KV "backend.pid" $bProc.Id
        $bWait = Wait-HttpReady -Url $backendHealth -TimeoutSeconds $StartupTimeout
        if ($bWait -eq 0) { throw "Backend no respondio en $StartupTimeout s" }
        Write-KV "backend.health" "OK en $bWait intento(s)" -Color Green
    }

    if (-not $frontendUp) {
        Write-Step "Arrancando frontend (node .next/standalone/server.js)"
        $env:PORT = "$FrontendPort"
        $env:HOSTNAME = "127.0.0.1"
        $env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:$BackendPort"
        $frontendLog = Join-Path $env:TEMP "cajaapp-headless\frontend.log"
        $frontendErr  = Join-Path $env:TEMP "cajaapp-headless\frontend.err.log"
        New-Item -ItemType File -Path $frontendLog -Force | Out-Null
        New-Item -ItemType File -Path $frontendErr  -Force | Out-Null
        $fProc = Start-Process -FilePath $nodeExe -ArgumentList @(".next/standalone/server.js") `
            -WorkingDirectory $frontendDir `
            -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErr `
            -NoNewWindow -PassThru
        Write-KV "frontend.pid" $fProc.Id
        $fWait = Wait-HttpReady -Url $frontendUrl -TimeoutSeconds $StartupTimeout
        if ($fWait -eq 0) { throw "Frontend no respondio en $StartupTimeout s" }
        Write-KV "frontend.ready" "OK en $fWait intento(s)" -Color Green
    }

    if ($backendUp -and $frontendUp) {
        Write-Step "Ecosistema ya esta corriendo"
    }

    # ---------------------------------------------------------------------------
    # Ejecutar Playwright (output en vivo en consola)
    # ---------------------------------------------------------------------------
    Write-Step "Ejecutando Playwright"
    Write-KV "comando" "npx playwright test --project=chromium --workers=1 --retries=0 --trace=on"
    Write-Host ""
    Write-Host "--- Output en vivo ---" -ForegroundColor Magenta

    Push-Location $frontendDir

    try {
        $env:Path = "$NodeHome;$env:Path"
        npx playwright test --project=chromium --workers=1 --retries=0 --trace=on 2>&1
        $ec = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "--- Fin de output en vivo ---" -ForegroundColor Magenta

    if ($ec -eq 0) {
        Write-Host "Playwright: PASS" -ForegroundColor Green
    } else {
        Write-Host "Playwright: FAIL (exit $ec)" -ForegroundColor Red
    }
    Write-KV "log" $logFile
    Write-KV "report" (Join-Path $frontendDir "playwright-report\index.html")

    # ---------------------------------------------------------------------------
    # Abrir reporte
    # ---------------------------------------------------------------------------
    $reportPath = Join-Path $frontendDir "playwright-report\index.html"
    if (-not $NoOpenReport -and (Test-Path -LiteralPath $reportPath)) {
        Write-Step "Abriendo reporte HTML"
        Start-Process $reportPath
    }
}
catch {
    # Cualquier error fatal llega aca — se muestra en pantalla y la ventana NO se cierra
    Write-Host ""
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host "  ERROR FATAL:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Stack trace:" -ForegroundColor DarkRed
    Write-Host "  $($_.ScriptStackTrace)" -ForegroundColor DarkRed
}
finally {
    # Siempre detener el transcript y pausar
    Stop-Transcript | Out-Null
    Write-Host ""
    Write-Step "Listo"
    Write-KV "log" $logFile
    Pause-Script
}
