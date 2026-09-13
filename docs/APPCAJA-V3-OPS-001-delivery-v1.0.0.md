# APPCAJA-V3-OPS-001 — Delivery Report

## Script Location

```
I:\cajaApp-V3\start-cajaapp.ps1
```

## Commands Detected in package.json

### Backend (`I:\cajaApp-V3\workspace\backend\package.json`)

```json
"scripts": {
  "dev": "tsx watch src/main.ts",
  ...
}
```

**Command used**: `npm run dev`

### Frontend (`I:\cajaApp-V3\workspace\frontend\package.json`)

```json
"scripts": {
  "dev": "next dev -p 3000 2>&1 | tee dev.log",
  ...
  "start": "NODE_ENV=production bun .next/standalone/server.js 2>&1 | tee server.log",
  ...
}
```

**Problem**: The `dev` script uses `tee dev.log`, a Unix command not available on Windows. This causes `npm run dev` to fail immediately.

**Command used**: `npx next dev -p 3000`

This invokes Next.js directly via npx without the `| tee` pipe. No modification to `package.json` was made.

---

## Final Script Code

```powershell
[CmdletBinding()]
param(
    [int]$BackendPort = 11436,
    [int]$FrontendPort = 3000,
    [int]$StartupTimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDirectory = Join-Path $ProjectRoot "workspace\backend"
$FrontendDirectory = Join-Path $ProjectRoot "workspace\frontend"

$BackendHealthUrl = "http://localhost:$BackendPort/health"
$FrontendUrl = "http://localhost:$FrontendPort"

$BackendStartCommand = "npm run dev"
$FrontendStartCommand = "npx next dev -p 3000"

function Write-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-DirectoryExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw "$Description no encontrado: $Path"
    }
}

function Get-ListeningProcessIds {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $connections = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue

    if (-not $connections) {
        return @()
    }

    return @(
        $connections |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -gt 0 }
    )
}

function Stop-ProcessesListeningOnPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,

        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    $processIds = @(Get-ListeningProcessIds -Port $Port)

    if ($processIds.Count -eq 0) {
        Write-Host "${ServiceName}: no hay procesos escuchando en el puerto $Port."
        return
    }

    foreach ($processId in $processIds) {
        Write-Host (
            "${ServiceName}: finalizando PID $processId " +
            "y sus procesos hijos..."
        ) -ForegroundColor Yellow

        $taskKillResult = & taskkill.exe `
            /PID $processId `
            /T `
            /F 2>&1

        if ($LASTEXITCODE -ne 0) {
            throw (
                "No se pudo finalizar el PID $processId " +
                "del puerto $Port.`n$taskKillResult"
            )
        }

        $taskKillResult | ForEach-Object {
            Write-Host $_
        }
    }

    $deadline = (Get-Date).AddSeconds(15)

    do {
        Start-Sleep -Milliseconds 500
        $remainingProcessIds = @(Get-ListeningProcessIds -Port $Port)
    }
    while (
        $remainingProcessIds.Count -gt 0 -and
        (Get-Date) -lt $deadline
    )

    if ($remainingProcessIds.Count -gt 0) {
        throw (
            "${ServiceName} continua escuchando en el puerto $Port. " +
            "PIDs restantes: $($remainingProcessIds -join ', ')"
        )
    }

    Write-Host "${ServiceName} detenido correctamente." -ForegroundColor Green
}

function Start-ServiceWindow {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    $escapedDirectory = $WorkingDirectory.Replace("'", "''")

    $windowCommand = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location -LiteralPath '$escapedDirectory'
$Command
"@

    $process = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @(
            "-NoLogo",
            "-NoExit",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            $windowCommand
        ) `
        -WorkingDirectory $WorkingDirectory `
        -PassThru

    if (-not $process) {
        throw "No se pudo iniciar $Title."
    }

    Write-Host (
        "$Title iniciado. PID de consola: $($process.Id)"
    ) -ForegroundColor Green

    return $process
}

