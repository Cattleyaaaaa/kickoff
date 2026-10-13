$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$javaExecutable = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { '' }
if (-not $javaExecutable -or -not (Test-Path -LiteralPath $javaExecutable)) {
    throw 'JAVA_HOME must point to a working JDK.'
}
$mavenExecutable = Get-Command mvn -ErrorAction Stop
$snapshot = Join-Path $projectRoot 'public\data\advanced.json'
if (-not (Test-Path -LiteralPath $snapshot)) { throw "Existing snapshot is missing: $snapshot" }

Push-Location $projectRoot
try {
    $mavenRepository = Join-Path $projectRoot 'backend\.m2\repository'
    New-Item -ItemType Directory -Force -Path $mavenRepository | Out-Null
    & $mavenExecutable.Source -B "-Dmaven.repo.local=$mavenRepository" -f backend/pom.xml '-DskipTests' package
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed with exit code $LASTEXITCODE." }
    $storedKeyPath = Join-Path $projectRoot 'backend\.cache\pitchapi-key.xml'
    if (Test-Path -LiteralPath $storedKeyPath) {
        try {
            $secureKey = Import-Clixml -LiteralPath $storedKeyPath -ErrorAction Stop
            Write-Host 'Using the PitchAPI key already encrypted for this Windows user.'
        } catch {
            Write-Warning 'The saved key cannot be decrypted in this Windows session; enter it once to continue.'
            $secureKey = Read-Host -Prompt 'PitchAPI Key (hidden)' -AsSecureString
        }
    } else {
        $secureKey = Read-Host -Prompt 'PitchAPI Key (hidden)' -AsSecureString
    }
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    try {
        $env:PITCHAPI_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
        $secureKey.Dispose()
    }
    try {
        $env:KICKOFF_ADVANCED_OUTPUT = 'public/data/advanced.json'
        & $javaExecutable -jar backend/target/kickoff-backend-0.1.0.jar --spring.main.web-application-type=none --kickoff.sync-pitch-cards-on-start=true
        if ($LASTEXITCODE -ne 0) { throw "Card backfill failed with exit code $LASTEXITCODE." }
        $result = Get-Content -LiteralPath $snapshot -Raw | ConvertFrom-Json
        foreach ($leagueName in @('英超', '西甲', '意甲', '德甲', '法甲', '欧冠')) {
            $league = $result.leagues.$leagueName
            if ($null -eq $league -or $league.cardEventsMatches -ne $league.finishedMatches) {
                throw "$leagueName card events are incomplete ($($league.cardEventsMatches)/$($league.finishedMatches)); the previous snapshot was preserved."
            }
            $missingCards = @($league.players | Where-Object {
                $null -eq $_.values.yellowCards -or $null -eq $_.values.redCards
            }).Count
            if ($missingCards -gt 0) {
                throw "$leagueName still has $missingCards player rows without card counts; the snapshot needs inspection."
            }
            Write-Host "$leagueName`: card events $($league.cardEventsMatches)/$($league.finishedMatches); player rows $($league.players.Count) include yellow and red card counts."
        }
        Write-Host "Player cards are ready: $snapshot"
    } finally {
        Remove-Item Env:PITCHAPI_KEY -ErrorAction SilentlyContinue
        Remove-Item Env:KICKOFF_ADVANCED_OUTPUT -ErrorAction SilentlyContinue
    }
} finally {
    Pop-Location
}
