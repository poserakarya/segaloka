$ErrorActionPreference = 'Stop'

$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root    = Split-Path (Split-Path $AppRoot -Parent) -Parent
$Runtime = Join-Path $AppRoot 'runtime'
$Dist    = Join-Path $AppRoot 'dist'

New-Item -ItemType Directory -Force -Path $Dist | Out-Null

$Files = @(
    'control-center-context.js',
    'control-center-route-guard.js',

    'i18n.js',
    'data.js',
    'core.js',

    'pages_a.js',
    'pages_b.js',
    'pages_c.js',
    'pages_d.js',
    'pages_e.js',
    'pages_f.js',
    'pages_g.js',

    'segadeals.js',
    'flows.js',
    'reviews.js',
    'sdterms.js',
    'gateway.js',
    'regfee.js',
    'omni.js',
    'datamode.js',
    'notify.js',
    'sync.js',

    'main.js',
    'boot.js'
)

$Bundle = Join-Path $Dist 'control-center.bundle.js'

$Builder = New-Object System.Text.StringBuilder

foreach ($File in $Files) {

    $Path = Join-Path $Runtime $File

    if (-not (Test-Path $Path)) {
        throw "Dependency tidak ditemukan: $Path"
    }

    [void]$Builder.AppendLine("")
    [void]$Builder.AppendLine("/* ===== $File ===== */")
    [void]$Builder.AppendLine(
        [System.IO.File]::ReadAllText($Path)
    )
}

[System.IO.File]::WriteAllText(
    $Bundle,
    $Builder.ToString(),
    [System.Text.UTF8Encoding]::new($false)
)

# JavaScript syntax validation
node --check $Bundle

if ($LASTEXITCODE -ne 0) {
    throw 'Control Center bundle gagal node --check.'
}


# ------------------------------------------------------------
# HARD BOUNDARY VALIDATION
# ------------------------------------------------------------

$Source = [System.IO.File]::ReadAllText($Bundle)

$Forbidden = @(
    'data-act="ws"',
    'data-act="pent-pick"',
    'data-act="pent-set"',
    'Pindah workspace',
    'Pindah Workspace',
    'renderPortalSide('
)

$Leaks = @()

foreach ($Pattern in $Forbidden) {

    if ($Source.Contains($Pattern)) {
        $Leaks += $Pattern
    }
}

if ($Leaks.Count -gt 0) {

    Write-Host ''
    Write-Host 'CONTROL CENTER BOUNDARY FAILED' -ForegroundColor Red

    $Leaks | ForEach-Object {
        Write-Host "  LEAK: $_" -ForegroundColor Red
    }

    throw 'Control Center masih mengandung UI/runtime workspace portal.'
}

Write-Host ''
Write-Host 'CONTROL CENTER BOUNDARY OK' -ForegroundColor Green
Write-Host "Bundle: $Bundle"