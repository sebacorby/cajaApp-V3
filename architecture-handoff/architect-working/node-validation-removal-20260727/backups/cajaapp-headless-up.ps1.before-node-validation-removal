[CmdletBinding()]
param(
    [switch]$Status,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Rebuild,
    [switch]$SkipMigrate,
    [switch]$JsonOnly,
    [int]$BackendPort = 11436,
    [int]$FrontendPort = 11437,
    [int]$StartupTimeoutSeconds = 180,
    [string]$LogDir = (Join-Path $env:TEMP "cajaapp-headless"),
    [string]$StateFile,
    [string]$NodeHome = "I:\Tools\node-v24.18.0-win-x64"
)


$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"


if ([string]::IsNullOrWhiteSpace($StateFile)) {
    $StateFile = Join-Path $LogDir "state.json"
}


$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDirectory = Join-Path $ProjectRoot "workspace\backend"
$FrontendDirectory = Join-Path $ProjectRoot "workspace\frontend"
$BackendHealthUrl = "http://127.0.0.1:$BackendPort/health"
$ApiBaseUrl = "http://127.0.0.1:$BackendPort"
$FrontendUrl = "http://127.0.0.1:$FrontendPort"
$BackendLogPath = Join-Path $LogDir "backend.log"
$BackendErrLogPath = Join-Path $LogDir "backend.err.log"
$FrontendLogPath = Join-Path $LogDir "frontend.log"
$FrontendErrLogPath = Join-Path $LogDir "frontend.err.log"
$RequiredNodeVersion = "v24.18.0"


$SystemDirectory = [Environment]::GetFolderPath("System")
if ([string]::IsNullOrWhiteSpace($SystemDirectory)) {
    $SystemDirectory = Join-Path $env:WINDIR "System32"
}
$CmdExe = Join-Path $SystemDirectory "cmd.exe"
$TaskKillExe = Join-Path $SystemDirectory "taskkill.exe"
$WhereExe = Join-Path $SystemDirectory "where.exe"


$script:NodeExe = $null
$script:NpmCmd = $null


function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Message)
    if (-not $JsonOnly) {
        Write-Host ""
        Write-Host "==> $Message" -ForegroundColor Cyan
    }
}


function Write-KeyValue {
    param(
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value
    )
    if (-not $JsonOnly) {
        Write-Host ("    {0,-15} {1}" -f ("${Key}:"), $Value)
    }
}


function ConvertTo-CompactJson {
    param([Parameter(Mandatory = $true)]$Value)
    return ($Value | ConvertTo-Json -Depth 10 -Compress)
}


function Write-JsonOutput {
    param([Parameter(Mandatory = $true)]$Value)
    [Console]::Out.WriteLine((ConvertTo-CompactJson -Value $Value))
}


function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Description,
        [switch]$Leaf
    )


    $pathType = if ($Leaf) { "Leaf" } else { "Container" }
    if (-not (Test-Path -LiteralPath $Path -PathType $pathType)) {
        throw "$Description no encontrado: $Path"
    }
}


function Invoke-CapturedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory
    )

    Assert-PathExists -Path $FilePath -Description "Ejecutable" -Leaf

    $stdoutPath = [IO.Path]::GetTempFileName()
    $stderrPath = [IO.Path]::GetTempFileName()
    $previousLocation = $null

    try {
        if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
            Assert-PathExists -Path $WorkingDirectory -Description "Directorio de trabajo"
            $previousLocation = (Get-Location).Path
            Set-Location -LiteralPath $WorkingDirectory
        }

        try {
            # El operador de invocación preserva cada elemento de ArgumentList como
            # un argumento independiente. Start-Process vuelve a serializar la lista
            # y rompe expresiones como Python `-c "import ..."` en Windows PowerShell.
            # -ErrorAction SilentlyContinue evita que $ErrorActionPreference = "Stop"
            # convierta stderr de comandos nativos en excepciones-terminantes.
            & $FilePath @ArgumentList 1> $stdoutPath 2> $stderrPath
            $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
        }
        finally {
            if ($previousLocation) {
                Set-Location -LiteralPath $previousLocation
            }
        }

        $stdout = if (Test-Path -LiteralPath $stdoutPath) {
            [string](Get-Content -LiteralPath $stdoutPath -Raw -ErrorAction SilentlyContinue)
        } else { "" }
        $stderr = if (Test-Path -LiteralPath $stderrPath) {
            [string](Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue)
        } else { "" }

        return [pscustomobject]@{
            ExitCode = $exitCode
            StdOut = $stdout
            StdErr = $stderr
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
    }
}


