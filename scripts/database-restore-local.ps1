param(
  [Parameter(Mandatory=$true)][string]$DumpFile,
  [string]$Database = 'segaloka_local_e2e',
  [int]$Port = 5432,
  [string]$User = 'postgres'
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^segaloka_local_') { throw 'Restore is restricted to segaloka_local_*.' }
if (-not (Test-Path -LiteralPath $DumpFile)) { throw "Dump not found: $DumpFile" }
& 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe' -h 127.0.0.1 -p $Port -U $User -d $Database --clean --if-exists --no-owner $DumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed: $LASTEXITCODE" }
