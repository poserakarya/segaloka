param(
  [Parameter(Mandatory=$true)][string]$Database,
  [int]$Port = 5432,
  [string]$HostName = '127.0.0.1',
  [string]$User = 'postgres',
  [string]$OutputDirectory = 'database/backups/runtime'
)
$ErrorActionPreference = 'Stop'
if ($Database -match 'production|prod') { throw 'Production backup requires an approved procedure.' }
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Force $out | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $out ($Database + '-' + $stamp + '.dump')
& 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe' -h $HostName -p $Port -U $User -Fc -f $file $Database
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed: $LASTEXITCODE" }
Write-Output $file
