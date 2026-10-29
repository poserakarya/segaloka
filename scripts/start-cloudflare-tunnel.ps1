$ErrorActionPreference = 'Stop'

$Cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$TokenFile = 'D:\Server-Segaloka\docker\cloudflared\tunnel-token.txt'
$LogFile = 'D:\Server-Segaloka\logs\cloudflare-tunnel.log'

if (!(Test-Path -LiteralPath $Cloudflared)) {
    throw 'Cloudflared executable tidak ditemukan.'
}

if (!(Test-Path -LiteralPath $TokenFile)) {
    throw 'Token Segaloka tidak ditemukan.'
}

& $Cloudflared tunnel `
    --no-autoupdate `
    --protocol http2 `
    --edge-ip-version 6 `
    --loglevel info `
    --logfile $LogFile `
    run `
    --token-file $TokenFile

if ($LASTEXITCODE -ne 0) {
    throw "Cloudflared berhenti dengan ExitCode $LASTEXITCODE"
}