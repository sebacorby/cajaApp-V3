[CmdletBinding()]
param(
    [ValidateSet("Start", "Stop", "Status")]
    [string]$Action = "Start"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$BackendPort = 11436
$FrontendPort = 11437
$PreferredNodeHome = "I:\Tools\node-v24.18.0-win-x64"

if ($BackendPort -le 11000 -or $FrontendPort -le 11000) {
    throw "CajaApp solo puede usar puertos superiores a 11000."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "workspace\backend"
$FrontendDir = Join-Path $ProjectRoot "workspace\frontend"
$RuntimeDir = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "CajaAppV3\runtime"
$PythonDir = Join-Path $RuntimeDir "python\.venv"
$PythonExe = Join-Path $PythonDir "Scripts\python.exe"
$StateFile = Join-Path $RuntimeDir "state.json"
$LogFile = Join-Path $RuntimeDir "launcher.log"
$BackendOut = Join-Path $RuntimeDir "backend.out.log"
$BackendErr = Join-Path $RuntimeDir "backend.err.log"
$FrontendOut = Join-Path $RuntimeDir "frontend.out.log"
$FrontendErr = Join-Path $RuntimeDir "frontend.err.log"
$LockFile = Join-Path $RuntimeDir "launcher.lock"
$BackendUrl = "http://127.0.0.1:$BackendPort/health"
$FrontendUrl = "http://127.0.0.1:$FrontendPort"

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
$script:Lock = $null

function Log([string]$Message) {
    Add-Content -LiteralPath $LogFile -Encoding UTF8 -Value (
        "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"), $Message
    )
}

function Run-Native {
    param([string]$File, [string[]]$NativeArgs = @(), [string]$WorkingDirectory)

    $old = $null
    try {
        if ($WorkingDirectory) {
            $old = (Get-Location).Path
            Set-Location -LiteralPath $WorkingDirectory
        }
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = @(& $File @NativeArgs 2>&1)
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        return [pscustomobject]@{
            Code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
            Text = ($output | ForEach-Object { [string]$_ }) -join "`r`n"
        }
    }
    finally {
        if ($old) { Set-Location -LiteralPath $old }
    }
}

function Port-Pids([int]$Port) {
    return @(
        Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -gt 0 }
    )
}

