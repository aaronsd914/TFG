# run_e2e.ps1 - Ejecuta los tests E2E de FurniGest en local
# Levanta backend + frontend, espera a que arranquen, corre pytest y limpia.
#
# Uso:
#   .\run_e2e.ps1              -> todos los tests E2E
#   .\run_e2e.ps1 -k login     -> solo tests que contienen "login"
#   npm run test:e2e           -> equivalente al primero
param(
    [string]$k = "",           # filtro -k de pytest (ej: "login", "clientes")
    [switch]$NonHeadless       # pasar para ver el navegador (desactiva --headless)
)

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  FurniGest — Tests E2E (Selenium)    " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------
# 1. Arrancar backend (uvicorn) en background
# -----------------------------------------------------------------------
Write-Host "[1/4] Arrancando backend en puerto 8000..." -ForegroundColor Yellow

$uvicornExe = Join-Path $ROOT ".venv\Scripts\uvicorn.exe"
if (-not (Test-Path $uvicornExe)) {
    Write-Host "ERROR: no se encuentra $uvicornExe" -ForegroundColor Red
    Write-Host "Activa el virtualenv: .\.venv\Scripts\Activate.ps1" -ForegroundColor Red
    exit 1
}

$backendJob = Start-Job -ScriptBlock {
    param($root, $exe)
    Set-Location $root
    & $exe backend.app.main:app --host 127.0.0.1 --port 8000 2>&1
} -ArgumentList $ROOT, $uvicornExe

# -----------------------------------------------------------------------
# 2. Arrancar frontend (vite dev) en background
# -----------------------------------------------------------------------
Write-Host "[2/4] Arrancando frontend en puerto 5173..." -ForegroundColor Yellow

$frontendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location (Join-Path $root "frontend")
    & npm run dev 2>&1
} -ArgumentList $ROOT

# -----------------------------------------------------------------------
# 3. Esperar a que ambos servidores respondan
# -----------------------------------------------------------------------
Write-Host "[3/4] Esperando a que los servidores arranquen..." -ForegroundColor Yellow

$MAX_WAIT = 60   # segundos máximos de espera
$INTERVAL = 2
$elapsed  = 0
$backendOk  = $false
$frontendOk = $false

while ($elapsed -lt $MAX_WAIT) {
    Start-Sleep $INTERVAL
    $elapsed += $INTERVAL

    if (-not $backendOk) {
        try {
            $null = Invoke-WebRequest "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 1
            $backendOk = $true
            Write-Host "  -> backend listo ($elapsed s)" -ForegroundColor Green
        } catch {}
    }
    if (-not $frontendOk) {
        try {
            $null = Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 1
            $frontendOk = $true
            Write-Host "  -> frontend listo ($elapsed s)" -ForegroundColor Green
        } catch {}
    }

    if ($backendOk -and $frontendOk) { break }

    Write-Host "  aguardando... ${elapsed}s  [backend=$backendOk  frontend=$frontendOk]"
}

if (-not $backendOk -or -not $frontendOk) {
    Write-Host ""
    Write-Host "TIMEOUT: los servidores no arrancaron en ${MAX_WAIT}s." -ForegroundColor Red
    Write-Host "Salida del backend:" -ForegroundColor Red
    Receive-Job $backendJob | Select-Object -Last 20 | ForEach-Object { Write-Host "  $_" }
    Write-Host "Salida del frontend:" -ForegroundColor Red
    Receive-Job $frontendJob | Select-Object -Last 20 | ForEach-Object { Write-Host "  $_" }
    Stop-Job $backendJob, $frontendJob
    Remove-Job $backendJob, $frontendJob
    exit 1
}

Write-Host ""

# -----------------------------------------------------------------------
# 4. Ejecutar pytest test/e2e/ -v
# -----------------------------------------------------------------------
Write-Host "[4/4] Ejecutando tests E2E..." -ForegroundColor Yellow
Write-Host ""

$pytestExe = Join-Path $ROOT ".venv\Scripts\pytest.exe"
$pytestArgs = @("test/e2e/", "-v")

if ($k -ne "") {
    $pytestArgs += @("-k", $k)
}

if ($NonHeadless) {
    $env:E2E_HEADLESS = "false"
} else {
    $env:E2E_HEADLESS = "true"
}

$env:E2E_BASE_URL    = "http://localhost:5173"
$env:E2E_BACKEND_URL = "http://127.0.0.1:8000"

Set-Location $ROOT
& $pytestExe @pytestArgs
$exitCode = $LASTEXITCODE

# -----------------------------------------------------------------------
# 5. Limpiar
# -----------------------------------------------------------------------
Write-Host ""
Write-Host "Deteniendo servidores..." -ForegroundColor Yellow

Stop-Job  $backendJob, $frontendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue

# Matar procesos node/uvicorn que pudieran haber quedado
Get-Process -Name "node"    -ErrorAction SilentlyContinue |
    Where-Object { $_.Id -ne $PID } |
    Stop-Process -Force -ErrorAction SilentlyContinue

Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "TODOS LOS TESTS PASARON ✓" -ForegroundColor Green
} else {
    Write-Host "HAY TESTS FALLIDOS (exit code $exitCode)" -ForegroundColor Red
}
Write-Host ""

exit $exitCode