function Resolve-NodeEnvironment {
    $chosenNode = $null
    $chosenSource = $null


    $preferredNode = Join-Path $NodeHome "node.exe"
    if (Test-Path -LiteralPath $preferredNode -PathType Leaf) {
        $result = Invoke-CapturedProcess -FilePath $preferredNode -ArgumentList @("--version")
        $version = ([string]$result.StdOut).Trim()
        if ($result.ExitCode -eq 0 -and $version -eq $RequiredNodeVersion) {
            $chosenNode = $preferredNode
            $chosenSource = "NodeHome"
        }
    }


    if (-not $chosenNode -and (Test-Path -LiteralPath $WhereExe -PathType Leaf)) {
        $whereResult = Invoke-CapturedProcess -FilePath $WhereExe -ArgumentList @("node")
        if ($whereResult.ExitCode -eq 0) {
            $candidates = @(
                ([string]$whereResult.StdOut) -split "`r?`n" |
                    ForEach-Object { $_.Trim() } |
                    Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path -LiteralPath $_ -PathType Leaf) }
            )
            foreach ($candidate in $candidates) {
                $result = Invoke-CapturedProcess -FilePath $candidate -ArgumentList @("--version")
                $version = ([string]$result.StdOut).Trim()
                if ($result.ExitCode -eq 0 -and $version -eq $RequiredNodeVersion) {
                    $chosenNode = $candidate
                    $chosenSource = "where.exe"
                    break
                }
            }
        }
    }


    if (-not $chosenNode) {
        throw "CajaApp V3 requiere Node.js exacto $RequiredNodeVersion. No se encontró un node.exe válido en '$NodeHome' ni en PATH."
    }


    $nodeDirectory = Split-Path -Parent $chosenNode
    $npmCmd = Join-Path $nodeDirectory "npm.cmd"
    Assert-PathExists -Path $npmCmd -Description "npm.cmd junto al Node requerido" -Leaf


    $pathEntries = @($env:Path -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($pathEntries.Count -eq 0 -or $pathEntries[0].TrimEnd("\") -ne $nodeDirectory.TrimEnd("\")) {
        $env:Path = "$nodeDirectory;$env:Path"
    }


    $finalCheck = Invoke-CapturedProcess -FilePath $chosenNode -ArgumentList @("--version")
    $nodeVersion = ([string]$finalCheck.StdOut).Trim()
    if ($finalCheck.ExitCode -ne 0 -or $nodeVersion -ne $RequiredNodeVersion) {
        throw "Node.js no pudo validarse después de configurar PATH. Esperado: $RequiredNodeVersion. Observado: '$nodeVersion'."
    }


    $script:NodeExe = $chosenNode
    $script:NpmCmd = $npmCmd


    return [pscustomobject]@{
        Version = $nodeVersion
        Path = $chosenNode
        NpmPath = $npmCmd
        Source = $chosenSource
    }
}


function Resolve-PythonRuntime {
    $requirementsPath = Join-Path $BackendDirectory "python\requirements.txt"
    Assert-PathExists -Path $requirementsPath -Description "requirements.txt de extracción PDF" -Leaf

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
        $venvVersionCheck = Invoke-CapturedProcess -FilePath $venvPython -ArgumentList @("--version")
        $venvVersionText = (([string]$venvVersionCheck.StdOut) + " " + ([string]$venvVersionCheck.StdErr)).Trim()
        if ($venvVersionCheck.ExitCode -eq 0 -and $venvVersionText -match 'Python\s+(\d+)\.(\d+)\.(\d+)') {
            $venvVersion = [version]"$($Matches[1]).$($Matches[2]).$($Matches[3])"
            if ($venvVersion.Major -eq 3 -and $venvVersion.Minor -ge 11 -and $venvVersion.Minor -lt 15) {
                [void]$candidatePaths.Add($venvPython)
            }
        }
    }

    if ($candidatePaths.Count -eq 0 -and (Test-Path -LiteralPath $WhereExe -PathType Leaf)) {
        $pyWhere = Invoke-CapturedProcess -FilePath $WhereExe -ArgumentList @("py")
        foreach ($launcher in @(([string]$pyWhere.StdOut) -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
            if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { continue }
            $listResult = Invoke-CapturedProcess -FilePath $launcher -ArgumentList @("-0p")
            foreach ($line in @(([string]$listResult.StdOut) -split "`r?`n")) {
                if ($line -match '([A-Za-z]:\\.+?python(?:\.exe)?)\s*$') {
                    $pythonPath = $Matches[1].Trim()
                    if ($pythonPath -notmatch '\\Microsoft\\WindowsApps\\') {
                        [void]$candidatePaths.Add($pythonPath)
                    }
                }
            }
        }

        $pythonWhere = Invoke-CapturedProcess -FilePath $WhereExe -ArgumentList @("python")
        foreach ($candidate in @(([string]$pythonWhere.StdOut) -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
            $trimmed = $candidate.Trim()
            if ($trimmed -and $trimmed -notmatch '\\Microsoft\\WindowsApps\\') {
                [void]$candidatePaths.Add($trimmed)
            }
        }
    }

    $compatible = @()
    foreach ($candidate in @($candidatePaths | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $versionResult = Invoke-CapturedProcess -FilePath $candidate -ArgumentList @("--version")
        $versionText = (([string]$versionResult.StdOut) + " " + ([string]$versionResult.StdErr)).Trim()
        if ($versionResult.ExitCode -eq 0 -and $versionText -match 'Python\s+(\d+)\.(\d+)\.(\d+)') {
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
            throw "CajaApp necesita Python Windows x64 entre 3.11 y 3.14 para procesar PDFs. No se encontró una instalación compatible."
        }

        New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
        $venvResult = Invoke-CapturedProcess `
            -FilePath $basePython.Path `
            -ArgumentList @("-m", "venv", $venvDirectory)
        if ($venvResult.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
            $details = (([string]$venvResult.StdOut) + "`n" + ([string]$venvResult.StdErr)).Trim()
            throw "No se pudo crear el runtime Python local de CajaApp. $details"
        }
        $created = $true
    }

    $stamp = $null
    if (Test-Path -LiteralPath $stampPath -PathType Leaf) {
        try { $stamp = Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json } catch { $stamp = $null }
    }

    $importCheck = Invoke-CapturedProcess `
        -FilePath $venvPython `
        -ArgumentList @("-c", "import pdfplumber;print(pdfplumber.__version__)")
    $stampMatches = $stamp -and ([string]$stamp.requirementsSha256 -eq $requirementsHash)
    $installed = $false

    if (-not $stampMatches -or $importCheck.ExitCode -ne 0) {
        $pipResult = Invoke-CapturedProcess `
            -FilePath $venvPython `
            -ArgumentList @("-m", "pip", "install", "--disable-pip-version-check", "-r", $requirementsPath)
        if ($pipResult.ExitCode -ne 0) {
            $details = (([string]$pipResult.StdOut) + "`n" + ([string]$pipResult.StdErr)).Trim()
            throw "No se pudieron instalar las dependencias Python de CajaApp. $details"
        }
        $installed = $true
        $importCheck = Invoke-CapturedProcess `
            -FilePath $venvPython `
            -ArgumentList @("-c", "import pdfplumber;print(pdfplumber.__version__)")
    }

    if ($importCheck.ExitCode -ne 0) {
        $details = (([string]$importCheck.StdOut) + "`n" + ([string]$importCheck.StdErr)).Trim()
        throw "El runtime Python existe, pero pdfplumber no pudo cargarse. $details"
    }

    $pythonVersionResult = Invoke-CapturedProcess -FilePath $venvPython -ArgumentList @("--version")
    $pythonVersion = (([string]$pythonVersionResult.StdOut) + " " + ([string]$pythonVersionResult.StdErr)).Trim()
    $pdfplumberVersion = ([string]$importCheck.StdOut).Trim()

    $state = [ordered]@{
        pythonExecutable = $venvPython
        pythonVersion = $pythonVersion
        pdfplumberVersion = $pdfplumberVersion
        requirementsSha256 = $requirementsHash
        created = $created
        dependenciesInstalled = $installed
        updatedAt = (Get-Date).ToString("o")
    }
    New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
    [IO.File]::WriteAllText(
        $stampPath,
        ($state | ConvertTo-Json -Depth 5),
        (New-Object Text.UTF8Encoding($false))
    )

    return [pscustomobject]$state
}


function Invoke-NpmStep {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Description
    )


    if (-not $script:NpmCmd) {
        throw "npm.cmd no fue resuelto antes de ejecutar '$Description'."
    }


    Write-Step -Message $Description
    $npmCommand = $script:NpmCmd + " " + ($Arguments -join " ")
    $stepErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $result = Invoke-CapturedProcess `
            -FilePath $CmdExe `
            -ArgumentList @("/d", "/s", "/c", $npmCommand) `
            -WorkingDirectory $WorkingDirectory
    }
    finally {
        $ErrorActionPreference = $stepErrorAction
    }


    if ($result.ExitCode -ne 0) {
        $details = @()
        if (-not [string]::IsNullOrWhiteSpace($result.StdOut)) { $details += ([string]$result.StdOut).Trim() }
        if (-not [string]::IsNullOrWhiteSpace($result.StdErr)) { $details += ([string]$result.StdErr).Trim() }
        $suffix = if ($details.Count -gt 0) { "`n" + ($details -join "`n") } else { "" }
        throw "$Description falló con código $($result.ExitCode).$suffix"
    }


    if (-not $JsonOnly -and -not [string]::IsNullOrWhiteSpace($result.StdOut)) {
        Write-Host ([string]$result.StdOut).Trim()
    }
}


function Backup-SqliteDatabase {
    $envFile = Join-Path $BackendDirectory ".env"
    if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) { return $null }


    $databaseLine = Get-Content -LiteralPath $envFile |
        Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
        Select-Object -First 1
    if (-not $databaseLine) { return $null }


    $databaseUrl = ($databaseLine -split "=", 2)[1].Trim().Trim('"').Trim("'")
    if (-not $databaseUrl.StartsWith("file:")) { return $null }


    $databasePathValue = $databaseUrl.Substring(5)
    if ([IO.Path]::IsPathRooted($databasePathValue)) {
        $databasePath = $databasePathValue
    }
    else {
        $databasePath = [IO.Path]::GetFullPath((Join-Path (Join-Path $BackendDirectory "prisma") $databasePathValue))
    }
    if (-not (Test-Path -LiteralPath $databasePath -PathType Leaf)) { return $null }


    $backupDirectory = Join-Path $env:TEMP "cajaapp-sqlite-backups"
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = Join-Path $backupDirectory "$timestamp-$([IO.Path]::GetFileName($databasePath))"
    Copy-Item -LiteralPath $databasePath -Destination $backupPath -Force
    return $backupPath
}


function Get-ListeningProcessIds {
    param([Parameter(Mandatory = $true)][int]$Port)


    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) { return @() }
    return @(
        $connections |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -gt 0 }
    )
}


function Stop-ProcessTree {
    param([Parameter(Mandatory = $true)][int]$ProcessId)


    if ($ProcessId -le 0) { return $false }
    if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) { return $false }


    $result = Invoke-CapturedProcess -FilePath $TaskKillExe -ArgumentList @("/PID", "$ProcessId", "/T", "/F")
    if ($result.ExitCode -ne 0 -and (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
        $message = if (-not [string]::IsNullOrWhiteSpace($result.StdErr)) { ([string]$result.StdErr).Trim() } else { ([string]$result.StdOut).Trim() }
        throw "No se pudo finalizar el PID $ProcessId. $message"
    }
    return $true
}


function Get-ProcessCommandLine {
    param([Parameter(Mandatory = $true)][int]$ProcessId)


    try {
        $process = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
        if (-not $process) { return $null }
        return [string]$process.CommandLine
    }
    catch {
        return $null
    }
}


function Test-IsCajaAppProcess {
    param([Parameter(Mandatory = $true)][int]$ProcessId)


    if ($ProcessId -le 0) { return $false }
    $commandLine = Get-ProcessCommandLine -ProcessId $ProcessId
    if ([string]::IsNullOrWhiteSpace($commandLine)) { return $false }


    $normalizedRoot = $ProjectRoot.TrimEnd("\\")
    if ($commandLine.IndexOf($normalizedRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        return $true
    }


    $knownEntrypoints = @(
        "dist/main.js",
        "dist\\main.js",
        ".next/standalone/server.js",
        ".next\\standalone\\server.js"
    )
    foreach ($entrypoint in $knownEntrypoints) {
        if ($commandLine.IndexOf($entrypoint, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            return $true
        }
    }


    return $false
}


function Stop-ProcessesOnPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[int]]$StoppedPids,
        [switch]$IgnoreExternalProcesses
    )


    foreach ($processId in @(Get-ListeningProcessIds -Port $Port)) {
        if (-not (Test-IsCajaAppProcess -ProcessId $processId)) {
            if ($IgnoreExternalProcesses) {
                continue
            }


            $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
            if ([string]::IsNullOrWhiteSpace($processName)) { $processName = "desconocido" }
            throw "El puerto $Port está ocupado por un proceso externo a CajaApp (PID $processId, proceso '$processName'). Use -BackendPort/-FrontendPort con puertos libres o libere el puerto fuera de este script."
        }


        if (Stop-ProcessTree -ProcessId $processId) {
            if (-not $StoppedPids.Contains($processId)) { [void]$StoppedPids.Add($processId) }
        }
    }


    $deadline = (Get-Date).AddSeconds(15)
    do {
        $remainingCajaApp = @(
            Get-ListeningProcessIds -Port $Port |
                Where-Object { Test-IsCajaAppProcess -ProcessId $_ }
        )
        if ($remainingCajaApp.Count -eq 0) { return }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)


    throw "El puerto $Port continúa ocupado por procesos CajaApp: $($remainingCajaApp -join ', ')."
}


function Read-StateFile {
    if (-not (Test-Path -LiteralPath $StateFile -PathType Leaf)) { return $null }
    try {
        return (Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json)
    }
    catch {
        return $null
    }
}


function Stop-ExistingRun {
    param([switch]$IgnoreExternalProcesses)


    $stoppedPids = New-Object 'System.Collections.Generic.List[int]'
    $state = Read-StateFile
    if ($state) {
        foreach ($candidate in @($state.backend.pid, $state.frontend.pid)) {
            $pidValue = 0
            if ([int]::TryParse([string]$candidate, [ref]$pidValue) -and $pidValue -gt 0) {
                if (Test-IsCajaAppProcess -ProcessId $pidValue) {
                    if (Stop-ProcessTree -ProcessId $pidValue) {
                        if (-not $stoppedPids.Contains($pidValue)) { [void]$stoppedPids.Add($pidValue) }
                    }
                }
            }
        }
    }


    Stop-ProcessesOnPort -Port $BackendPort -StoppedPids $stoppedPids -IgnoreExternalProcesses:$IgnoreExternalProcesses
    Stop-ProcessesOnPort -Port $FrontendPort -StoppedPids $stoppedPids -IgnoreExternalProcesses:$IgnoreExternalProcesses
    Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
    return @($stoppedPids)
}


function Start-ServiceProcess {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$StdOutPath,
        [Parameter(Mandatory = $true)][string]$StdErrPath,
        [hashtable]$EnvironmentVariables = @{}
    )


    New-Item -ItemType File -Path $StdOutPath -Force | Out-Null
    New-Item -ItemType File -Path $StdErrPath -Force | Out-Null


    $previousValues = @{}
    foreach ($name in $EnvironmentVariables.Keys) {
        $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
        [Environment]::SetEnvironmentVariable($name, [string]$EnvironmentVariables[$name], "Process")
    }


    try {
        return Start-Process `
            -FilePath $script:NodeExe `
            -ArgumentList $Arguments `
            -WorkingDirectory $WorkingDirectory `
            -WindowStyle Hidden `
            -RedirectStandardOutput $StdOutPath `
            -RedirectStandardError $StdErrPath `
            -PassThru
    }
    finally {
        foreach ($name in $EnvironmentVariables.Keys) {
            [Environment]::SetEnvironmentVariable($name, $previousValues[$name], "Process")
        }
    }
}


function Wait-ForHttpEndpoint {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds
    )


    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $attempts = 0
    do {
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $attempts
            }
        }
        catch {
            # Reintentar hasta vencer el timeout.
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)


    throw "El endpoint $Url no respondió dentro de $TimeoutSeconds segundos."
}


