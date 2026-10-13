$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskName = 'Kickoff Advanced Football Data'
$javaExecutable = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { '' }
if (-not $javaExecutable -or -not (Test-Path -LiteralPath $javaExecutable)) {
    throw 'JAVA_HOME must point to a working JDK 21 or newer.'
}
$mavenExecutable = Get-Command mvn -ErrorAction Stop
$secretDirectory = Join-Path $projectRoot 'backend\.cache'
$secretPath = Join-Path $secretDirectory 'pitchapi-key.xml'
$runnerPath = Join-Path $projectRoot 'scripts\run-local-advanced-scheduled.ps1'
if (-not (Test-Path -LiteralPath $runnerPath)) { throw "Scheduled runner is missing: $runnerPath" }

Push-Location $projectRoot
try {
    Write-Host 'Building the local data synchronizer...'
    & $mavenExecutable.Source -B -f backend/pom.xml '-Dmaven.repo.local=backend/.m2' '-DskipTests' package
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed with exit code $LASTEXITCODE." }

    $secureKey = Read-Host -Prompt 'PitchAPI Key (hidden; stored encrypted for this Windows user)' -AsSecureString
    if ($secureKey.Length -eq 0) { $secureKey.Dispose(); throw 'PitchAPI Key cannot be empty.' }
    try {
        New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null
        $secureKey | Export-Clixml -LiteralPath $secretPath
    } finally {
        $secureKey.Dispose()
    }

    $powerShell = Join-Path $PSHOME 'powershell.exe'
    $action = New-ScheduledTaskAction -Execute $powerShell `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`"" `
        -WorkingDirectory $projectRoot
    $triggers = @(
        (New-ScheduledTaskTrigger -Daily -At '06:00'),
        (New-ScheduledTaskTrigger -Daily -At '18:00')
    )
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
    $task = New-ScheduledTask -Action $action -Trigger $triggers -Principal $principal -Settings $settings `
        -Description 'Refresh local PitchAPI team and player statistics, including yellow and red cards, at 06:00 and 18:00.'
    Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
    Write-Host "Installed '$taskName' for 06:00 and 18:00 local time. The computer must be on and you must be signed in."
    Write-Host 'Starting the first refresh now; progress and future run logs are saved to backend\.cache\scheduled-advanced-sync.log.'
    Start-ScheduledTask -TaskName $taskName
} finally {
    Pop-Location
}
