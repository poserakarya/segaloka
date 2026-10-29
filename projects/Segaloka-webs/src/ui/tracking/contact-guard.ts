export type ContactGuardResult = {
  blocked: boolean;
  reason: "phone" | "email" | null;
};

export type ContactGuardMode =
  | "message"
  | "filename"
  | "document";

const WORD_DIGITS: ReadonlyArray<
  readonly [RegExp, string]
> = [
  // Indonesian
  [/\b(?:nol|kosong)\b/giu, "0"],
  [/\bsatu\b/giu, "1"],
  [/\bdua\b/giu, "2"],
  [/\btiga\b/giu, "3"],
  [/\bempat\b/giu, "4"],
  [/\blima\b/giu, "5"],
  [/\benam\b/giu, "6"],
  [/\btujuh\b/giu, "7"],
  [/\bdelapan\b/giu, "8"],
  [/\bsembilan\b/giu, "9"],

  // English
  [/\bzero\b/giu, "0"],
  [/\bone\b/giu, "1"],
  [/\btwo\b/giu, "2"],
  [/\bthree\b/giu, "3"],
  [/\bfour\b/giu, "4"],
  [/\bfive\b/giu, "5"],
  [/\bsix\b/giu, "6"],
  [/\bseven\b/giu, "7"],
  [/\beight\b/giu, "8"],
  [/\bnine\b/giu, "9"],

  // Arabic
  [/\bصفر\b/giu, "0"],
  [/\b(?:واحد|واحدة)\b/giu, "1"],
  [/\b(?:اثنان|اثنين)\b/giu, "2"],
  [/\b(?:ثلاثة|ثلاث)\b/giu, "3"],
  [/\b(?:أربعة|اربعة|أربع)\b/giu, "4"],
  [/\b(?:خمسة|خمس)\b/giu, "5"],
  [/\b(?:ستة|ست)\b/giu, "6"],
  [/\b(?:سبعة|سبع)\b/giu, "7"],
  [/\b(?:ثمانية|ثمان)\b/giu, "8"],
  [/\b(?:تسعة|تسع)\b/giu, "9"],
];

function normalizeArabicDigits(
  value: string,
): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabic = "۰۱۲۳۴۵۶۷۸۹";

  return Array.from(value)
    .map((character) => {
      const first =
        arabicIndic.indexOf(character);

      if (first >= 0) {
        return String(first);
      }

      const second =
        easternArabic.indexOf(character);

      if (second >= 0) {
        return String(second);
      }

      return character;
    })
    .join("");
}

function normalizeEmail(
  value: string,
): string {
  return value
    .toLocaleLowerCase()
    .replace(
      /\[\s*(?:at)\s*\]|\(\s*(?:at)\s*\)/giu,
      "@",
    )
    .replace(
      /\[\s*(?:dot|titik)\s*\]|\(\s*(?:dot|titik)\s*\)/giu,
      ".",
    )
    .replace(/\s+at\s+/giu, "@")
    .replace(/\s+(?:dot|titik)\s+/giu, ".");
}

function normalizeNumberWords(
  value: string,
): string {
  let normalized =
    normalizeArabicDigits(
      value.toLocaleLowerCase(),
    );

  for (const [pattern, digit] of WORD_DIGITS) {
    normalized =
      normalized.replace(pattern, digit);
  }

  /*
   * Only interpret O/o as zero when it is immediately
   * adjacent to numeric material. Do not globally turn
   * ordinary letters into digits.
   */
  normalized = normalized
    .replace(/(?<=\d)[oO](?=\d)/g, "0")
    .replace(/(?<=\d)[oO](?=\s+\d)/g, "0")
    .replace(/(?<=\d\s)[oO](?=\s*\d)/g, "0");

  return normalized;
}

function containsEmail(
  value: string,
): boolean {
  const normalized =
    normalizeEmail(value);

  return /[a-z0-9._%+-]+(?:\s*)@(?:\s*)[a-z0-9.-]+(?:\s*)\.(?:\s*)[a-z]{2,}/iu
    .test(normalized);
}

function looksLikePhoneDigits(
  candidate: string,
): boolean {
  const digits =
    candidate.replace(/\D/gu, "");

  if (
    digits.length < 8 ||
    digits.length > 15
  ) {
    return false;
  }

  return (
    candidate.includes("+") ||
    digits.startsWith("08") ||
    digits.startsWith("628") ||
    digits.startsWith("6208")
  );
}

function containsPhone(
  value: string,
): boolean {
  const normalized =
    normalizeNumberWords(value);

  const candidates =
    normalized.match(
      /(?:\+?\s*\d[\s()./_-]*){8,16}/gu,
    ) ?? [];

  return candidates.some(
    looksLikePhoneDigits,
  );
}

function containsPhoneInFilename(
  filename: string,
): boolean {
  /*
   * Filenames often contain timestamps, invoice numbers,
   * order IDs and screenshot IDs. Those must not be
   * mistaken for phone numbers.
   *
   * Only block highly explicit phone-like filenames here.
   * Actual document contents are checked separately by
   * the server-side document scanner.
   */
  const stem =
    filename.replace(/\.[^.]+$/u, "");

  if (containsEmail(stem)) {
    return true;
  }

  const explicitPhone =
    stem.match(
      /(?:^|[^\d])(\+62[\s()._-]*8(?:[\s()._-]*\d){7,11}|08(?:[\s()._-]*\d){7,11})(?:[^\d]|$)/gu,
    ) ?? [];

  return explicitPhone.length > 0;
}

export function inspectContactInformation(
  value: string,
  mode: ContactGuardMode = "message",
): ContactGuardResult {
  if (containsEmail(value)) {
    return {
      blocked: true,
      reason: "email",
    };
  }

  const phoneDetected =
    mode === "filename"
      ? containsPhoneInFilename(value)
      : containsPhone(value);

  if (phoneDetected) {
    return {
      blocked: true,
      reason: "phone",
    };
  }

  return {
    blocked: false,
    reason: null,
  };
}

export function containsBlockedContact(
  value: string,
  mode: ContactGuardMode = "message",
): boolean {
  return inspectContactInformation(
    value,
    mode,
  ).blocked;
}