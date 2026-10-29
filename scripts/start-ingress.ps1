$ErrorActionPreference = 'Stop'

$IngressPath = 'D:\Server-Segaloka\services\ingress'
$Node = 'C:\Program Files\nodejs\node.exe'

Set-Location -LiteralPath $IngressPath

if (!(Test-Path -LiteralPath '.\.env')) {
    throw 'Konfigurasi ingress tidak ditemukan.'
}

if (Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port ingress sudah digunakan.'
}

$Keys = @(
    'INGRESS_PORT',
    'INGRESS_TARGET',
    'ORIGIN_AUTH_SECRET',
    'INGRESS_IDENTITY_SECRET'
)

foreach ($Line in [IO.File]::ReadAllLines('.\.env')) {
    if ($Line -match '^\s*(#|$)') { continue }

    $Parts = $Line.Split('=', 2)
    if ($Parts.Count -ne 2) {
        throw 'Format konfigurasi ingress tidak valid.'
    }

    if ($Parts[0] -notin $Keys) {
        throw 'Kunci konfigurasi ingress tidak dikenal.'
    }

    [Environment]::SetEnvironmentVariable(
        $Parts[0],
        $Parts[1],
        'Process'
    )
}

& $Node 'src\server.mjs'
exit $LASTEXITCODE