$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
try {
    # Windows JDK NIO uses Unix-domain sockets internally. Keep their directory short.
    $socketDir = Join-Path $repoRoot '.runtime/sockets'
    New-Item -ItemType Directory -Force -Path $socketDir | Out-Null
    $socketDir = $socketDir.Replace('\', '/')
    & mvn -B spring-boot:run '-Dspring-boot.run.profiles=compose,local' "-Dspring-boot.run.jvmArguments=-Djdk.net.unixdomain.tmpdir=$socketDir"
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
}
finally { Pop-Location }
