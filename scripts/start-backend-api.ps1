$ErrorActionPreference = 'Stop'

$ApiPath = 'D:\Server-Segaloka\services\api'
$Node = 'C:\Program Files\nodejs\node.exe'
$Stdout = 'D:\Server-Segaloka\logs\backend-api.stdout.log'
$Stderr = 'D:\Server-Segaloka\logs\backend-api.stderr.log'

Set-Location -LiteralPath $ApiPath

if (!(Test-Path -LiteralPath '.\src\server.js')) {
    throw 'File server.js tidak ditemukan.'
}

if (!(Test-Path -LiteralPath '.\.env')) {
    throw 'File .env tidak ditemukan.'
}

$Existing = Get-NetTCPConnection `
    -LocalPort 4190 `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($Existing) {
    throw 'Port 4190 sedang digunakan. Tidak menjalankan API kedua.'
}

$Process = Start-Process `
    -FilePath $Node `
    -ArgumentList 'src/server.js' `
    -WorkingDirectory $ApiPath `
    -RedirectStandardOutput $Stdout `
    -RedirectStandardError $Stderr `
    -PassThru `
    -NoNewWindow

Wait-Process -Id $Process.Id

exit $Process.ExitCode