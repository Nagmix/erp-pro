param(
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

Write-Step "Checking Docker CLI"
docker --version | Out-Null
docker compose version | Out-Null

Write-Step "Ensuring we are in project root"
Set-Location (Resolve-Path "$PSScriptRoot/..")

$buildArgs = @("compose", "build", "frontend")
if ($NoCache) {
    $buildArgs += "--no-cache"
}

Write-Step "Building frontend image"
docker @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Docker build failed (exit $LASTEXITCODE). Fix the error above; containers were not restarted." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Step "Restarting frontend and backend containers"
docker compose up -d frontend backend
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Step "Current compose status"
docker compose ps

Write-Step "Frontend latest logs"
docker compose logs frontend --tail 40

Write-Host ""
Write-Host "Done. ERP Pro should be available on http://localhost:3000" -ForegroundColor Green
