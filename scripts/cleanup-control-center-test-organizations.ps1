param(
  [switch]$ConfirmDelete,
  [string]$Manifest = (Join-Path $PSScriptRoot '..\test-data\control-center-organizations-20261020.csv')
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Manifest)) { throw "Manifest not found: $Manifest" }
$rows = @(Import-Csv -LiteralPath $Manifest)
if ($rows.Count -ne 10) { throw "Manifest must contain exactly 10 records." }
$ids = @($rows | ForEach-Object { $_.id })
if (($ids | Where-Object { $_ -notmatch '^[0-9a-fA-F-]{36}$' }).Count) { throw 'Manifest contains an invalid UUID.' }
$idList = ($ids | ForEach-Object { "'$_'::uuid" }) -join ','
$sql = @"
SELECT id, name, organization_type FROM public.organizations
WHERE id IN ($idList) ORDER BY organization_type, name;
SELECT conrelid::regclass AS table_name, conname
FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.organizations'::regclass;
"@
if (-not $ConfirmDelete) {
  Write-Output 'DRY-RUN only. No records will be deleted.'
  docker compose -f (Join-Path $PSScriptRoot '..\docker\compose.yaml') exec -T postgres sh -lc "psql -U \`$POSTGRES_USER -d \`$POSTGRES_DB -c '$($sql.Replace("'", "''"))'"
  exit 0
}
throw 'Explicit deletion execution is intentionally not wired; review dependents before adding a deletion command.'
