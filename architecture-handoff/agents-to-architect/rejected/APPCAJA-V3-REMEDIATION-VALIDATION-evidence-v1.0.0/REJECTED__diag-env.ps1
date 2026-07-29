Write-Host "=== Environment Diagnostics ==="
Write-Host "NodeHome: $NodeHome"
Write-Host "env:PATH null? $($env:PATH -eq $null)"
Write-Host "env:PATH empty? $([string]::IsNullOrWhiteSpace($env:PATH))"
if ($env:PATH) {
    $parts = $env:PATH -split ';'
    Write-Host "PATH parts count: $($parts.Length)"
    Write-Host "First part: $($parts | Select-Object -First 1)"
} else {
    Write-Host "PATH is null or empty!"
}

$RequiredNodeVersion = "v24.18.0"
$PreferredNodeHome = "I:\Tools\node-v24.18.0-win-x64"
$preferredNode = Join-Path $PreferredNodeHome "node.exe"
Write-Host "PreferredNode: $preferredNode"
Write-Host "PreferredNode exists? $(Test-Path -LiteralPath $preferredNode -PathType Leaf)"

if (Test-Path -LiteralPath $preferredNode -PathType Leaf) {
    $version = (& $preferredNode --version 2>&1).Trim()
    Write-Host "Version: $version"
    Write-Host "Version match? $($version -eq $RequiredNodeVersion)"
}

$candidates = @(& where.exe node 2>&1 | Where-Object { $_ -and ($_ -match '\.exe\s*$') })
Write-Host "where.exe candidates count: $($candidates.Length)"
foreach ($c in $candidates) {
    Write-Host "  candidate: $c"
}
