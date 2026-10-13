$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$secretPath = Join-Path $projectRoot 'backend\.cache\pitchapi-key.xml'
$deepSeekSecretPath = Join-Path $projectRoot 'backend\.cache\deepseek-key.xml'
$snapshotPath = Join-Path $projectRoot 'public\data\advanced.json'
$logPath = Join-Path $projectRoot 'backend\.cache\scheduled-advanced-sync.log'
$javaExecutable = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { 'java.exe' }
$jar = Join-Path $projectRoot 'backend\target\kickoff-backend-0.1.0.jar'

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logPath) | Out-Null
"[$(Get-Date -Format o)] Starting scheduled PitchAPI season sync." | Add-Content -LiteralPath $logPath
if (-not (Test-Path -LiteralPath $secretPath)) { throw "Encrypted PitchAPI key is missing: $secretPath. Reinstall the local schedule." }
if (-not (Test-Path -LiteralPath $jar)) { throw "Backend JAR is missing: $jar. Reinstall the local schedule to build it." }

$secureKey = Import-Clixml -LiteralPath $secretPath
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $env:PITCHAPI_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    $secureKey.Dispose()
}

try {
    $env:KICKOFF_ADVANCED_OUTPUT = 'public/data/advanced.json'
    Push-Location $projectRoot
    try {
        & $javaExecutable -jar $jar --spring.main.web-application-type=none --kickoff.sync-pitch-on-start=true *>> $logPath
        if ($LASTEXITCODE -ne 0) { throw "PitchAPI sync failed with exit code $LASTEXITCODE." }

        if (Test-Path -LiteralPath $deepSeekSecretPath) {
            $deepSeekKey = Import-Clixml -LiteralPath $deepSeekSecretPath
            $deepSeekPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($deepSeekKey)
            try {
                $env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($deepSeekPointer)
            } finally {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($deepSeekPointer)
                $deepSeekKey.Dispose()
            }
            try {
                & node scripts/translate-advanced-names.ts *>> $logPath
                if ($LASTEXITCODE -ne 0) { throw "Player-name translation failed with exit code $LASTEXITCODE." }
            } finally {
                Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
            }
        } else {
            "[$(Get-Date -Format o)] DeepSeek key not saved locally; skipped player-name translation." | Add-Content -LiteralPath $logPath
        }

        $result = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json
        foreach ($leagueName in @('英超', '西甲', '意甲', '德甲', '法甲', '欧冠')) {
            $league = $result.leagues.$leagueName
            if ($null -eq $league -or $league.cardEventsMatches -ne $league.finishedMatches) {
                throw "$leagueName card events are incomplete ($($league.cardEventsMatches)/$($league.finishedMatches))."
            }
            $missingCards = @($league.players | Where-Object {
                $null -eq $_.values.yellowCards -or $null -eq $_.values.redCards
            }).Count
            if ($missingCards -gt 0) { throw "$leagueName has $missingCards player rows without card counts." }
        }
        "[$(Get-Date -Format o)] Sync complete. All six leagues have complete card-event coverage." | Add-Content -LiteralPath $logPath
    } finally {
        Pop-Location
    }
} catch {
    "[$(Get-Date -Format o)] Sync failed: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath
    throw
} finally {
    Remove-Item Env:PITCHAPI_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:KICKOFF_ADVANCED_OUTPUT -ErrorAction SilentlyContinue
}
