$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker compose --profile app stop
    if ($LASTEXITCODE -ne 0) { throw 'Failed to stop project containers' }
} finally { Pop-Location }