function Wait-ForHttpEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServiceName,

        [Parameter(Mandatory = $true)]
        [string]$Url,

        [Parameter(Mandatory = $true)]
        [int]$TimeoutSeconds
    )

    Write-Host (
        "Esperando que $ServiceName responda en $Url..."
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastErrorMessage = $null

    do {
        try {
            $response = Invoke-WebRequest `
                -Uri $Url `
                -UseBasicParsing `
                -TimeoutSec 5

            if (
                $response.StatusCode -ge 200 -and
                $response.StatusCode -lt 500
            ) {
                Write-Host (
                    "$ServiceName disponible. " +
                    "HTTP $($response.StatusCode)."
                ) -ForegroundColor Green

                return
            }
        }
        catch {
            $lastErrorMessage = $_.Exception.Message
        }

        Start-Sleep -Seconds 2
    }
    while ((Get-Date) -lt $deadline)

    throw (
        "$ServiceName no respondio dentro de " +
        "$TimeoutSeconds segundos. Ultimo error: " +
        "$lastErrorMessage"
    )
}

try {
    Write-Host ""
    Write-Host "CajaApp V3 - Inicio del entorno local" `
        -ForegroundColor Magenta

    Assert-DirectoryExists `
        -Path $BackendDirectory `
        -Description "Directorio backend"

    Assert-DirectoryExists `
        -Path $FrontendDirectory `
        -Description "Directorio frontend"

    Write-Step "Deteniendo instancias anteriores"

    Stop-ProcessesListeningOnPort `
        -Port $BackendPort `
        -ServiceName "Backend"

    Stop-ProcessesListeningOnPort `
        -Port $FrontendPort `
        -ServiceName "Frontend"

    Write-Step "Iniciando backend"

    $backendConsole = Start-ServiceWindow `
        -Title "CajaApp V3 - Backend" `
        -WorkingDirectory $BackendDirectory `
        -Command $BackendStartCommand

    Wait-ForHttpEndpoint `
        -ServiceName "Backend" `
        -Url $BackendHealthUrl `
        -TimeoutSeconds $StartupTimeoutSeconds

    Write-Step "Iniciando frontend"

    $frontendConsole = Start-ServiceWindow `
        -Title "CajaApp V3 - Frontend" `
        -WorkingDirectory $FrontendDirectory `
        -Command $FrontendStartCommand

    Wait-ForHttpEndpoint `
        -ServiceName "Frontend" `
        -Url $FrontendUrl `
        -TimeoutSeconds $StartupTimeoutSeconds

    Write-Step "Abriendo CajaApp V3"

    Start-Process $FrontendUrl

    Write-Host ""
    Write-Host "CajaApp V3 iniciada correctamente." `
        -ForegroundColor Green
    Write-Host "Frontend: $FrontendUrl"
    Write-Host "Backend:  http://localhost:$BackendPort"
    Write-Host "Ollama:   http://localhost:11434"
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "No se pudo iniciar CajaApp V3." `
        -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Presiona Enter para cerrar."
    exit 1
}
```

---

## Results — Run 1 (cold start)

```
CajaApp V3 - Inicio del entorno local

==> Deteniendo instancias anteriores
Backend: no hay procesos escuchando en el puerto 11436.
Frontend: no hay procesos escuchando en el puerto 3000.

==> Iniciando backend
CajaApp V3 - Backend iniciado. PID de consola: 28920
Esperando que Backend responda en http://localhost:11436/health...
Backend disponible. HTTP 200.

==> Iniciando frontend
CajaApp V3 - Frontend iniciado. PID de consola: 51148
Esperando que Frontend responda en http://localhost:3000...
Frontend disponible. HTTP 200.

==> Abriendo CajaApp V3

CajaApp V3 iniciada correctamente.
Frontend: http://localhost:3000
Backend:  http://localhost:11436
Ollama:   http://localhost:11434
```

**PIDs after Run 1**: Backend=47660, Frontend=2388

---

## Results — Run 2 (clean restart)

```
CajaApp V3 - Inicio del entorno local

==> Deteniendo instancias anteriores
Backend: finalizando PID 47660 y sus procesos hijos...
CORRECTO: el proceso con PID 47660 (proceso secundario de PID 8496) ha sido terminado.
Backend detenido correctamente.
Frontend: finalizando PID 2388 y sus procesos hijos...
CORRECTO: el proceso con PID 2388 (proceso secundario de PID 11536) ha sido terminado.
Frontend detenido correctamente.

==> Iniciando backend
CajaApp V3 - Backend iniciado. PID de consola: 46980
Esperando que Backend responda en http://localhost:11436/health...
Backend disponible. HTTP 200.

==> Iniciando frontend
CajaApp V3 - Frontend iniciado. PID de consola: 40304
Esperando que Frontend responda en http://localhost:3000...
Frontend disponible. HTTP 200.

==> Abriendo CajaApp V3

CajaApp V3 iniciada correctamente.
Frontend: http://localhost:3000
Backend:  http://localhost:11436
Ollama:   http://localhost:11434
```

**PIDs after Run 2**: Backend=48240, Frontend=40096

---

## Final Port & Process State

| Port  | Service | PID    | Status     |
|-------|---------|--------|------------|
| 11434 | Ollama  | 35100  | Listening (untouched) |
| 11436 | Backend | 48240  | Listening |
| 3000  | Frontend| 40096  | Listening |

**Ollama confirmation**: PID 35100 still listening on 11434 — was not touched throughout both runs.

---

## Known Issues

1. **`npm run dev` in frontend uses `tee`** — The frontend's `dev` script contains `| tee dev.log`, which is a Unix pipe command not available on Windows. This causes `npm run dev` to fail immediately on first execution. The script uses `npx next dev -p 3000` as a workaround, which achieves the same result without the log pipe. No changes were made to `package.json` since this is a Windows environment limitation, not a missing script.

2. **Health endpoint assumed** — The script calls `http://localhost:11436/health` to verify backend readiness. If the backend does not expose a `/health` route, this check will fail. The backend must have this endpoint operational.

3. **PowerShell variable scope with `:`** — Variables used in string interpolation with a trailing colon (e.g., `"$ServiceName: message"`) must use the `${ServiceName}:` syntax to avoid PowerShell interpreting the colon as a drive letter separator. This is a known PowerShell parsing quirk.

4. **Browser opens with `Start-Process $FrontendUrl`** — This uses the default browser. If a specific browser is required, the URL should be passed to that browser's executable path.
