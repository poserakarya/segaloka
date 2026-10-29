
$ErrorActionPreference = 'Stop'

$Root = 'D:\Server-Segaloka'
$Web = Join-Path $Root 'projects\Segaloka-webs'
$Header = Join-Path $Web 'src\components\home\Header.tsx'
$SourceIcons = Join-Path $Root 'services\api\public\traveler-auth\icons'
$TargetIcons = Join-Path $Web 'public\images\auth'

foreach ($File in @(
    $Header,
    (Join-Path $SourceIcons 'google.svg'),
    (Join-Path $SourceIcons 'phone.svg'),
    (Join-Path $SourceIcons 'email.svg')
)) {
    if (!(Test-Path -LiteralPath $File)) {
        throw "STOP: File tidak ditemukan: $File"
    }
}

$Text = [System.IO.File]::ReadAllText($Header)

$Start = '<div className="sg-auth-modal-actions">'
$End = '<div className="sg-auth-divider">'

$StartIndex = $Text.IndexOf($Start)

if ($StartIndex -lt 0) {
    throw 'STOP: Blok tombol login tidak ditemukan.'
}

$EndIndex = $Text.IndexOf($End, $StartIndex)

if ($EndIndex -lt 0) {
    throw 'STOP: Penutup blok login tidak ditemukan.'
}

if ($Text.IndexOf($Start, $StartIndex + 1) -ge 0) {
    throw 'STOP: Blok tombol login ditemukan lebih dari satu.'
}

$NewActions = @'
<div className="sg-auth-modal-actions">

  <a
    href="https://api.segaloka.com/auth/google/start"
    className="sg-auth-provider sg-auth-google"
  >
    <img
      src="/images/auth/google.svg"
      alt=""
      width={24}
      height={24}
    />
    <strong>Lanjutkan dengan Google</strong>
  </a>

  <a
    href="/daftar"
    className="sg-auth-provider sg-auth-email"
  >
    <img
      src="/images/auth/phone.svg"
      alt=""
      width={24}
      height={24}
    />
    <strong>Lanjutkan dengan Nomor HP</strong>
  </a>

  <a
    href="/daftar"
    className="sg-auth-provider sg-auth-email"
  >
    <img
      src="/images/auth/email.svg"
      alt=""
      width={24}
      height={24}
    />
    <strong>Lanjutkan dengan Email</strong>
  </a>

</div>

'@

$NewText = $Text.Substring(0, $StartIndex) +
    $NewActions +
    $Text.Substring($EndIndex)

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Backup = "$Header.bak-$Stamp"

Write-Host 'Membuat backup...' -ForegroundColor Cyan
Copy-Item -LiteralPath $Header -Destination $Backup

$CreatedIcons = @()
$OriginalIcons = @{}

try {
    New-Item -ItemType Directory -Force -Path $TargetIcons |
        Out-Null

    foreach ($Name in @('google.svg','phone.svg','email.svg')) {
        $Source = Join-Path $SourceIcons $Name
        $Destination = Join-Path $TargetIcons $Name

        if (Test-Path -LiteralPath $Destination) {
            $OriginalIcons[$Name] = [System.IO.File]::ReadAllBytes($Destination)
        }
        else {
            $CreatedIcons += $Destination
        }

        Copy-Item -LiteralPath $Source -Destination $Destination -Force
    }

    $Utf8 = [System.Text.UTF8Encoding]::new($false)

    [System.IO.File]::WriteAllText(
        $Header,
        $NewText,
        $Utf8
    )

    Write-Host 'Memeriksa TypeScript...' -ForegroundColor Cyan

    Set-Location $Web
    pnpm exec tsc --noEmit

    if ($LASTEXITCODE -ne 0) {
        throw 'TypeScript check gagal.'
    }

    Write-Host 'Menjalankan build Marketplace...' -ForegroundColor Cyan

    pnpm build

    if ($LASTEXITCODE -ne 0) {
        throw 'Build Marketplace gagal.'
    }

    Write-Host ''
    Write-Host 'PASS: Modal login Marketplace diperbarui.' -ForegroundColor Green
    Write-Host 'PASS: Ikon Google terpasang.'
    Write-Host 'PASS: Ikon Nomor HP terpasang.'
    Write-Host 'PASS: Ikon Email terpasang.'
    Write-Host 'PASS: TypeScript check berhasil.'
    Write-Host 'PASS: Build Marketplace berhasil.'
    Write-Host "Backup: $Backup"
}
catch {
    Copy-Item -LiteralPath $Backup -Destination $Header -Force

    foreach ($Name in $OriginalIcons.Keys) {
        [System.IO.File]::WriteAllBytes(
            (Join-Path $TargetIcons $Name),
            $OriginalIcons[$Name]
        )
    }

    foreach ($File in $CreatedIcons) {
        if (Test-Path -LiteralPath $File) {
            Remove-Item -LiteralPath $File -Force
        }
    }

    Write-Host 'Perubahan source dikembalikan dari backup.' -ForegroundColor Yellow
    throw
}
