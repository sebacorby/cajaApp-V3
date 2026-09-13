[CmdletBinding()]
param(
    [int]$BackendPort = 11436,
    [int]$FrontendPort = 11437,
    [int]$StartupTimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDirectory = Join-Path $ProjectRoot "workspace\backend"
$FrontendDirectory = Join-Path $ProjectRoot "workspace\frontend"
$BackendHealthUrl = "http://127.0.0.1:$BackendPort/health"
$FrontendUrl = "http://127.0.0.1:$FrontendPort"
$ApiBaseUrl = "http://127.0.0.1:$BackendPort"
$BackendLogPath = Join-Path $env:TEMP "cajaapp-backend.log"
$FrontendLogPath = Join-Path $env:TEMP "cajaapp-frontend.log"

function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-DirectoryExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw "$Description no encontrado: $Path"
    }
}

function Assert-RequiredNodeVersion {
    param(
        [string]$PreferredNodeHome = "I:\Tools\node-v24.18.0-win-x64"
    )

    $requiredNodeVersion = "v24.18.0"
    $chosenNode = $null
    $chosenSource = $null

    # 1) Ubicacion preferida conocida
    if (-not [string]::IsNullOrWhiteSpace($PreferredNodeHome)) {
        $preferredNode = Join-Path $PreferredNodeHome "node.exe"
        if (Test-Path -LiteralPath $preferredNode -PathType Leaf) {
            $version = (& $preferredNode --version 2>&1).Trim()
            if ($LASTEXITCODE -eq 0 -and $version -eq $requiredNodeVersion) {
                $chosenNode = $preferredNode
                $chosenSource = "PreferredNodeHome"
            }
        }
    }

    # 2) Fallback: recorrer `where.exe node` buscando v24.18.0
    if (-not $chosenNode) {
        $candidates = @(& where.exe node 2>&1 | Where-Object { $_ -and ($_ -match '\.exe\s*$') })
        foreach ($candidate in $candidates) {
            $version = (& $candidate --version 2>&1).Trim()
            if ($LASTEXITCODE -eq 0 -and $version -eq $requiredNodeVersion) {
                $chosenNode = $candidate
                $chosenSource = "where.exe"
                break
            }
        }
    }

    if (-not $chosenNode) {
        throw "CajaApp V3 requiere Node.js $requiredNodeVersion (node-v24.18.0-win-x64). No se encontro un node.exe con esa version en '$PreferredNodeHome' ni entre los resultados de 'where.exe node'."
    }

    # 3) Forzar que el directorio del node elegido quede primero en PATH,
    #    para que `npm`, `tsx` y todo subproceso hereden la misma version.
    $nodeDir = Split-Path -Parent $chosenNode
    $currentFirst = ($env:Path -split ';' | Select-Object -First 1).TrimEnd('\')
    if ($currentFirst -ne $nodeDir.TrimEnd('\')) {
        $env:Path = "$nodeDir;$env:Path"
    }

    $nodeVersion = (& $chosenNode --version 2>&1).Trim()
    Write-Host "Node.js validado: $nodeVersion en $chosenNode (fuente: $chosenSource)" -ForegroundColor Green
}

function Invoke-PythonProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ArgumentList = @()
    )

    $output = @(& $FilePath @ArgumentList 2>&1)
    return [pscustomobject]@{
        ExitCode = [int]$LASTEXITCODE
        Output = ($output -join "`n")
    }
}

