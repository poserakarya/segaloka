"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  type CurrencyCode,
  type LanguageCode,
} from "@/data/preferences";

type MarketplacePreferencesContextValue = {
  language: LanguageCode;
  currency: CurrencyCode;
  setLanguage: (language: LanguageCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  locale: string;
  direction: "ltr" | "rtl";
  formatCurrency: (amountInIdr: number) => string;
  convertFromIdr: (amountInIdr: number) => number;
};

const STORAGE_KEY = "segaloka-marketplace-preferences";

const languageLocale: Record<LanguageCode, string> = {
  ID: "id-ID",
  EN: "en-US",
  AR: "ar-SA",
};

const currencyLocale: Record<CurrencyCode, string> = {
  IDR: "id-ID",
  USD: "en-US",
  SAR: "en-US",
};

/*
 * UI prototype rates.
 *
 * Semua nominal produk saat ini tetap memakai IDR sebagai base amount.
 * Rate ini hanya untuk DISPLAY marketplace.
 *
 * Saat API/backend kurs diaktifkan nanti, ganti sumber rate ini dengan
 * rate service dan simpan rate snapshot pada transaksi.
 */
const displayRates: Record<CurrencyCode, number> = {
  IDR: 1,
  USD: 1 / 16500,
  SAR: 1 / 4400,
};

const MarketplacePreferencesContext =
  createContext<MarketplacePreferencesContextValue | null>(null);

function isLanguageCode(value: unknown): value is LanguageCode {
  return value === "ID" || value === "EN" || value === "AR";
}

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === "IDR" || value === "USD" || value === "SAR";
}

export function MarketplacePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] =
    useState<LanguageCode>("ID");

  const [currency, setCurrencyState] =
    useState<CurrencyCode>("IDR");

  const locale = languageLocale[language];
  const direction: "ltr" | "rtl" =
    language === "AR" ? "rtl" : "ltr";

  /*
   * Preference non-sensitif boleh dipersist.
   * Ini TIDAK digunakan untuk traveler/passport/payment data.
   */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as {
        language?: unknown;
        currency?: unknown;
      };

      if (isLanguageCode(parsed.language)) {
        setLanguageState(parsed.language);
      }

      if (isCurrencyCode(parsed.currency)) {
        setCurrencyState(parsed.currency);
      }
    } catch {
      // Invalid preference storage should never break marketplace.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang =
      language === "ID"
        ? "id"
        : language === "EN"
          ? "en"
          : "ar";

    document.documentElement.dir = direction;
  }, [language, direction]);

  const persist = useCallback(
    (
      nextLanguage: LanguageCode,
      nextCurrency: CurrencyCode,
    ) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            language: nextLanguage,
            currency: nextCurrency,
          }),
        );
      } catch {
        // Preference persistence is optional.
      }
    },
    [],
  );

  const setLanguage = useCallback(
    (nextLanguage: LanguageCode) => {
      setLanguageState(nextLanguage);
      persist(nextLanguage, currency);
    },
    [currency, persist],
  );

  const setCurrency = useCallback(
    (nextCurrency: CurrencyCode) => {
      setCurrencyState(nextCurrency);
      persist(language, nextCurrency);
    },
    [language, persist],
  );

  const convertFromIdr = useCallback(
    (amountInIdr: number) => {
      return amountInIdr * displayRates[currency];
    },
    [currency],
  );

  const formatCurrency = useCallback(
    (amountInIdr: number) => {
      const converted =
        amountInIdr * displayRates[currency];

      const rounded =
        Math.round(converted);

      if (currency === "IDR") {
        return `Rp${new Intl.NumberFormat("id-ID", {
          maximumFractionDigits: 0,
        }).format(rounded)}`;
      }

      if (currency === "USD") {
        return new Intl.NumberFormat(
          currencyLocale.USD,
          {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          },
        ).format(rounded);
      }

      return `SAR ${new Intl.NumberFormat(
        currencyLocale.SAR,
        {
          maximumFractionDigits: 0,
        },
      ).format(rounded)}`;
    },
    [currency],
  );

  const value = useMemo(
    () => ({
      language,
      currency,
      setLanguage,
      setCurrency,
      locale,
      direction,
      formatCurrency,
      convertFromIdr,
    }),
    [
      language,
      currency,
      setLanguage,
      setCurrency,
      locale,
      direction,
      formatCurrency,
      convertFromIdr,
    ],
  );

  return (
    <MarketplacePreferencesContext.Provider value={value}>
      {children}
    </MarketplacePreferencesContext.Provider>
  );
}

export function useMarketplacePreferences() {
  const context = useContext(
    MarketplacePreferencesContext,
  );

  if (!context) {
    throw new Error(
      "useMarketplacePreferences harus digunakan di dalam MarketplacePreferencesProvider.",
    );
  }

  return context;
}