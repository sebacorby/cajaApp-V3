[CmdletBinding()]
param(
    [int]$BackendPort = 11436,
    [int]$FrontendPort = 11437,
    [int]$StartupTimeoutSeconds = 180
)

$backupPath = Join-Path $PSScriptRoot "architecture-handoff\architect-working\node-validation-removal-20260727\backups\start-cajaapp.ps1.before-node-validation-removal"
if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf)) {
    throw "No se encontro la fuente preservada del launcher: $backupPath"
}

$source = Get-Content -LiteralPath $backupPath -Raw
$replacement = @'
function Assert-RequiredNodeVersion {
    param([string]$PreferredNodeHome = "")

    $chosenNode = $null
    if (-not [string]::IsNullOrWhiteSpace($PreferredNodeHome)) {
        $preferredNode = Join-Path $PreferredNodeHome "node.exe"
        if (Test-Path -LiteralPath $preferredNode -PathType Leaf) {
            $chosenNode = $preferredNode
        }
    }

    if (-not $chosenNode) {
        $command = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $command) { $command = Get-Command node -ErrorAction SilentlyContinue }
        if ($command) { $chosenNode = $command.Source }
    }

    if (-not $chosenNode) {
        throw "Node.js no fue encontrado en PATH."
    }

    $nodeDir = Split-Path -Parent $chosenNode
    if (-not [string]::IsNullOrWhiteSpace($nodeDir)) {
        $pathEntries = @($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($pathEntries.Count -eq 0 -or $pathEntries[0].TrimEnd('\') -ne $nodeDir.TrimEnd('\')) {
            $env:Path = "$nodeDir;$env:Path"
        }
    }
}

function Invoke-PythonProcess {
'@

$pattern = '(?ms)^function Assert-RequiredNodeVersion\s*\{.*?^function Invoke-PythonProcess\s*\{'
if (-not [regex]::IsMatch($source, $pattern)) {
    throw "No se pudo localizar el bloque legacy de validacion de Node en start-cajaapp.ps1."
}
$source = [regex]::Replace($source, $pattern, $replacement, 1)

& ([scriptblock]::Create($source)) @PSBoundParameters