function Resolve-PythonRuntime {
    $requirementsPath = Join-Path $BackendDirectory "python\requirements.txt"
    if (-not (Test-Path -LiteralPath $requirementsPath -PathType Leaf)) {
        throw "requirements.txt de extracción PDF no encontrado: $requirementsPath"
    }

    $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
    if ([string]::IsNullOrWhiteSpace($localAppData)) {
        $localAppData = Join-Path $env:USERPROFILE "AppData\Local"
    }

    $runtimeDirectory = Join-Path $localAppData "CajaAppV3\runtime\python"
    $venvDirectory = Join-Path $runtimeDirectory ".venv"
    $venvPython = Join-Path $venvDirectory "Scripts\python.exe"
    $stampPath = Join-Path $runtimeDirectory "runtime-state.json"
    $requirementsHash = (Get-FileHash -LiteralPath $requirementsPath -Algorithm SHA256).Hash.ToUpperInvariant()

    $candidatePaths = New-Object 'System.Collections.Generic.List[string]'
    if (Test-Path -LiteralPath $venvPython -PathType Leaf) {
        [void]$candidatePaths.Add($venvPython)
    }

    foreach ($launcher in @(& where.exe py 2>$null | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
        foreach ($line in @(& $launcher -0p 2>$null)) {
            if ($line -match '([A-Za-z]:\\.+?python(?:\.exe)?)\s*$') {
                [void]$candidatePaths.Add($Matches[1].Trim())
            }
        }
    }
    foreach ($candidate in @(& where.exe python 2>$null | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
        [void]$candidatePaths.Add($candidate.Trim())
    }

    $compatible = @()
    foreach ($candidate in @($candidatePaths | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $versionResult = Invoke-PythonProcess -FilePath $candidate -ArgumentList @("--version")
        if ($versionResult.ExitCode -eq 0 -and $versionResult.Output -match 'Python\s+(\d+)\.(\d+)\.(\d+)') {
            $version = [version]"$($Matches[1]).$($Matches[2]).$($Matches[3])"
            if ($version.Major -eq 3 -and $version.Minor -ge 11 -and $version.Minor -lt 15) {
                $compatible += [pscustomobject]@{ Path = $candidate; Version = $version }
            }
        }
    }

    $basePython = $compatible |
        Where-Object { $_.Path -ne $venvPython } |
        Sort-Object Version -Descending |
        Select-Object -First 1

    $created = $false
    if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
        if (-not $basePython) {
            throw "CajaApp necesita Python Windows x64 entre 3.11 y 3.14 para procesar PDFs."
        }
        New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
        $venvResult = Invoke-PythonProcess -FilePath $basePython.Path -ArgumentList @("-m", "venv", $venvDirectory)
        if ($venvResult.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
            throw "No se pudo crear el runtime Python local de CajaApp. $($venvResult.Output)"
        }
        $created = $true
    }

    $stamp = $null
    if (Test-Path -LiteralPath $stampPath -PathType Leaf) {
        try { $stamp = Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json } catch { $stamp = $null }
    }

    $importCheck = Invoke-PythonProcess -FilePath $venvPython -ArgumentList @("-c", "import pdfplumber; print(pdfplumber.__version__)")
    $stampMatches = $stamp -and ([string]$stamp.requirementsSha256 -eq $requirementsHash)
    $installed = $false
    if (-not $stampMatches -or $importCheck.ExitCode -ne 0) {
        $pipResult = Invoke-PythonProcess -FilePath $venvPython -ArgumentList @("-m", "pip", "install", "--disable-pip-version-check", "-r", $requirementsPath)
        if ($pipResult.ExitCode -ne 0) {
            throw "No se pudieron instalar las dependencias Python de CajaApp. $($pipResult.Output)"
        }
        $installed = $true
        $importCheck = Invoke-PythonProcess -FilePath $venvPython -ArgumentList @("-c", "import pdfplumber; print(pdfplumber.__version__)")
    }
    if ($importCheck.ExitCode -ne 0) {
        throw "pdfplumber no pudo cargarse. $($importCheck.Output)"
    }

    $pythonVersion = (Invoke-PythonProcess -FilePath $venvPython -ArgumentList @("--version")).Output.Trim()
    $state = [ordered]@{
        pythonExecutable = $venvPython
        pythonVersion = $pythonVersion
        pdfplumberVersion = $importCheck.Output.Trim()
        requirementsSha256 = $requirementsHash
        created = $created
        dependenciesInstalled = $installed
        updatedAt = (Get-Date).ToString("o")
    }
    New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
    [IO.File]::WriteAllText($stampPath, ($state | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))
    return [pscustomobject]$state
}


function Invoke-NpmStep {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$Description
    )

    Write-Step $Description
    Push-Location $WorkingDirectory
    try {
        & cmd.exe /d /s /c $Command
        if ($LASTEXITCODE -ne 0) {
            throw "$Description fallo con codigo $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Backup-SqliteDatabase {
    param([Parameter(Mandatory = $true)][string]$BackendPath)

    $envFile = Join-Path $BackendPath ".env"
    if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
        Write-Host "No existe .env; no hay una DATABASE_URL local para respaldar." -ForegroundColor Yellow
        return
    }

    $databaseLine = Get-Content -LiteralPath $envFile |
        Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
        Select-Object -First 1

    if (-not $databaseLine) {
        Write-Host "DATABASE_URL no esta definida; se omite el respaldo SQLite." -ForegroundColor Yellow
        return
    }

    $databaseUrl = ($databaseLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
    if (-not $databaseUrl.StartsWith("file:")) {
        Write-Host "DATABASE_URL no corresponde a SQLite; se omite el respaldo local." -ForegroundColor Yellow
        return
    }

    $databasePathValue = $databaseUrl.Substring(5)
    if ([System.IO.Path]::IsPathRooted($databasePathValue)) {
        $databasePath = $databasePathValue
    }
    else {
        $databasePath = Join-Path (Join-Path $BackendPath "prisma") $databasePathValue
        $databasePath = [System.IO.Path]::GetFullPath($databasePath)
    }

    if (-not (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
        Write-Host "La base SQLite todavia no existe; no hay nada que respaldar." -ForegroundColor Yellow
        return
    }

    $backupDirectory = Join-Path $env:TEMP "cajaapp-sqlite-backups"
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $databaseName = [System.IO.Path]::GetFileName($databasePath)
    $backupPath = Join-Path $backupDirectory "$timestamp-$databaseName"
    Copy-Item -LiteralPath $databasePath -Destination $backupPath -Force
    Write-Host "Respaldo SQLite creado: $backupPath" -ForegroundColor Green
}

function Get-ListeningProcessIds {
    param([Parameter(Mandatory = $true)][int]$Port)

    $connections = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue

    if (-not $connections) { return @() }

    return @(
        $connections |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -gt 0 }
    )
}

function Stop-ProcessesListeningOnPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][string]$ServiceName
    )

    $processIds = @(Get-ListeningProcessIds -Port $Port)
    if ($processIds.Count -eq 0) {
        Write-Host "${ServiceName}: no hay procesos escuchando en el puerto $Port."
        return
    }

    foreach ($processId in $processIds) {
        Write-Host "${ServiceName}: finalizando PID $processId y sus hijos..." -ForegroundColor Yellow
        $taskKillResult = & taskkill.exe /PID $processId /T /F 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "No se pudo finalizar el PID $processId del puerto $Port.`n$taskKillResult"
        }
        $taskKillResult | ForEach-Object { Write-Host $_ }
    }

    $deadline = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 500
        $remaining = @(Get-ListeningProcessIds -Port $Port)
    } while ($remaining.Count -gt 0 -and (Get-Date) -lt $deadline)

    if ($remaining.Count -gt 0) {
        throw "${ServiceName} continua escuchando en el puerto $Port. PIDs: $($remaining -join ', ')"
    }
}

