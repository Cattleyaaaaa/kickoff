$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$secretDirectory = Join-Path $projectRoot 'backend\.cache'
$secretPath = Join-Path $secretDirectory 'deepseek-key.xml'
Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath 'public/data/football.json')) {
        throw 'Local football.json is missing. Sync football data first.'
    }
    if (Test-Path -LiteralPath $secretPath) {
        try {
            $secureKey = Import-Clixml -LiteralPath $secretPath
            Write-Host 'Using the DeepSeek key encrypted for this Windows user.'
        } catch {
            Write-Warning 'The saved key was encrypted for another Windows account or device; enter the key again to save it for this account.'
            $secureKey = Read-Host -Prompt 'DeepSeek API Key (hidden; saved encrypted for this Windows user)' -AsSecureString
            if ($secureKey.Length -eq 0) { $secureKey.Dispose(); throw 'DeepSeek API Key cannot be empty.' }
            $secureKey | Export-Clixml -LiteralPath $secretPath
        }
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
        npm run generate:news
        if ($LASTEXITCODE -ne 0) { throw "News drafting failed with exit code $LASTEXITCODE." }
        npm run publish:news
        if ($LASTEXITCODE -ne 0) { throw "News translation/publication failed with exit code $LASTEXITCODE." }
    } finally {
        Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
    }
} finally {
    Pop-Location
}