function Kill-Tree([int]$ProcessId, [string]$Reason) {
    if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) { return }
    Log "Finalizando PID $ProcessId ($Reason)."
    $result = Run-Native -File (Join-Path $env:WINDIR "System32\taskkill.exe") `
        -NativeArgs @("/PID", [string]$ProcessId, "/T", "/F")
    if ($result.Code -ne 0 -and (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
        throw "No se pudo finalizar PID $ProcessId. $($result.Text)"
    }
}

function Release-Port([int]$Port, [string]$Name) {
    foreach ($pidValue in @(Port-Pids $Port)) {
        Kill-Tree $pidValue "$Name ocupa el puerto $Port"
    }
    $limit = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $limit) {
        if (@(Port-Pids $Port).Count -eq 0) {
            Log "Puerto $Port liberado para $Name."
            return
        }
        Start-Sleep -Milliseconds 250
    }
    throw "El puerto $Port sigue ocupado despues de forzar su liberacion."
}

function Wait-Url([string]$Url, [string]$Name) {
    $limit = (Get-Date).AddMinutes(3)
    $last = "sin respuesta"
    while ((Get-Date) -lt $limit) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Log "$Name disponible en $Url."
                return
            }
        }
        catch { $last = $_.Exception.Message }
        Start-Sleep -Milliseconds 750
    }
    throw "$Name no respondio en $Url. Ultimo error: $last"
}

function Resolve-Node {
    $preferred = Join-Path $PreferredNodeHome "node.exe"
    $candidates = @()
    if (Test-Path -LiteralPath $preferred -PathType Leaf) { $candidates += $preferred }
    $candidates += @(& where.exe node.exe 2>$null)

    foreach ($node in @($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { continue }
        $check = Run-Native -File $node -NativeArgs @("--version")
        $npm = Join-Path (Split-Path -Parent $node) "npm.cmd"
        if ($check.Code -eq 0 -and (Test-Path -LiteralPath $npm -PathType Leaf)) {
            $env:Path = "$(Split-Path -Parent $node);$env:Path"
            Log "Node seleccionado: $($check.Text.Trim()) en $node."
            return [pscustomobject]@{ Node = $node; Npm = $npm; Version = $check.Text.Trim() }
        }
    }
    throw "No se encontro una instalacion funcional de Node.js con npm."
}

function Resolve-BasePython {
    $candidates = @()
    foreach ($launcher in @(& where.exe py.exe 2>$null)) {
        foreach ($line in @(& $launcher -0p 2>$null)) {
            if ($line -match "([A-Za-z]:\\.+?python(?:\.exe)?)\s*$") { $candidates += $Matches[1] }
        }
    }
    $candidates += @(& where.exe python.exe 2>$null)

    foreach ($python in @($candidates | Where-Object { $_ -and $_ -notmatch "WindowsApps" } | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $python -PathType Leaf)) { continue }
        $check = Run-Native -File $python -NativeArgs @("--version")
        if ($check.Code -eq 0 -and $check.Text -match "Python\s+3\.") { return $python }
    }
    throw "CajaApp necesita una instalacion funcional de Python 3 para procesar PDFs."
}

function Ensure-Python {
    $requirements = Join-Path $BackendDir "python\requirements.txt"
    if (-not (Test-Path -LiteralPath $requirements -PathType Leaf)) {
        throw "No se encontro $requirements"
    }

    $valid = $false
    if (Test-Path -LiteralPath $PythonExe -PathType Leaf) {
        $pip = Run-Native -File $PythonExe -NativeArgs @("-m", "pip", "--version")
        $import = Run-Native -File $PythonExe -NativeArgs @("-c", "import pdfplumber")
        $valid = $pip.Code -eq 0 -and $import.Code -eq 0
    }

    if (-not $valid) {
        if (Test-Path -LiteralPath $PythonDir) {
            Log "El runtime Python esta incompleto; se recreara."
            Remove-Item -LiteralPath $PythonDir -Recurse -Force
        }
        $base = Resolve-BasePython
        New-Item -ItemType Directory -Path (Split-Path -Parent $PythonDir) -Force | Out-Null
        $created = Run-Native -File $base -NativeArgs @("-m", "venv", $PythonDir)
        if ($created.Code -ne 0 -or -not (Test-Path -LiteralPath $PythonExe)) {
            throw "No se pudo crear el runtime Python. $($created.Text)"
        }
        $install = Run-Native -File $PythonExe -NativeArgs @(
            "-m", "pip", "install", "--disable-pip-version-check", "-r", $requirements
        )
        if ($install.Code -ne 0) { throw "No se pudo instalar pdfplumber. $($install.Text)" }
    }

    $final = Run-Native -File $PythonExe -NativeArgs @("-c", "import pdfplumber; print(pdfplumber.__version__)")
    if ($final.Code -ne 0) { throw "pdfplumber no pudo cargarse. $($final.Text)" }
    Log "Runtime Python listo. pdfplumber $($final.Text.Trim())."
    return $PythonExe
}

function Ensure-Modules([string]$Dir, [string]$Name, [string]$Npm) {
    if (Test-Path -LiteralPath (Join-Path $Dir "node_modules") -PathType Container) { return }
    Log "${Name}: instalando dependencias con npm ci."
    $result = Run-Native -File $Npm -NativeArgs @("ci") -WorkingDirectory $Dir
    if ($result.Code -ne 0) { throw "${Name}: npm ci fallo. $($result.Text)" }
}

function Newest-Source([string[]]$Paths) {
    $dates = @()
    foreach ($path in $Paths) {
        if (-not (Test-Path -LiteralPath $path)) { continue }
        $item = Get-Item -LiteralPath $path
        if ($item.PSIsContainer) {
            $dates += @(Get-ChildItem -LiteralPath $path -File -Recurse |
                Where-Object { $_.FullName -notmatch "\\node_modules\\|\\\.next\\|\\dist\\" } |
                Select-Object -ExpandProperty LastWriteTimeUtc)
        }
        else { $dates += $item.LastWriteTimeUtc }
    }
    return ($dates | Sort-Object -Descending | Select-Object -First 1)
}

function Needs-Build([string]$Artifact, [string[]]$Sources) {
    if (-not (Test-Path -LiteralPath $Artifact -PathType Leaf)) { return $true }
    $newest = Newest-Source $Sources
    return $newest -and $newest -gt (Get-Item -LiteralPath $Artifact).LastWriteTimeUtc
}

function Ensure-Builds([string]$Npm) {
    $backendArtifact = Join-Path $BackendDir "dist\main.js"
    $frontendArtifact = Join-Path $FrontendDir ".next\standalone\server.js"
    $oldNodeEnv = $env:NODE_ENV
    $oldApi = $env:NEXT_PUBLIC_API_BASE_URL

    try {
        $env:NODE_ENV = "production"
        $env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:$BackendPort"

        if (Needs-Build $backendArtifact @(
            (Join-Path $BackendDir "src"), (Join-Path $BackendDir "prisma\schema.prisma"),
            (Join-Path $BackendDir "package.json"), (Join-Path $BackendDir "package-lock.json"),
            (Join-Path $BackendDir "tsconfig.json")
        )) {
            Log "Compilando backend en produccion."
            $generate = Run-Native -File $Npm -NativeArgs @("run", "prisma:generate") -WorkingDirectory $BackendDir
            if ($generate.Code -ne 0) { throw "Prisma Generate fallo. $($generate.Text)" }
            $build = Run-Native -File $Npm -NativeArgs @("run", "build") -WorkingDirectory $BackendDir
            if ($build.Code -ne 0) { throw "Build backend fallo. $($build.Text)" }
        }

        if (Needs-Build $frontendArtifact @(
            (Join-Path $FrontendDir "src"), (Join-Path $FrontendDir "public"),
            (Join-Path $FrontendDir "package.json"), (Join-Path $FrontendDir "package-lock.json"),
            (Join-Path $FrontendDir "next.config.ts"), (Join-Path $FrontendDir "tsconfig.json"),
            (Join-Path $FrontendDir ".env.local")
        )) {
            Log "Compilando frontend en produccion."
            $build = Run-Native -File $Npm -NativeArgs @("run", "build") -WorkingDirectory $FrontendDir
            if ($build.Code -ne 0) { throw "Build frontend fallo. $($build.Text)" }
        }
    }
    finally {
        $env:NODE_ENV = $oldNodeEnv
        $env:NEXT_PUBLIC_API_BASE_URL = $oldApi
    }

    if (-not (Test-Path -LiteralPath $backendArtifact)) { throw "No existe $backendArtifact" }
    if (-not (Test-Path -LiteralPath $frontendArtifact)) { throw "No existe $frontendArtifact" }
}

function Start-HiddenNode {
    param([string]$Node, [string]$Argument, [string]$Dir, [string]$Out, [string]$Err)
    Remove-Item -LiteralPath $Out, $Err -Force -ErrorAction SilentlyContinue
    return Start-Process -FilePath $Node -ArgumentList @($Argument) -WorkingDirectory $Dir `
        -RedirectStandardOutput $Out -RedirectStandardError $Err -WindowStyle Hidden -PassThru
}