function Start-ServiceWithLog {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$LogPath,
        [hashtable]$EnvironmentVariables = @{}
    )

    New-Item -ItemType File -Path $LogPath -Force | Out-Null

    $previousEnvironment = @{}
    foreach ($name in $EnvironmentVariables.Keys) {
        $previousEnvironment[$name] = [System.Environment]::GetEnvironmentVariable($name, "Process")
        [System.Environment]::SetEnvironmentVariable(
            $name,
            [string]$EnvironmentVariables[$name],
            "Process"
        )
    }

    try {
        $commandLine = "call $Command 1>`"$LogPath`" 2>&1"
        $serverProcess = Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList @("/d", "/s", "/c", $commandLine) `
            -WorkingDirectory $WorkingDirectory `
            -WindowStyle Hidden `
            -PassThru
    }
    finally {
        foreach ($name in $EnvironmentVariables.Keys) {
            $previousValue = $previousEnvironment[$name]
            if ($null -eq $previousValue) {
                [System.Environment]::SetEnvironmentVariable($name, $null, "Process")
            }
            else {
                [System.Environment]::SetEnvironmentVariable($name, $previousValue, "Process")
            }
        }
    }

    if (-not $serverProcess) {
        throw "No se pudo iniciar $Title."
    }

    # Norma CajaApp: iniciar primero el servidor y abrir despues una consola que siga su log.
    $escapedLogPath = $LogPath.Replace("'", "''")
    $escapedTitle = $Title.Replace("'", "''")
    $tailCommand = @"
