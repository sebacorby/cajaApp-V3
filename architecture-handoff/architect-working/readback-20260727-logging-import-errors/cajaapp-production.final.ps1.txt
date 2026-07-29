[CmdletBinding()]
param(
    [ValidateSet("Start", "Stop", "Status")]
    [string]$Action = "Start"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory
$CorePath = Join-Path $ScriptDirectory "cajaapp-production-core.ps1"
$LogsDirectory = Join-Path $ScriptDirectory "logs"
$RunId = Get-Date -Format "yyyyMMdd-HHmmssfff"
$RunDirectory = Join-Path $LogsDirectory $RunId
$LatestLogPath = Join-Path $LogsDirectory "latest.log"
$CombinedLogPath = Join-Path $RunDirectory "combined.log"
$StdOutPath = Join-Path $RunDirectory "wrapper.stdout.log"
$StdErrPath = Join-Path $RunDirectory "wrapper.stderr.log"
$ResultPath = Join-Path $RunDirectory "result.json"
$LocalRuntime = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "CajaAppV3\runtime"
$BackendReadableLog = Join-Path $ProjectRoot "workspace\backend\backend.log"
$FrontendReadableLog = Join-Path $ProjectRoot "workspace\frontend\frontend.log"

New-Item -ItemType Directory -Path $LogsDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $RunDirectory -Force | Out-Null

function Add-Section {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$Path
    )

    Add-Content -LiteralPath $LatestLogPath -Encoding UTF8 -Value @(
        ""
        ("=" * 80)
        $Title
        "Source: $Path"
        ("=" * 80)
    )

    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        $content = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
        if (
            $Title -eq "WRAPPER STDERR" -and
            $content.Count -gt 0 -and
            [string]$content[0] -eq "#< CLIXML" -and
            (($content -join "`n") -match 'S="progress"')
        ) {
            Add-Content -LiteralPath $LatestLogPath -Encoding UTF8 -Value "<PowerShell progress records omitted>"
        }
        else {
            $content | Add-Content -LiteralPath $LatestLogPath -Encoding UTF8
        }
    }
    else {
        Add-Content -LiteralPath $LatestLogPath -Encoding UTF8 -Value "<file not found>"
    }
}

function Write-ServiceSnapshot {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)][string]$OutPath,
        [Parameter(Mandatory = $true)][string]$ErrPath,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    $header = @(
        "CajaApp $ServiceName execution log"
        "Run ID: $RunId"
        "Action: $Action"
        "Snapshot: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss.fff'))"
        ""
        ("=" * 80)
        "STDOUT"
        "Source: $OutPath"
        ("=" * 80)
    )
    Set-Content -LiteralPath $Destination -Encoding UTF8 -Value $header

    if (Test-Path -LiteralPath $OutPath -PathType Leaf) {
        Get-Content -LiteralPath $OutPath -ErrorAction SilentlyContinue |
            Add-Content -LiteralPath $Destination -Encoding UTF8
    }
    else {
        Add-Content -LiteralPath $Destination -Encoding UTF8 -Value "<file not found>"
    }

    Add-Content -LiteralPath $Destination -Encoding UTF8 -Value @(
        ""
        ("=" * 80)
        "STDERR"
        "Source: $ErrPath"
        ("=" * 80)
    )

    if (Test-Path -LiteralPath $ErrPath -PathType Leaf) {
        Get-Content -LiteralPath $ErrPath -ErrorAction SilentlyContinue |
            Add-Content -LiteralPath $Destination -Encoding UTF8
    }
    else {
        Add-Content -LiteralPath $Destination -Encoding UTF8 -Value "<file not found>"
    }
}

$startedAt = Get-Date
$corePatchApplied = $false
$nativeCapturePatchApplied = $false
$coreParserErrorCount = -1
$exitCode = 1
$errorMessage = ""

