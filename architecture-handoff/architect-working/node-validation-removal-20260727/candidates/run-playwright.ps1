[CmdletBinding()]
param(
    [string]$NodeHome = "",
    [string]$ProjectRoot = "I:\cajaApp-V3",
    [int]$BackendPort = 11436,
    [int]$FrontendPort = 3000,
    [int]$StartupTimeout = 60,
    [switch]$NoOpenReport
)

$backupPath = Join-Path $PSScriptRoot "architecture-handoff\architect-working\node-validation-removal-20260727\backups\run-playwright.ps1.before-node-validation-removal"
if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf)) {
    throw "No se encontro la fuente preservada de run-playwright.ps1: $backupPath"
}

$source = Get-Content -LiteralPath $backupPath -Raw

$getVersionPattern = '(?ms)^function Get-NodeVersion\s*\{.*?^function Pause-Script\s*\{'
if ([regex]::IsMatch($source, $getVersionPattern)) {
    $source = [regex]::Replace($source, $getVersionPattern, "function Pause-Script {", 1)
}

$environmentReplacement = @'
# Validacion de entorno: solo disponibilidad del ejecutable, sin comprobar version.
    $nodeExe = $null
    if (-not [string]::IsNullOrWhiteSpace($NodeHome)) {
        $preferredNode = Join-Path $NodeHome "node.exe"
        if (Test-Path -LiteralPath $preferredNode -PathType Leaf) {
            $nodeExe = $preferredNode
        }
    }
    if (-not $nodeExe) {
        $command = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $command) { $command = Get-Command node -ErrorAction SilentlyContinue }
        if ($command) { $nodeExe = $command.Source }
    }
    if (-not $nodeExe) {
        throw "node.exe no encontrado."
    }

    $NodeHome = Split-Path -Parent $nodeExe
    Write-Step "Entorno preparado"
    Write-KV "node" "$nodeExe" -Color Green
    $env:Path = "$NodeHome;$env:Path"

    # ---------------------------------------------------------------------------
    # Verificar / arrancar ecosistema
'@

$environmentPattern = '(?ms)# Validaci[oó]n de entorno.*?# Verificar / arrancar ecosistema\s*'
if (-not [regex]::IsMatch($source, $environmentPattern)) {
    throw "No se pudo localizar el bloque legacy de validacion de Node en run-playwright.ps1."
}
$source = [regex]::Replace($source, $environmentPattern, $environmentReplacement, 1)

& ([scriptblock]::Create($source)) @PSBoundParameters
