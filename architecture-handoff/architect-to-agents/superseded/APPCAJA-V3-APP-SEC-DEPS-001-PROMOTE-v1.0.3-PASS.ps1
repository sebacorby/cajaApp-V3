param(
  [string]$Root = 'C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3',
  [string]$Evidence = 'C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$version = 'v1.0.3'
$baselinePackage = '7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B'
$baselineLock = 'DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED'
$candidatePackage = '5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61'
$candidateLock = '5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B'

$frontend = Join-Path $Root 'workspace\frontend'
$staging = Join-Path $env:LOCALAPPDATA 'CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\candidate\frontend'
$gateFile = Join-Path $Evidence 'GATES-PASS.json'

function Hash([string]$Path) {
  (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

if (-not (Test-Path -LiteralPath $gateFile -PathType Leaf)) { throw "Falta manifiesto PASS: $gateFile" }
$gates = Get-Content -LiteralPath $gateFile -Raw | ConvertFrom-Json
if ($gates.vertical -ne 'APP-SEC-DEPS-001' -or $gates.version -ne $version) { throw "Manifiesto PASS no corresponde a APP-SEC-DEPS-001 $version." }
if ([int]$gates.auditTotal -ne 0) { throw 'npm audit no está en cero.' }
if ([int]$gates.candidateNewFailures -ne 0) { throw 'El candidato introdujo fallos nuevos.' }
if ([int]$gates.baselinePassedCandidateFailed -ne 0) { throw 'Un test que pasa en baseline falla en candidate.' }
if ([int]$gates.playwrightSkipped -ne 0 -or [int]$gates.playwrightRetries -ne 0) { throw 'Playwright contiene skips o retries.' }
if ([int]$gates.fixtureEnoentCount -ne 0) { throw 'Existen ENOENT de fixtures.' }
foreach ($field in @(
  'baselineNpmCi','candidateNpmCi','candidateNpmLs','baselineTypecheck','candidateTypecheck',
  'baselineLint','candidateLint','baselineBuild','candidateBuild','backendHealth',
  'baselineFrontendHealth','candidateFrontendHealth','baselinePlaywright','candidatePlaywright',
  'comparisonPass','cleanup','sqliteRestored'
)) {
  if (-not [bool]$gates.$field) { throw "Gate no confirmado: $field" }
}

$canonicalPackage = Join-Path $frontend 'package.json'
$canonicalLock = Join-Path $frontend 'package-lock.json'
$stagingPackage = Join-Path $staging 'package.json'
$stagingLock = Join-Path $staging 'package-lock.json'

if ((Hash $canonicalPackage) -ne $baselinePackage) { throw 'package.json canónico ya no coincide con baseline.' }
if ((Hash $canonicalLock) -ne $baselineLock) { throw 'package-lock.json canónico ya no coincide con baseline.' }
if ((Hash $stagingPackage) -ne $candidatePackage) { throw 'package.json staging no coincide con candidato validado.' }
if ((Hash $stagingLock) -ne $candidateLock) { throw 'package-lock.json staging no coincide con candidato validado.' }

New-Item -ItemType Directory -Path $Evidence -Force | Out-Null
Copy-Item -LiteralPath $canonicalPackage -Destination (Join-Path $Evidence 'package.json.pre-promotion') -Force
Copy-Item -LiteralPath $canonicalLock -Destination (Join-Path $Evidence 'package-lock.json.pre-promotion') -Force

$tmpPackage = "$canonicalPackage.APP-SEC-DEPS-001.tmp"
$tmpLock = "$canonicalLock.APP-SEC-DEPS-001.tmp"
Copy-Item -LiteralPath $stagingPackage -Destination $tmpPackage -Force
Copy-Item -LiteralPath $stagingLock -Destination $tmpLock -Force

try {
  Move-Item -LiteralPath $tmpPackage -Destination $canonicalPackage -Force
  Move-Item -LiteralPath $tmpLock -Destination $canonicalLock -Force
  if ((Hash $canonicalPackage) -ne $candidatePackage) { throw 'Hash final package.json incorrecto.' }
  if ((Hash $canonicalLock) -ne $candidateLock) { throw 'Hash final package-lock.json incorrecto.' }
} catch {
  Copy-Item -LiteralPath (Join-Path $Evidence 'package.json.pre-promotion') -Destination $canonicalPackage -Force
  Copy-Item -LiteralPath (Join-Path $Evidence 'package-lock.json.pre-promotion') -Destination $canonicalLock -Force
  Remove-Item -LiteralPath $tmpPackage,$tmpLock -Force -ErrorAction SilentlyContinue
  throw
}

$result = [ordered]@{
  vertical = 'APP-SEC-DEPS-001'
  version = $version
  promotedAt = (Get-Date).ToString('o')
  packageJson = Hash $canonicalPackage
  packageLock = Hash $canonicalLock
  source = $staging
  destination = $frontend
}
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $Evidence 'promotion-result.json') -Encoding utf8
$result | ConvertTo-Json -Depth 4