Set-Content -LiteralPath $LatestLogPath -Encoding UTF8 -Value @(
    "CajaApp execution log"
    "Run ID: $RunId"
    "Action: $Action"
    "Started: $($startedAt.ToString('yyyy-MM-dd HH:mm:ss.fff'))"
    "Project runtime: $ScriptDirectory"
    "Executed core: $CorePath"
    "Historical directory: $RunDirectory"
    "Ollama control: disabled"
    ("-" * 80)
)

try {
    if (-not (Test-Path -LiteralPath $CorePath -PathType Leaf)) {
        throw "No se encontro el controlador interno: $CorePath"
    }

    # Reparaciones mínimas y persistentes de sintaxis/semántica PowerShell.
    # $Name: requiere ${Name}: para no interpretarse como unidad.
    # $Args es una variable automática reservada; se reemplaza por $NativeArgs.
    # Los warnings emitidos por comandos nativos en stderr no deben abortar la ejecución:
    # el resultado se decide exclusivamente mediante $LASTEXITCODE.
    $coreText = Get-Content -LiteralPath $CorePath -Raw -ErrorAction Stop
    $patchedCoreText = $coreText.Replace('$Name:', '${Name}:')
    $patchedCoreText = $patchedCoreText.Replace('[string[]]$Args', '[string[]]$NativeArgs')
    $patchedCoreText = $patchedCoreText.Replace('@Args', '@NativeArgs')
    $patchedCoreText = $patchedCoreText.Replace('-Args', '-NativeArgs')

    $nativeInvocationBefore = '        $output = @(& $File @NativeArgs 2>&1)'
    $nativeInvocationAfter = @'
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = @(& $File @NativeArgs 2>&1)
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
'@

    if ($patchedCoreText.Contains($nativeInvocationBefore)) {
        $patchedCoreText = $patchedCoreText.Replace($nativeInvocationBefore, $nativeInvocationAfter.TrimEnd())
        $nativeCapturePatchApplied = $true
    }

    if ($patchedCoreText -ne $coreText) {
        [System.IO.File]::WriteAllText(
            $CorePath,
            $patchedCoreText,
            (New-Object System.Text.UTF8Encoding($false))
        )
        $corePatchApplied = $true
    }

    $effectiveCoreText = Get-Content -LiteralPath $CorePath -Raw -ErrorAction Stop
    if (
        $effectiveCoreText.Contains('[string[]]$Args') -or
        $effectiveCoreText.Contains('@Args') -or
        $effectiveCoreText.Contains('-Args')
    ) {
        throw "La reparacion del parametro reservado Args no pudo completarse."
    }
    if (-not $effectiveCoreText.Contains('$previousErrorActionPreference = $ErrorActionPreference')) {
        throw "La reparacion de captura de comandos nativos no pudo completarse."
    }

    $tokens = $null
    $parserErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile(
        $CorePath,
        [ref]$tokens,
        [ref]$parserErrors
    ) | Out-Null

    $coreParserErrorCount = @($parserErrors).Count
    if ($coreParserErrorCount -gt 0) {
        $details = @($parserErrors | ForEach-Object {
            "Line $($_.Extent.StartLineNumber), column $($_.Extent.StartColumnNumber): $($_.Message)"
        }) -join "`r`n"
        throw "El controlador interno contiene errores de sintaxis:`r`n$details"
    }

    $powershellExe = Join-Path $PSHOME "powershell.exe"
    if (-not (Test-Path -LiteralPath $powershellExe -PathType Leaf)) {
        $powershellExe = (Get-Command powershell.exe -ErrorAction Stop).Source
    }

    $escapedCore = $CorePath.Replace("'", "''")
    $escapedAction = $Action.Replace("'", "''")
    $command = "& '$escapedCore' -Action '$escapedAction'"
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))

    $process = Start-Process `
        -FilePath $powershellExe `
        -ArgumentList @(
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-WindowStyle", "Hidden",
            "-EncodedCommand", $encodedCommand
        ) `
        -RedirectStandardOutput $StdOutPath `
        -RedirectStandardError $StdErrPath `
        -WindowStyle Hidden `
        -Wait `
        -PassThru

    $exitCode = [int]$process.ExitCode
}
catch {
    $errorMessage = $_.Exception.Message
    Set-Content -LiteralPath $StdErrPath -Encoding UTF8 -Value @(
        "Wrapper failure: $errorMessage"
        "Stack: $($_.ScriptStackTrace)"
    )
    $exitCode = 1
}

$localFiles = [ordered]@{
    "core-launcher.log" = (Join-Path $LocalRuntime "launcher.log")
    "backend.out.log" = (Join-Path $LocalRuntime "backend.out.log")
    "backend.err.log" = (Join-Path $LocalRuntime "backend.err.log")
    "frontend.out.log" = (Join-Path $LocalRuntime "frontend.out.log")
    "frontend.err.log" = (Join-Path $LocalRuntime "frontend.err.log")
    "state.json" = (Join-Path $LocalRuntime "state.json")
}

foreach ($entry in $localFiles.GetEnumerator()) {
    if (Test-Path -LiteralPath $entry.Value -PathType Leaf) {
        Copy-Item -LiteralPath $entry.Value -Destination (Join-Path $RunDirectory $entry.Key) -Force
    }
}

Write-ServiceSnapshot `
    -ServiceName "backend" `
    -OutPath $localFiles["backend.out.log"] `
    -ErrPath $localFiles["backend.err.log"] `
    -Destination $BackendReadableLog

Write-ServiceSnapshot `
    -ServiceName "frontend" `
    -OutPath $localFiles["frontend.out.log"] `
    -ErrPath $localFiles["frontend.err.log"] `
    -Destination $FrontendReadableLog

Add-Section -Title "WRAPPER STDOUT" -Path $StdOutPath
Add-Section -Title "WRAPPER STDERR" -Path $StdErrPath
foreach ($entry in $localFiles.GetEnumerator()) {
    Add-Section -Title $entry.Key.ToUpperInvariant() -Path (Join-Path $RunDirectory $entry.Key)
}

$finishedAt = Get-Date
$status = if ($exitCode -eq 0) { "SUCCESS" } else { "ERROR" }

Add-Content -LiteralPath $LatestLogPath -Encoding UTF8 -Value @(
    ""
    ("=" * 80)
    "CORE PREFLIGHT"
    ("=" * 80)
    "Persistent patch applied: $corePatchApplied"
    "Native capture patch applied: $nativeCapturePatchApplied"
    "Reserved Args patterns remaining: False"
    "PowerShell parser errors: $coreParserErrorCount"
    "Validated and executed core: $CorePath"
    ""
    ("=" * 80)
    "FINAL RESULT"
    ("=" * 80)
    "Status: $status"
    "Exit code: $exitCode"
    "Finished: $($finishedAt.ToString('yyyy-MM-dd HH:mm:ss.fff'))"
    "Historical directory: $RunDirectory"
)

Copy-Item -LiteralPath $LatestLogPath -Destination $CombinedLogPath -Force

[ordered]@{
    runId = $RunId
    action = $Action
    status = $status
    exitCode = $exitCode
    errorMessage = $errorMessage
    startedAt = $startedAt.ToString("o")
    finishedAt = $finishedAt.ToString("o")
    latestLog = $LatestLogPath
    historicalDirectory = $RunDirectory
    combinedLog = $CombinedLogPath
    executedCore = $CorePath
    corePatchApplied = $corePatchApplied
    nativeCapturePatchApplied = $nativeCapturePatchApplied
    reservedArgsPatternsRemaining = $false
    coreParserErrorCount = $coreParserErrorCount
    ollamaControlled = $false
    backendReadableLog = $BackendReadableLog
    frontendReadableLog = $FrontendReadableLog
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ResultPath -Encoding UTF8

exit $exitCode
