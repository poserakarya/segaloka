"use client";

import {
  ArrowRight,
  CalendarDays,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  visaCountries,
} from "@/ui/visa-detail/visa-countries";

import "./visa-category.css";

import {
  VisaVendorResults,
} from "./VisaVendorResults";

type VisaCategoryProps = {
  destination: string;
  travelers: string;
  adult: string;
  child: string;
  infant: string;
  departureDate: string;
  returnDate: string;
};

function formatDate(value: string) {
  if (!value) return "Belum dipilih";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function travelerLabel(
  travelers: string,
  adult: string,
  child: string,
  infant: string,
) {
  const total =
    Number(adult || 0) +
    Number(child || 0) +
    Number(infant || 0);

  if (total > 0) {
    return `${total} traveler`;
  }

  const parsed = Number(travelers || 0);

  if (Number.isFinite(parsed) && parsed > 0) {
    return `${parsed} traveler`;
  }

  return "1 traveler";
}

function destinationHref(country: string) {
  const params = new URLSearchParams();

  params.set("category", "Visa");
  params.set("destination", country);

  return `/search?${params.toString()}`;
}

export function VisaCategory({
  destination,
  travelers,
  adult,
  child,
  infant,
  departureDate,
  returnDate,
}: VisaCategoryProps) {
  const hasSearch =
    Boolean(destination) ||
    Boolean(departureDate) ||
    Boolean(returnDate);

  const travelerText = travelerLabel(
    travelers,
    adult,
    child,
    infant,
  );

  return (
    <main className="visa-category">
      <section className="visa-category-hero">
        <div className="visa-category-hero-map" />

        <div className="visa-category-landmark visa-category-landmark-left">
          <div className="visa-category-landmark-copy">
            <span>✈</span>
            <strong>Jelajahi Dunia</strong>
          </div>
        </div>

        <div className="visa-category-hero-content">
          <span className="visa-category-eyebrow">
            Segaloka Visa
          </span>

          <h1>
            Jelajahi Dunia dengan
            <strong>Layanan Visa Terbaik</strong>
          </h1>

          <p>
            Urus visa perjalanan ke berbagai negara dengan
            mudah, cepat, dan terpercaya bersama Segaloka.
          </p>

          <form
            className="visa-category-country-search"
            action="/search"
          >
            <input
              type="hidden"
              name="category"
              value="Visa"
            />

            <Search size={18} />

            <input
              name="destination"
              defaultValue={destination}
              placeholder="Cari negara yang dituju"
              aria-label="Cari negara yang dituju"
            />

            <button type="submit">
              Cari
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </section>

      {hasSearch ? (
        <section className="visa-search-mode">
          <div className="visa-category-shell">
            <div className="visa-search-heading">
              <div>
                <span className="visa-category-eyebrow">
                  Hasil Pencarian Visa
                </span>

                <h2>
                  Visa untuk {destination || "tujuan Anda"}
                </h2>

                <p>
                  Produk Visa dari Vendor Segaloka akan
                  disesuaikan dengan kebutuhan perjalanan
                  yang Anda pilih.
                </p>
              </div>

              <a
                href="/search?category=Visa"
                className="visa-change-country"
              >
                Lihat semua negara
              </a>
            </div>

            <div className="visa-search-summary">
              <div>
                <span className="visa-summary-icon">
                  <Search size={18} />
                </span>
                <span>
                  <small>Negara Tujuan</small>
                  <strong>
                    {destination || "Belum dipilih"}
                  </strong>
                </span>
              </div>

              <div>
                <span className="visa-summary-icon">
                  <UsersRound size={18} />
                </span>
                <span>
                  <small>Traveler</small>
                  <strong>{travelerText}</strong>
                </span>
              </div>

              <div>
                <span className="visa-summary-icon">
                  <CalendarDays size={18} />
                </span>
                <span>
                  <small>Tanggal Berangkat</small>
                  <strong>
                    {formatDate(departureDate)}
                  </strong>
                </span>
              </div>

              <div>
                <span className="visa-summary-icon">
                  <CalendarDays size={18} />
                </span>
                <span>
                  <small>Tanggal Pulang</small>
                  <strong>
                    {formatDate(returnDate)}
                  </strong>
                </span>
              </div>
            </div>

            

            <VisaVendorResults
            country={destination || "China"}
            countrySlug={
              (destination || "China")
                .trim()
                .toLocaleLowerCase("id-ID")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
            }
            destination={destination}
            travelers={travelers}
            departureDate={departureDate}
            returnDate={returnDate}
          />
        </div>
        </section>
      ) : (
        <section className="visa-destination-section">
          <div className="visa-category-shell">
            <div className="visa-destination-heading">
              <div>
                <h2>Pilih Destinasi Visa</h2>
                <p>
                  Temukan negara tujuan dan ajukan visa
                  perjalananmu sekarang.
                </p>
              </div>

              <label>
                <span>Urutkan:</span>
                <select defaultValue="popular">
                  <option value="popular">
                    Paling Populer
                  </option>
                  <option value="az">
                    Nama A-Z
                  </option>
                </select>
              </label>
            </div>

            <div className="visa-country-grid">
              {visaCountries.map((country) => (
                <a
                  key={country.name}
                  href={destinationHref(country.name)}
                  className="visa-country-card"
                >
                  <img
                    src={`/images/visa/countries/${country.slug}.jpg`}
                    alt=""
                    className="visa-country-image"
                  />

                  <div className="visa-country-overlay" />

                  <span className="visa-country-flag">
                    <img
                      src={`/images/visa/flags/${country.slug}.jpg`}
                      alt={`Bendera ${country.name}`}
                      className="visa-country-flag-image"
                    />
                  </span>

                  <strong>{country.name}</strong>

                  <span className="visa-country-action">
                    Booking Sekarang
                    <ArrowRight size={13} />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default VisaCategory;