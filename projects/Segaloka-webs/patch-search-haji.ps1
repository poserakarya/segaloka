$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\QiblatGo\Desktop\segaloka-app\Segaloka-webs'
$Path = 'src\components\search\SearchEditBar.tsx'
$Backup = "$Path.before-haji-year-ui.bak"
if (Test-Path -LiteralPath $Backup) { throw "Backup sudah ada: $Backup" }
$Full = (Resolve-Path -LiteralPath $Path).Path
$Source = [IO.File]::ReadAllText($Full)
$Newline = if ($Source.Contains("`r`n")) { "`r`n" } else { "`n" }
$Text = $Source.Replace("`r`n", "`n")
if ($Text.Contains('SEGALOKA_HAJI_YEAR_UI_V1')) { throw 'Patch Haji sudah diterapkan.' }
if (-not $Text.Contains('  initialYear,')) { throw 'initialYear belum diteruskan ke SearchEditBar.' }
function Replace-Once([string]$Old,[string]$New) {
  $count = [regex]::Matches($script:Text,[regex]::Escape($Old)).Count
  if ($count -ne 1) { throw "Pola tidak unik/tidak ditemukan ($count): $Old" }
  $script:Text = $script:Text.Replace($Old,$New)
}
Replace-Once '  const t = copy[language];' @'
  const t = copy[language];
  // SEGALOKA_HAJI_YEAR_UI_V1
  const isHaji = category.trim().toLowerCase() === "haji";
  const hajiYearLabel = language === "EN" ? "Hajj Year" : language === "AR" ? "سنة الحج" : "Tahun Haji";
  const hajiYearTitle = language === "EN" ? "Choose Hajj Year" : language === "AR" ? "اختر سنة الحج" : "Pilih Tahun Haji";
  const hajiYearPassed = language === "EN" ? "Passed" : language === "AR" ? "انتهى" : "Lewat";
'@
Replace-Once '  const parsedInitialDate =' @'
  const [selectedHajiYear, setSelectedHajiYear] = useState<number | null>(() => {
    const parsed = Number(initialYear);
    return /^\d{4}$/.test(initialYear) && Number.isInteger(parsed) ? parsed : null;
  });

  useEffect(() => {
    const parsed = Number(initialYear);
    setSelectedHajiYear(/^\d{4}$/.test(initialYear) && Number.isInteger(parsed) ? parsed : null);
  }, [initialYear]);

  const currentHajiYear = new Date().getFullYear();
  const hajiYears = Array.from({ length: 6 }, (_, index) => currentHajiYear + index);
  const isValidHajiYear = (value: number | null) =>
    value !== null && hajiYears.includes(value) && value !== 2026;

  const parsedInitialDate =
'@
Replace-Once '    selectedDate.length > 0;' '    (isHaji ? isValidHajiYear(selectedHajiYear) : selectedDate.length > 0);'
Replace-Once @'
    params.set(
      "date",
      selectedDate,
    );
'@ @'
    if (isHaji) {
      params.set("year", String(selectedHajiYear));
    } else {
      params.set("date", selectedDate);
    }
'@
Replace-Once @'
              {t.date}
'@ @'
              {isHaji ? hajiYearLabel : t.date}
'@
Replace-Once @'
              {formatSelectedDate()}
'@ @'
              {isHaji ? (selectedHajiYear ? String(selectedHajiYear) : hajiYearTitle) : formatSelectedDate()}
'@
Replace-Once @'
        {panel === "date" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-date">
'@ @'
        {isHaji && panel === "date" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-year">
            <div className="search-unified-dropdown-head">
              <strong>{hajiYearTitle}</strong>
              <button type="button" className="search-unified-close" aria-label={language === "EN" ? "Close" : language === "AR" ? "إغلاق" : "Tutup"} onClick={() => setPanel(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="search-haji-year-options" role="group" aria-label={hajiYearTitle}>
              {hajiYears.map((year) => {
                const disabled = year === 2026;
                return (
                  <button
                    key={year}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selectedHajiYear === year}
                    className={selectedHajiYear === year ? "selected" : undefined}
                    onClick={() => { setSelectedHajiYear(year); setPanel(null); }}
                  >
                    <span>{year}</span>
                    {disabled && <small>{hajiYearPassed}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isHaji && panel === "date" && (
          <div className="search-edit-dropdown search-unified-dropdown search-unified-date">
'@
# Verify output before touching original.
$checks = @('SEGALOKA_HAJI_YEAR_UI_V1','search-haji-year-options','params.set("year", String(selectedHajiYear))','!isHaji && panel === "date"')
foreach ($check in $checks) { if (-not $Text.Contains($check)) { throw "Validasi patch gagal: $check" } }
Copy-Item -LiteralPath $Path -Destination $Backup
[IO.File]::WriteAllText($Full,$Text.Replace("`n",$Newline),[Text.UTF8Encoding]::new($false))
Write-Host 'Patch Search Haji diterapkan. Menjalankan build...' -ForegroundColor Cyan
pnpm build
if ($LASTEXITCODE -ne 0) { throw "Build gagal. Restore dengan: Copy-Item -LiteralPath '$Backup' -Destination '$Path' -Force" }
Write-Host 'BUILD BERHASIL. Lanjutkan pemeriksaan UI browser.' -ForegroundColor Green
