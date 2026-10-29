"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";


type CountryOption = {
  country: CountryCode;
  name: string;
  dial: string;
};

type Props = {
  value: string;
  onChange: (dial: string) => void;
  language?: string;
  label?: string;
};

export default function CountryCallingCodePicker({
  value,
  onChange,
  language = "ID",
  label = "Kode negara",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // sg-country-iso-selection-v1
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("ID");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const locale =
    language === "AR" ? "ar" : language === "EN" ? "en" : "id";

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale, "en"], {
      type: "region",
    });

    return getCountries()
      .map((country): CountryOption => ({
        country,
        name: names.of(country) || country,
        dial: `+${getCountryCallingCode(country)}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const selected =
    countries.find(
      (item) =>
        item.country === selectedCountry &&
        item.dial === value,
    ) ??
    countries.find((item) => item.dial === value);

  const results = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();

    if (!search) return countries;

    const normalizedDial = search.replace(/[^\d]/g, "");

    return countries.filter((item) => {
      const name = item.name.toLocaleLowerCase();

      return (
        name.includes(search) ||
        item.country.toLowerCase().includes(search) ||
        item.dial.includes(search) ||
        (normalizedDial.length > 0 &&
          item.dial.slice(1).includes(normalizedDial))
      );
    });
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;

    searchRef.current?.focus();

    function handleOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        flex: "0 0 36%",
        width: "36%",
        minWidth: 0,
        fontFamily: "inherit",
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        style={{
          width: "100%",
          height: 46,
          border: "1px solid #d2dbe8",
          borderRadius: 10,
          background: "#fff",
          color: "#17365d",
          font: "inherit",
          fontSize: 13,
          padding: "0 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 3,
          whiteSpace: "nowrap",
          cursor: "pointer",
        }}
      >
        {/* sg-country-image-flag-v1 */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {selected && (
            <img
              src={`https://flagcdn.com/20x15/${selected.country.toLowerCase()}.png`}
              alt=""
              width={18}
              height={14}
              style={{
                width: 18,
                height: 14,
                objectFit: "cover",
                flexShrink: 0,
                borderRadius: 2,
              }}
            />
          )}
          <span
            style={{
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {selected?.country ?? ""} {value}
          </span>
        </span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            top: "calc(100% + 6px)",
            left: 0,
            width: "280px",
            maxWidth: "calc(100vw - 48px)",
            boxSizing: "border-box",
            overflowX: "hidden",
            padding: 8,
            borderRadius: 12,
            border: "1px solid #d2dbe8",
            background: "#fff",
            boxShadow: "0 12px 32px rgba(0,0,0,.14)",
            fontFamily: "inherit",
          }}
        >
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              language === "AR"
                ? "ابحث عن الدولة أو +62"
                : language === "EN"
                  ? "Search country or +62"
                  : "Cari negara atau +62"
            }
            aria-label={label}
            style={{
              width: "100%",
              height: 40,
              border: "1px solid #d2dbe8",
              borderRadius: 8,
              padding: "0 10px",
              font: "inherit",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />

          <div
            role="listbox"
            aria-label={label}
            style={{
              maxHeight: 220,
              overflowY: "auto",
              marginTop: 6,
            }}
          >
            {results.map((item) => (
              <button
                key={item.country}
                type="button"
                role="option"
                aria-selected={
                  item.country === selected?.country
                }
                onClick={() => {
                  setSelectedCountry(item.country);
                  onChange(item.dial);
                  setOpen(false);
                  setQuery("");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  border: 0,
                  borderRadius: 7,
                  padding: "9px 8px",
                  background:
                    item.country === selected?.country
                      ? "#eef5ff"
                      : "transparent",
                  color: "#17365d",
                  font: "inherit",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    minWidth: 0,
                  }}
                >
                  <img
                    src={`https://flagcdn.com/20x15/${item.country.toLowerCase()}.png`}
                    alt=""
                    width={20}
                    height={15}
                    style={{
                      width: 20,
                      height: 15,
                      objectFit: "cover",
                      flexShrink: 0,
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ overflowWrap: "anywhere" }}>
                    {item.name} ({item.dial})
                  </span>
                </span>
              </button>
            ))}

            {results.length === 0 && (
              <div style={{ padding: 12, fontSize: 13 }}>
                {language === "EN"
                  ? "No countries found"
                  : language === "AR"
                    ? "لم يتم العثور على دولة"
                    : "Negara tidak ditemukan"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}