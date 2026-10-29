"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Headphones,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

import type {
  VisaDetailData,
  VisaProduct,
  VisaVendor,
} from "./visa-detail.types";

import { visaDetailCopy } from "./visa-detail.i18n";

import "./visa-detail.css";

type VisaDetailProps = {
  data: VisaDetailData;
};

type VendorGroup = {
  vendor: VisaVendor;
  products: VisaProduct[];
  startingPrice: number | null;
  popular: boolean;
};


function buildVendorGroups(
  products: VisaProduct[],
): VendorGroup[] {
  const groups = new Map<string, VisaProduct[]>();

  for (const product of products) {
    const existing =
      groups.get(product.vendor.id) ?? [];

    existing.push(product);

    groups.set(
      product.vendor.id,
      existing,
    );
  }

  return Array.from(groups.values())
    .map((vendorProducts) => {
      const vendor = vendorProducts[0].vendor;

      const prices = vendorProducts
        .map((product) => product.price)
        .filter((price) => price > 0);

      return {
        vendor,
        products: [...vendorProducts].sort(
          (a, b) => {
            if (a.price <= 0 && b.price <= 0) {
              return 0;
            }

            if (a.price <= 0) {
              return 1;
            }

            if (b.price <= 0) {
              return -1;
            }

            return a.price - b.price;
          },
        ),
        startingPrice:
          prices.length > 0
            ? Math.min(...prices)
            : null,
        popular: vendorProducts.some(
          (product) => product.popular,
        ),
      };
    })
    .sort((a, b) => {
      if (
        a.startingPrice === null &&
        b.startingPrice === null
      ) {
        return 0;
      }

      if (a.startingPrice === null) {
        return 1;
      }

      if (b.startingPrice === null) {
        return -1;
      }

      return (
        a.startingPrice -
        b.startingPrice
      );
    });
}

function getVendorCover(
  countryImage: string,
) {
  return countryImage;
}

