$preferredNode = "I:\Tools\node-v24.18.0-win-x64\node.exe"
Write-Host "Node path: $preferredNode"
Write-Host "Exists: $(Test-Path $preferredNode)"

# Method 1: direct invocation
$output1 = & $preferredNode --version 2>&1
Write-Host "Output1 type: $($output1.GetType().FullName)"
Write-Host "Output1 value: $output1"
Write-Host "Output1 is null: $($output1 -eq $null)"

# Method 2: capture then trim
if ($output1 -ne $null) {
    $trimmed = $output1.Trim()
    Write-Host "Trimmed: $trimmed"
} else {
    Write-Host "Output1 is null, cannot trim"
}

# Method 3: use invoke-expression
$output3 = Invoke-Expression "& '$preferredNode' --version"
Write-Host "Output3: $output3"
