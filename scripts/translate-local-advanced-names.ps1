$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$secretDirectory = Join-Path $projectRoot 'backend\.cache'
$secretPath = Join-Path $secretDirectory 'deepseek-key.xml'
Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath 'public/data/advanced.json')) {
        throw 'Local advanced.json is missing. Generate the local PitchAPI snapshot first.'
    }
    if (Test-Path -LiteralPath $secretPath) {
        $secureKey = Import-Clixml -LiteralPath $secretPath
        Write-Host 'Using the DeepSeek key encrypted for this Windows user.'
    } else {
        $secureKey = Read-Host -Prompt 'DeepSeek API Key (hidden; saved encrypted for this Windows user)' -AsSecureString
        if ($secureKey.Length -eq 0) { $secureKey.Dispose(); throw 'DeepSeek API Key cannot be empty.' }
        New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null
        $secureKey | Export-Clixml -LiteralPath $secretPath
    }
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    try {
        $env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
        $secureKey.Dispose()
    }
    try {
        & node scripts/translate-advanced-names.ts
        if ($LASTEXITCODE -ne 0) { throw "Name translation failed with exit code $LASTEXITCODE. Completed batches are saved." }
    } finally {
        Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
    }
} finally {
    Pop-Location
}
