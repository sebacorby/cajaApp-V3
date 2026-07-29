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
    [string]$NodeHome = ""
)

$backupPath = Join-Path $PSScriptRoot "architecture-handoff\architect-working\node-validation-removal-20260727\backups\cajaapp-headless-up.ps1.before-node-validation-removal"
if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf)) {
    throw "No se encontro la fuente preservada del launcher headless: $backupPath"
}

$source = Get-Content -LiteralPath $backupPath -Raw
$source = [regex]::Replace(
    $source,
    '(?m)^\$RequiredNodeVersion\s*=.*(?:\r?\n)?',
    '$RequiredNodeVersion = "not-checked"' + "`r`n",
    1
)

$replacement = @'
function Resolve-NodeEnvironment {
    $chosenNode = $null
    $chosenSource = $null

    if (-not [string]::IsNullOrWhiteSpace($NodeHome)) {
        $preferredNode = Join-Path $NodeHome "node.exe"
        if (Test-Path -LiteralPath $preferredNode -PathType Leaf) {
            $chosenNode = $preferredNode
            $chosenSource = "NodeHome"
        }
    }

    if (-not $chosenNode -and (Test-Path -LiteralPath $WhereExe -PathType Leaf)) {
        $whereResult = Invoke-CapturedProcess -FilePath $WhereExe -ArgumentList @("node")
        if ($whereResult.ExitCode -eq 0) {
            $candidate = @(
                ([string]$whereResult.StdOut) -split "`r?`n" |
                    ForEach-Object { $_.Trim() } |
                    Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path -LiteralPath $_ -PathType Leaf) }
            ) | Select-Object -First 1
            if ($candidate) {
                $chosenNode = $candidate
                $chosenSource = "where.exe"
            }
        }
    }

    if (-not $chosenNode) {
        $command = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $command) { $command = Get-Command node -ErrorAction SilentlyContinue }
        if ($command) {
            $chosenNode = $command.Source
            $chosenSource = "PATH"
        }
    }

    if (-not $chosenNode) {
        throw "Node.js no fue encontrado."
    }

    $nodeDirectory = Split-Path -Parent $chosenNode
    $npmCmd = Join-Path $nodeDirectory "npm.cmd"
    if (-not (Test-Path -LiteralPath $npmCmd -PathType Leaf)) {
        $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if (-not $npmCommand) { $npmCommand = Get-Command npm -ErrorAction SilentlyContinue }
        if ($npmCommand) { $npmCmd = $npmCommand.Source }
    }
    if (-not (Test-Path -LiteralPath $npmCmd -PathType Leaf)) {
        throw "npm no fue encontrado junto a Node ni en PATH."
    }

    $pathEntries = @($env:Path -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($pathEntries.Count -eq 0 -or $pathEntries[0].TrimEnd("\") -ne $nodeDirectory.TrimEnd("\")) {
        $env:Path = "$nodeDirectory;$env:Path"
    }

    $script:NodeExe = $chosenNode
    $script:NpmCmd = $npmCmd

    return [pscustomobject]@{
        Version = "not-checked"
        Path = $chosenNode
        NpmPath = $npmCmd
        Source = $chosenSource
    }
}

function Resolve-PythonRuntime {
'@

$pattern = '(?ms)^function Resolve-NodeEnvironment\s*\{.*?^function Resolve-PythonRuntime\s*\{'
if (-not [regex]::IsMatch($source, $pattern)) {
    throw "No se pudo localizar el bloque legacy de validacion de Node en cajaapp-headless-up.ps1."
}
$source = [regex]::Replace($source, $pattern, $replacement, 1)

& ([scriptblock]::Create($source)) @PSBoundParameters
