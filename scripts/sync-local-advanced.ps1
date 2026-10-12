$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$javaExecutable = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { '' }
if (-not $javaExecutable -or -not (Test-Path -LiteralPath $javaExecutable)) {
    throw 'JAVA_HOME must point to a working JDK. Maven uses JAVA_HOME on this machine.'
}

$jar = Join-Path $projectRoot 'backend\target\kickoff-backend-0.1.0.jar'
if (-not (Test-Path -LiteralPath $jar)) {
    throw 'Backend JAR is missing. Run: mvn -f backend/pom.xml -DskipTests package'
}

$secureKey = Read-Host -Prompt 'PitchAPI Key (hidden)' -AsSecureString
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
        & $javaExecutable -jar $jar --spring.main.web-application-type=none --kickoff.sync-pitch-on-start=true
        if ($LASTEXITCODE -ne 0) { throw "PitchAPI sync failed with exit code $LASTEXITCODE." }
        $snapshot = Join-Path $projectRoot 'public\data\advanced.json'
        if (-not (Test-Path -LiteralPath $snapshot)) { throw 'Sync finished but advanced.json was not created.' }
        Write-Host "Local advanced data is ready: $snapshot"
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item Env:PITCHAPI_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:KICKOFF_ADVANCED_OUTPUT -ErrorAction SilentlyContinue
}