`$Host.UI.RawUI.WindowTitle = '$escapedTitle'
Write-Host '$escapedTitle - PID servidor: $($serverProcess.Id)' -ForegroundColor Cyan
Write-Host 'Log: $escapedLogPath' -ForegroundColor DarkGray
Get-Content -LiteralPath '$escapedLogPath' -Wait
"@

    $logWindow = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @(
            "-NoLogo",
            "-NoExit",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            $tailCommand
        ) `
        -WorkingDirectory $WorkingDirectory `
        -PassThru

    if (-not $logWindow) {
        throw "$Title inicio, pero no se pudo abrir la consola de log."
    }

    Write-Host "$Title iniciado. PID servidor: $($serverProcess.Id). PID log: $($logWindow.Id)." -ForegroundColor Green
    return $serverProcess
}

function Wait-ForHttpEndpoint {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )

    Write-Host "Esperando que $ServiceName responda en $Url..."
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastErrorMessage = $null

    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Host "$ServiceName disponible. HTTP $($response.StatusCode)." -ForegroundColor Green
                return
            }
        }
        catch {
            $lastErrorMessage = $_.Exception.Message
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    throw "$ServiceName no respondio dentro de $TimeoutSeconds segundos. Ultimo error: $lastErrorMessage"
}

try {
    Write-Host ""
    Write-Host "CajaApp V3 - Inicio del entorno local" -ForegroundColor Magenta

    Assert-DirectoryExists -Path $BackendDirectory -Description "Directorio backend"
    Assert-DirectoryExists -Path $FrontendDirectory -Description "Directorio frontend"
    Assert-RequiredNodeVersion

    Write-Step "Preparando runtime Python para extracción PDF"
    $python = Resolve-PythonRuntime
    $env:PYTHON_EXECUTABLE = $python.pythonExecutable
    $env:NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl
    Write-Host "Python: $($python.pythonVersion)" -ForegroundColor Green
    Write-Host "pdfplumber: $($python.pdfplumberVersion)" -ForegroundColor Green

    Invoke-NpmStep `
        -WorkingDirectory $BackendDirectory `
        -Command "npm run prisma:generate" `
        -Description "Generando cliente Prisma"

    Write-Step "Respaldando SQLite antes de migrar"
    Backup-SqliteDatabase -BackendPath $BackendDirectory

    Invoke-NpmStep `
        -WorkingDirectory $BackendDirectory `
        -Command "npm run prisma:migrate:deploy" `
        -Description "Aplicando migraciones pendientes"

    Invoke-NpmStep `
        -WorkingDirectory $BackendDirectory `
        -Command "npm run build" `
        -Description "Compilando backend"

    Write-Step "Deteniendo instancias anteriores"
    Stop-ProcessesListeningOnPort -Port $BackendPort -ServiceName "Backend"
    Stop-ProcessesListeningOnPort -Port $FrontendPort -ServiceName "Frontend"

    Write-Step "Iniciando backend"
    $backendProcess = Start-ServiceWithLog `
        -Title "CajaApp V3 - Backend" `
        -WorkingDirectory $BackendDirectory `
        -Command "npm run dev" `
        -LogPath $BackendLogPath `
        -EnvironmentVariables @{
            PORT = "$BackendPort"
            PYTHON_EXECUTABLE = $python.pythonExecutable
        }

    Wait-ForHttpEndpoint `
        -ServiceName "Backend" `
        -Url $BackendHealthUrl `
        -TimeoutSeconds $StartupTimeoutSeconds

    Write-Step "Iniciando frontend"
    $frontendProcess = Start-ServiceWithLog `
        -Title "CajaApp V3 - Frontend" `
        -WorkingDirectory $FrontendDirectory `
        -Command "npm run dev -- -p $FrontendPort" `
        -LogPath $FrontendLogPath `
        -EnvironmentVariables @{ NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl }

    Wait-ForHttpEndpoint `
        -ServiceName "Frontend" `
        -Url $FrontendUrl `
        -TimeoutSeconds $StartupTimeoutSeconds

    Write-Step "Abriendo CajaApp V3"
    Start-Process $FrontendUrl

    Write-Host ""
    Write-Host "CajaApp V3 iniciada correctamente." -ForegroundColor Green
    Write-Host "Frontend: $FrontendUrl"
    Write-Host "Backend:  $ApiBaseUrl"
    Write-Host "Python:   $($python.pythonExecutable)"
    Write-Host "Ollama:   http://localhost:11434"
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "No se pudo iniciar CajaApp V3." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Presiona Enter para cerrar."
    exit 1
}