function Stop-App {
    Log "Apagando CajaApp."
    if (Test-Path -LiteralPath $StateFile) {
        try {
            $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
            foreach ($name in @("frontendPid", "backendPid")) {
                $value = [int]$state.$name
                if ($value -gt 0) { Kill-Tree $value "proceso registrado de CajaApp" }
            }
        }
        catch { Log "No se pudo leer state.json: $($_.Exception.Message)" }
    }
    Release-Port $FrontendPort "Frontend CajaApp"
    Release-Port $BackendPort "Backend CajaApp"
    Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
    Log "CajaApp detenida."
}

function Start-App {
    Log "Iniciando CajaApp en produccion."
    if (-not (Test-Path -LiteralPath $BackendDir)) { throw "No existe $BackendDir" }
    if (-not (Test-Path -LiteralPath $FrontendDir)) { throw "No existe $FrontendDir" }

    Release-Port $FrontendPort "Frontend CajaApp"
    Release-Port $BackendPort "Backend CajaApp"

    $node = Resolve-Node
    $python = Ensure-Python
    Ensure-Modules $BackendDir "Backend" $node.Npm
    Ensure-Modules $FrontendDir "Frontend" $node.Npm
    Ensure-Builds $node.Npm

    $migrate = Run-Native -File $node.Npm -NativeArgs @("run", "prisma:migrate:deploy") -WorkingDirectory $BackendDir
    if ($migrate.Code -ne 0) { throw "Prisma migrate deploy fallo. $($migrate.Text)" }

    $oldNodeEnv = $env:NODE_ENV
    $oldPort = $env:PORT
    $oldHost = $env:HOST
    $oldHostname = $env:HOSTNAME
    $oldPython = $env:PYTHON_EXECUTABLE
    $oldApi = $env:NEXT_PUBLIC_API_BASE_URL

    try {
        $env:NODE_ENV = "production"
        $env:PORT = [string]$BackendPort
        $env:HOST = "127.0.0.1"
        $env:PYTHON_EXECUTABLE = $python
        $backend = Start-HiddenNode $node.Node "dist/main.js" $BackendDir $BackendOut $BackendErr
        Log "Backend iniciado con PID $($backend.Id)."
        Wait-Url $BackendUrl "Backend CajaApp"

        $env:PORT = [string]$FrontendPort
        $env:HOSTNAME = "127.0.0.1"
        $env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:$BackendPort"
        $frontend = Start-HiddenNode $node.Node ".next/standalone/server.js" $FrontendDir $FrontendOut $FrontendErr
        Log "Frontend iniciado con PID $($frontend.Id)."
        Wait-Url $FrontendUrl "Frontend CajaApp"

        [ordered]@{
            backendPid = $backend.Id
            frontendPid = $frontend.Id
            backendPort = $BackendPort
            frontendPort = $FrontendPort
            startedAt = (Get-Date).ToString("o")
        } | ConvertTo-Json | Set-Content -LiteralPath $StateFile -Encoding UTF8

        Start-Process $FrontendUrl | Out-Null
        Log "CajaApp lista en $FrontendUrl."
    }
    catch {
        Release-Port $FrontendPort "Frontend CajaApp"
        Release-Port $BackendPort "Backend CajaApp"
        throw
    }
    finally {
        $env:NODE_ENV = $oldNodeEnv
        $env:PORT = $oldPort
        $env:HOST = $oldHost
        $env:HOSTNAME = $oldHostname
        $env:PYTHON_EXECUTABLE = $oldPython
        $env:NEXT_PUBLIC_API_BASE_URL = $oldApi
    }
}

function Show-Status {
    $backend = @(Port-Pids $BackendPort)
    $frontend = @(Port-Pids $FrontendPort)
    [ordered]@{
        backend = @{ port = $BackendPort; running = $backend.Count -gt 0; pids = $backend }
        frontend = @{ port = $FrontendPort; running = $frontend.Count -gt 0; pids = $frontend; url = $FrontendUrl }
    } | ConvertTo-Json -Depth 4
    if ($backend.Count -gt 0 -and $frontend.Count -gt 0) { return 0 }
    return 1
}

$exitCode = 0
try {
    $script:Lock = [IO.File]::Open($LockFile, "OpenOrCreate", "ReadWrite", "None")
    switch ($Action) {
        "Start" { Start-App }
        "Stop" { Stop-App }
        "Status" { $exitCode = Show-Status }
    }
}
catch {
    Log "ERROR: $($_.Exception.Message)"
    Log "STACK: $($_.ScriptStackTrace)"
    $exitCode = 1
}
finally {
    if ($script:Lock) { $script:Lock.Dispose() }
}
exit $exitCode
