param([int]$Port = 4193)
$ErrorActionPreference = 'Stop'
$health = Invoke-WebRequest -UseBasicParsing ("http://127.0.0.1:{0}/health" -f $Port)
$ready = Invoke-WebRequest -UseBasicParsing ("http://127.0.0.1:{0}/ready" -f $Port)
[pscustomobject]@{ Health = $health.StatusCode; Ready = $ready.StatusCode; Body = $ready.Content }