function Write-StateFile {
    param([Parameter(Mandatory = $true)]$State)
    New-Item -ItemType Directory -Path (Split-Path -Parent $StateFile) -Force | Out-Null
    $json = $State | ConvertTo-Json -Depth 10
    [IO.File]::WriteAllText($StateFile, $json, (New-Object Text.UTF8Encoding($false)))
}


$startedAt = Get-Date
$backendProcess = $null
$frontendProcess = $null


try {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null


    if ($Status) {
        if (Test-Path -LiteralPath $StateFile -PathType Leaf) {
            [Console]::Out.WriteLine((Get-Content -LiteralPath $StateFile -Raw))
            exit 0
        }
        Write-JsonOutput -Value ([ordered]@{ ok = $false; reason = "no state file"; stateFile = $StateFile })
        exit 3
    }


    if ($Stop) {
        $stopped = @(Stop-ExistingRun -IgnoreExternalProcesses)
        Write-JsonOutput -Value ([ordered]@{ ok = $true; stopped = $stopped; stateFile = $StateFile })
        exit 0
    }


    if ($Restart) {
        Write-Step -Message "Restart: deteniendo run previo"
        [void](Stop-ExistingRun)
    }


    Write-Step -Message "Validando entorno"
    Assert-PathExists -Path $BackendDirectory -Description "Directorio backend"
    Assert-PathExists -Path $FrontendDirectory -Description "Directorio frontend"
    Assert-PathExists -Path $CmdExe -Description "cmd.exe" -Leaf
    Assert-PathExists -Path $TaskKillExe -Description "taskkill.exe" -Leaf


    $node = Resolve-NodeEnvironment
    Write-KeyValue -Key "node" -Value "$($node.Version) ($($node.Path))"
    Write-KeyValue -Key "npm" -Value $node.NpmPath

    Write-Step -Message "Preparando runtime Python para extracción PDF"
    $python = Resolve-PythonRuntime
    $env:PYTHON_EXECUTABLE = $python.pythonExecutable
    $env:NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl
    Write-KeyValue -Key "python" -Value "$($python.pythonVersion) ($($python.pythonExecutable))"
    Write-KeyValue -Key "pdfplumber" -Value $python.pdfplumberVersion


    Write-Step -Message "Deteniendo instancias previas en puertos $BackendPort y $FrontendPort"
    [void](Stop-ExistingRun)


    if (-not $SkipMigrate) {
        Write-Step -Message "Respaldando SQLite"
        $backupPath = Backup-SqliteDatabase
        if ($backupPath) { Write-KeyValue -Key "backup" -Value $backupPath }


        Invoke-NpmStep -WorkingDirectory $BackendDirectory -Arguments @("exec", "--", "prisma", "generate") -Description "prisma:generate"
        Invoke-NpmStep -WorkingDirectory $BackendDirectory -Arguments @("exec", "--", "prisma", "migrate", "deploy") -Description "prisma:migrate:deploy"
    }


    $backendMain = Join-Path $BackendDirectory "dist\main.js"
    if ($Rebuild -or -not (Test-Path -LiteralPath $backendMain -PathType Leaf)) {
        Invoke-NpmStep -WorkingDirectory $BackendDirectory -Arguments @("run", "build") -Description "backend build"
    }


    $frontendMain = Join-Path $FrontendDirectory ".next\standalone\server.js"
    if ($Rebuild -or -not (Test-Path -LiteralPath $frontendMain -PathType Leaf)) {
        Invoke-NpmStep -WorkingDirectory $FrontendDirectory -Arguments @("run", "build") -Description "frontend build"
    }


    Write-Step -Message "Arrancando backend"
    $backendProcess = Start-ServiceProcess `
        -WorkingDirectory $BackendDirectory `
        -Arguments @("dist/main.js") `
        -StdOutPath $BackendLogPath `
        -StdErrPath $BackendErrLogPath `
        -EnvironmentVariables @{
            PORT = "$BackendPort"
            HOST = "127.0.0.1"
            PYTHON_EXECUTABLE = $python.pythonExecutable
        }
    $backendChecks = Wait-ForHttpEndpoint -Url $BackendHealthUrl -TimeoutSeconds $StartupTimeoutSeconds
    Write-KeyValue -Key "backend.pid" -Value ([string]$backendProcess.Id)


    Write-Step -Message "Arrancando frontend"
    $frontendProcess = Start-ServiceProcess `
        -WorkingDirectory $FrontendDirectory `
        -Arguments @(".next/standalone/server.js") `
        -StdOutPath $FrontendLogPath `
        -StdErrPath $FrontendErrLogPath `
        -EnvironmentVariables @{
            PORT = "$FrontendPort"
            HOSTNAME = "127.0.0.1"
            NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl
        }
    $frontendChecks = Wait-ForHttpEndpoint -Url $FrontendUrl -TimeoutSeconds $StartupTimeoutSeconds
    Write-KeyValue -Key "frontend.pid" -Value ([string]$frontendProcess.Id)


    $state = [ordered]@{
        ok = $true
        startedAt = $startedAt.ToString("o")
        durationSeconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
        node = [ordered]@{
            version = $node.Version
            path = $node.Path
        }
        python = [ordered]@{
            executable = $python.pythonExecutable
            version = $python.pythonVersion
            pdfplumberVersion = $python.pdfplumberVersion
            requirementsSha256 = $python.requirementsSha256
            created = $python.created
            dependenciesInstalled = $python.dependenciesInstalled
        }
        backend = [ordered]@{
            pid = $backendProcess.Id
            port = $BackendPort
            healthUrl = $BackendHealthUrl
            apiBaseUrl = $ApiBaseUrl
            logPath = $BackendLogPath
            errLogPath = $BackendErrLogPath
            readyAfterChecks = $backendChecks
        }
        frontend = [ordered]@{
            pid = $frontendProcess.Id
            port = $FrontendPort
            url = $FrontendUrl
            logPath = $FrontendLogPath
            errLogPath = $FrontendErrLogPath
            readyAfterChecks = $frontendChecks
        }
        stopHint = "Run with -Stop, or: taskkill /PID $($backendProcess.Id) /T /F && taskkill /PID $($frontendProcess.Id) /T /F"
    }


    Write-StateFile -State $state
    if ($JsonOnly) {
        [Console]::Out.WriteLine((Get-Content -LiteralPath $StateFile -Raw))
    }
    else {
        Write-Step -Message "Listo"
        Write-KeyValue -Key "backend.url" -Value $ApiBaseUrl
        Write-KeyValue -Key "frontend.url" -Value $FrontendUrl
        Write-KeyValue -Key "state" -Value $StateFile
        Write-JsonOutput -Value $state
    }
    exit 0
}
catch {
    $errorMessage = $_.Exception.Message


    try {
        if ($frontendProcess -and -not $frontendProcess.HasExited) { [void](Stop-ProcessTree -ProcessId $frontendProcess.Id) }
        if ($backendProcess -and -not $backendProcess.HasExited) { [void](Stop-ProcessTree -ProcessId $backendProcess.Id) }
        Stop-ProcessesOnPort -Port $BackendPort -StoppedPids (New-Object 'System.Collections.Generic.List[int]') -IgnoreExternalProcesses
        Stop-ProcessesOnPort -Port $FrontendPort -StoppedPids (New-Object 'System.Collections.Generic.List[int]') -IgnoreExternalProcesses
    }
    catch {
        # El error principal tiene prioridad; el cleanup es best-effort.
    }


    Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
    $failure = [ordered]@{
        ok = $false
        error = $errorMessage
        stateFile = $StateFile
    }


    if (-not $JsonOnly) {
        Write-Host ""
        Write-Host "ERROR: $errorMessage" -ForegroundColor Red
    }
    Write-JsonOutput -Value $failure
    exit 1
}