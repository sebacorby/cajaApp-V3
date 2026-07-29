param(
  [string]$Root = 'C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$version = 'v1.0.3'
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
$stagingRoot = Join-Path $env:LOCALAPPDATA 'CajaApp\validation\APP-SEC-DEPS-001-v1.0.3'
$baseline = Join-Path $stagingRoot 'baseline\frontend'
$candidate = Join-Path $stagingRoot 'candidate\frontend'
$materializer = Join-Path $Root 'architecture-handoff\architect-to-agents\issued\APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.3.mjs'

$visaSource = Join-Path $Root 'docs\08-artifacts\visa-galicia-julio2026.pdf'
$salarySource = Join-Path $Root 'contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf'
$visaTarget = Join-Path $env:LOCALAPPDATA 'CajaApp\validation\docs\08-artifacts\visa-galicia-julio2026.pdf'
$salaryTarget = Join-Path $env:LOCALAPPDATA 'CajaApp\validation\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf'

function Hash([string]$Path) {
  (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Assert-Leaf([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$Label ausente: $Path" }
}

function Copy-Frontend([string]$From, [string]$To) {
  New-Item -ItemType Directory -Path $To -Force | Out-Null
  $excludeDirs = @('node_modules', '.next', 'test-results', 'prototype', 'download', '.git')
  $excludeFiles = @('*.log', '*.out', '*.err', 'test-result*.json', 'tsconfig.tsbuildinfo')
  $arguments = @($From, $To, '/MIR', '/R:2', '/W:2', '/NFL', '/NDL', '/NP', '/NJH', '/NJS', '/XD') + $excludeDirs + @('/XF') + $excludeFiles
  & robocopy @arguments | Out-Null
  $code = $LASTEXITCODE
  if ($code -gt 7) { throw "Robocopy falló con código $code para $To" }
  return $code
}

if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw "Frontend canónico ausente: $source" }
Assert-Leaf $node 'Node exacto'
Assert-Leaf $materializer 'Materializador v1.0.3'
Assert-Leaf $visaSource 'Fixture Visa Galicia en Dropbox'
Assert-Leaf $salarySource 'Fixture recibo de sueldo en Dropbox'

$sourcePackage = Join-Path $source 'package.json'
$sourceLock = Join-Path $source 'package-lock.json'
if ((Hash $sourcePackage) -ne $expectedBefore.PackageJson) { throw 'package.json canónico fuera del baseline.' }
if ((Hash $sourceLock) -ne $expectedBefore.PackageLock) { throw 'package-lock.json canónico fuera del baseline.' }

if (Test-Path -LiteralPath $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

$baselineCopyCode = Copy-Frontend $source $baseline
$candidateCopyCode = Copy-Frontend $source $candidate

foreach ($path in @(
  (Join-Path $baseline 'package.json'),
  (Join-Path $candidate 'package.json')
)) {
  if ((Hash $path) -ne $expectedBefore.PackageJson) { throw "package.json staging no coincide con baseline: $path" }
}
foreach ($path in @(
  (Join-Path $baseline 'package-lock.json'),
  (Join-Path $candidate 'package-lock.json')
)) {
  if ((Hash $path) -ne $expectedBefore.PackageLock) { throw "package-lock staging no coincide con baseline: $path" }
}

& $node $materializer $candidate
if ($LASTEXITCODE -ne 0) { throw "Materializador v1.0.3 falló con exit code $LASTEXITCODE" }
if ((Hash (Join-Path $candidate 'package.json')) -ne $expectedAfter.PackageJson) { throw 'Hash candidato package.json inesperado.' }
if ((Hash (Join-Path $candidate 'package-lock.json')) -ne $expectedAfter.PackageLock) { throw 'Hash candidato package-lock.json inesperado.' }

New-Item -ItemType Directory -Path (Split-Path -Parent $visaTarget) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path -Parent $salaryTarget) -Force | Out-Null
Copy-Item -LiteralPath $visaSource -Destination $visaTarget -Force
Copy-Item -LiteralPath $salarySource -Destination $salaryTarget -Force

$fixtures = @(
  [ordered]@{ name = 'visa-galicia-julio2026.pdf'; source = $visaSource; target = $visaTarget; size = (Get-Item -LiteralPath $visaTarget).Length; sha256 = Hash $visaTarget },
  [ordered]@{ name = 'salary-receipt.sanitized.base.pdf'; source = $salarySource; target = $salaryTarget; size = (Get-Item -LiteralPath $salaryTarget).Length; sha256 = Hash $salaryTarget }
)
$fixtures | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $stagingRoot 'fixtures-manifest.json') -Encoding utf8

$manifest = [ordered]@{
  vertical = 'APP-SEC-DEPS-001'
  version = $version
  createdAt = (Get-Date).ToString('o')
  canonicalRoot = $Root
  canonicalFrontend = $source
  canonicalUntouched = $true
  stagingRoot = $stagingRoot
  baselineFrontend = $baseline
  candidateFrontend = $candidate
  before = $expectedBefore
  candidate = $expectedAfter
  baselineCopyExitCode = $baselineCopyCode
  candidateCopyExitCode = $candidateCopyCode
  fixtures = $fixtures
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $stagingRoot 'stage-manifest.json') -Encoding utf8
$manifest | ConvertTo-Json -Depth 8
