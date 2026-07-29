param(
  [string]$Root = 'C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$expectedBefore = @{
  PackageJson = '7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B'
  PackageLock = 'DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED'
}
$expectedAfter = @{
  PackageJson = '5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61'
  PackageLock = '5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B'
}

$node = 'I:\Tools\node-v24.18.0-win-x64\node.exe'
$source = Join-Path $Root 'workspace\frontend'
$stagingRoot = Join-Path $env:LOCALAPPDATA 'CajaApp\validation\APP-SEC-DEPS-001-v1.0.1'
$staging = Join-Path $stagingRoot 'frontend'
$materializer = Join-Path $Root 'architecture-handoff\architect-to-agents\issued\APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.1.mjs'

function Hash([string]$Path) {
  (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw "Frontend canónico ausente: $source" }
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw "Node exacto ausente: $node" }
if (-not (Test-Path -LiteralPath $materializer -PathType Leaf)) { throw "Materializador ausente: $materializer" }

$sourcePackage = Join-Path $source 'package.json'
$sourceLock = Join-Path $source 'package-lock.json'
if ((Hash $sourcePackage) -ne $expectedBefore.PackageJson) { throw 'package.json canónico fuera del baseline v1.0.1.' }
if ((Hash $sourceLock) -ne $expectedBefore.PackageLock) { throw 'package-lock.json canónico fuera del baseline v1.0.1.' }

if (Test-Path -LiteralPath $stagingRoot) {
  $removed = $false
  1..5 | ForEach-Object {
    try {
      Remove-Item -LiteralPath $stagingRoot -Recurse -Force
      $removed = $true
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  if (-not $removed -and (Test-Path -LiteralPath $stagingRoot)) { throw "No se pudo limpiar staging: $stagingRoot" }
}
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$excludeDirs = @('node_modules', '.next', 'test-results', 'prototype', 'download', '.git')
$excludeFiles = @('*.log', '*.out', '*.err', 'test-result*.json', 'tsconfig.tsbuildinfo')
$arguments = @($source, $staging, '/MIR', '/R:2', '/W:2', '/NFL', '/NDL', '/NP', '/NJH', '/NJS', '/XD') + $excludeDirs + @('/XF') + $excludeFiles
& robocopy @arguments | Out-Null
$robocopyCode = $LASTEXITCODE
if ($robocopyCode -gt 7) { throw "Robocopy falló con código $robocopyCode" }

if ((Hash (Join-Path $staging 'package.json')) -ne $expectedBefore.PackageJson) { throw 'package.json staging no coincide con baseline.' }
if ((Hash (Join-Path $staging 'package-lock.json')) -ne $expectedBefore.PackageLock) { throw 'package-lock staging no coincide con baseline.' }

& $node $materializer $staging
if ($LASTEXITCODE -ne 0) { throw "Materializador falló con exit code $LASTEXITCODE" }

$afterPackage = Hash (Join-Path $staging 'package.json')
$afterLock = Hash (Join-Path $staging 'package-lock.json')
if ($afterPackage -ne $expectedAfter.PackageJson) { throw "Hash candidato package.json inesperado: $afterPackage" }
if ($afterLock -ne $expectedAfter.PackageLock) { throw "Hash candidato package-lock.json inesperado: $afterLock" }

$manifest = [ordered]@{
  vertical = 'APP-SEC-DEPS-001'
  version = 'v1.0.1'
  createdAt = (Get-Date).ToString('o')
  canonicalRoot = $Root
  stagingRoot = $stagingRoot
  stagingFrontend = $staging
  canonicalUntouched = $true
  before = $expectedBefore
  candidate = $expectedAfter
  robocopyExitCode = $robocopyCode
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $stagingRoot 'stage-manifest.json') -Encoding utf8
$manifest | ConvertTo-Json -Depth 5