export function VisaDetail({
  data,
}: VisaDetailProps) {
  const {
    language,
    locale,
    formatCurrency,
  } = useMarketplacePreferences();

  const copy =
    visaDetailCopy[language];
  const [openFaq, setOpenFaq] =
    useState<number | null>(null);

  const [sortMode, setSortMode] =
    useState<
      "recommended" | "price-low" | "rating"
    >("recommended");

  const vendorGroups = useMemo(
    () => buildVendorGroups(data.products),
    [data.products],
  );

  const sortedVendors = useMemo(() => {
    const result = [...vendorGroups];

    if (sortMode === "price-low") {
      result.sort((a, b) => {
        if (
          a.startingPrice === null &&
          b.startingPrice === null
        ) {
          return 0;
        }

        if (a.startingPrice === null) {
          return 1;
        }

        if (b.startingPrice === null) {
          return -1;
        }

        return (
          a.startingPrice -
          b.startingPrice
        );
      });
    }

    if (sortMode === "rating") {
      result.sort(
        (a, b) =>
          (b.vendor.rating ?? 0) -
          (a.vendor.rating ?? 0),
      );
    }

    return result;
  }, [vendorGroups, sortMode]);

  function handleOpenVendor(
    group: VendorGroup,
  ) {
    const currentParams =
      new URLSearchParams(
        window.location.search,
      );

    const params =
      new URLSearchParams();

    for (
      const key of [
        "travelers",
        "adult",
        "child",
        "infant",
        "departureDate",
        "returnDate",
      ]
    ) {
      const value =
        currentParams.get(key);

      if (value) {
        params.set(key, value);
      }
    }

    params.set(
      "vendor",
      group.vendor.slug,
    );

    /*
     * UI-only phase:
     * Belum ada route publik /vendor/[slug]/visa.
     *
     * Untuk sekarang vendor card membuka produk
     * termurah vendor tersebut agar flow tetap aktif.
     * Saat route vendor dibuat, handler ini tinggal
     * diarahkan ke:
     *
     * /visa/{country}/vendor/{vendor}
     */
    const firstProduct =
      group.products[0];

    if (!firstProduct) {
      return;
    }

    const query = params.toString();

    window.location.assign(
      `/visa/${data.country.slug}/${firstProduct.slug}${
        query ? `?${query}` : ""
      }`,
    );
  }

  return (
    <main className="visa-vendor-marketplace">
      <section
        className="visa-vendor-hero"
        style={{
          backgroundImage:
            `linear-gradient(90deg, rgba(5,29,67,.78), rgba(5,29,67,.18)), url("${data.country.image}")`,
        }}
      >
        <div className="visa-vendor-container visa-vendor-hero-inner">
          <button
            type="button"
            className="visa-vendor-back"
            onClick={() =>
              window.history.back()
            }
          >
            <ArrowLeft size={15} />
            Visa
          </button>

          <div className="visa-vendor-country">
            <img
              src={data.country.flag}
              alt={copy.flagAlt(data.country.name)}
            />

            <span>
              {data.country.name}
            </span>
          </div>

          <h1>
            {copy.title(data.country.name)}
          </h1>

          <p>
            {copy.heroDescription(data.country.name)}
            <br />
            {copy.heroDescriptionSecond}
          </p>
        </div>
      </section>

      <div className="visa-vendor-container">
        <section className="visa-vendor-benefits">
          <article>
            <ShieldCheck />
            <span>
              <strong>
                {copy.trustedVendor}
              </strong>
              {copy.trustedVendorDescription}
            </span>
          </article>

          <article>
            <Zap />
            <span>
              <strong>
                {copy.easyProcess}
              </strong>
              {copy.easyProcessDescription}
            </span>
          </article>

          <article>
            <Headphones />
            <span>
              <strong>
                {copy.support}
              </strong>
              {copy.supportDescription}
            </span>
          </article>

          <article>
            <FileCheck2 />
            <span>
              <strong>
                {copy.manyChoices}
              </strong>
              {copy.manyChoicesDescription}
            </span>
          </article>
        </section>

        <section className="visa-vendor-section">
          <div className="visa-vendor-heading">
            <div>
              <h2>
                {copy.vendorChoices(data.country.name)}
              </h2>

              <p>
                {copy.vendorChoicesDescription}
              </p>
            </div>

            <label className="visa-vendor-sort">
              <span className="sr-only">
                {copy.sortVendor}
              </span>

              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(
                    event.target.value as
                      | "recommended"
                      | "price-low"
                      | "rating",
                  )
                }
              >
                <option value="recommended">
                  {copy.recommended}
                </option>

                <option value="price-low">
                  {copy.lowestPrice}
                </option>

                <option value="rating">
                  {copy.highestRating}
                </option>
              </select>

              <ChevronDown
                size={14}
                aria-hidden="true"
              />
            </label>
          </div>

          {sortedVendors.length > 0 ? (
            <div className="visa-vendor-grid">
              {sortedVendors.map(
                (group) => {
                  const productCount =
                    group.products.length;

                  return (
                    <article
                      className="visa-vendor-card"
                      key={group.vendor.id}
                    >
                      <div className="visa-vendor-card-cover">
                        <img
                          src={getVendorCover(
                            data.country.image,
                          )}
                          alt=""
                        />

                        {group.popular && (
                          <span className="visa-vendor-popular">
                            {copy.mostPopular}
                          </span>
                        )}

                        <button
                          type="button"
                          className="visa-vendor-favorite"
                          aria-label={copy.saveVendor(group.vendor.name)}
                        >
                          <Heart size={18} />
                        </button>

                        <div className="visa-vendor-logo">
                          <span>
                            {group.vendor.name
                              .split(" ")
                              .slice(0, 2)
                              .map(
                                (word) =>
                                  word[0],
                              )
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="visa-vendor-card-body">
                        <h3>
                          {group.vendor.name}
                        </h3>

                        <div className="visa-vendor-rating">
                          <Star
                            size={15}
                            fill="currentColor"
                          />

                          <strong>
                            {group.vendor.rating ??
                              copy.newVendor}
                          </strong>

                          {group.vendor.reviewCount ? (
                            <span>
                              (
                              {group.vendor.reviewCount.toLocaleString(
                                locale,
                              )}{" "}
                              {copy.reviews})
                            </span>
                          ) : null}
                        </div>

                        <div className="visa-vendor-location">
                          <MapPin size={14} />
                          <span>
                            {group.vendor.location ?? "-"}
                          </span>
                        </div>

                        <div className="visa-vendor-tags">
                          {group.vendor.verified && (
                            <span>
                              <ShieldCheck
                                size={12}
                              />
                              {copy.verified}
                            </span>
                          )}

                          <span>
                            <Zap size={12} />
                            {copy.easyProcess}
                          </span>

                          <span>
                            <CheckCircle2
                              size={12}
                            />
                            {productCount}{" "}
                            {copy.visaChoices}
                          </span>
                        </div>

                        <p className="visa-vendor-description">
                          {copy.vendorDescription(
                            group.vendor.name,
                            data.country.name,
                          )}
                        </p>

                        <div className="visa-vendor-card-footer">
                          <div>
                            <small>
                              {copy.startingFrom}
                            </small>

                            <strong>
                              {group.startingPrice !==
                              null
                                ? formatCurrency(
                                    group.startingPrice,
                                  )
                                : copy.contactVendor}
                            </strong>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenVendor(
                                group,
                              )
                            }
                          >
                            {copy.viewVendor}
                            <ArrowRight
                              size={16}
                            />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="visa-vendor-empty">
              <div>
                <Search size={24} />
              </div>

              <h3>
                {copy.vendorUnavailable}
              </h3>

              <p>
                {copy.vendorUnavailableDescription}
              </p>
            </div>
          )}
        </section>

        <section className="visa-vendor-note">
          <Sparkles size={20} />

          <div>
            <strong>
              {copy.chooseService}
            </strong>

            <p>
              {copy.chooseServiceDescription}
            </p>
          </div>
        </section>

        <section className="visa-faq-section">
          <div className="visa-section-heading">
            <h2>
              {copy.faq}
            </h2>
          </div>

          <div className="visa-faq-list">
            {data.faqs.map(
              (faq, index) => (
                <div
                  className="visa-faq-item"
                  key={faq.question}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(
                        openFaq === index
                          ? null
                          : index,
                      )
                    }
                  >
                    <span>
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={17}
                      className={
                        openFaq === index
                          ? "open"
                          : ""
                      }
                    />
                  </button>

                  {openFaq === index && (
                    <p>
                      {faq.answer}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="visa-popular-section">
          <div className="visa-section-heading">
            <h2>
              {copy.otherPopularCountries}
            </h2>
          </div>

          <div className="visa-popular-grid">
            {data.popularCountries.map(
              (country) => (
                <article
                  key={country.slug}
                  className="visa-popular-card"
                >
                  <div className="visa-popular-image">
                    <img
                      src={country.image}
                      alt={country.name}
                    />

                    <img
                      className="visa-popular-flag"
                      src={country.flag}
                      alt=""
                    />
                  </div>

                  <strong>
                    {country.name}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.assign(
                        `/visa/${country.slug}`,
                      )
                    }
                  >
                    {copy.viewVisa}
                    <ArrowRight
                      size={15}
                    />
                  </button>
                </article>
              ),
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default VisaDetail;