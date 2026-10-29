"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


export type TravelAdItem = {
  id: string;

  image: string;

  alt: string;

  destinationType:
    | "TRAVEL"
    | "PACKAGE";

  travelSlug?: string;

  packageSlug?: string;
};


type TravelAdSliderProps = {
  ads: TravelAdItem[];
};


export function TravelAdSlider({
  ads,
}: TravelAdSliderProps) {
  const router = useRouter();

  const [activeIndex, setActiveIndex] =
    useState(0);


  useEffect(() => {
    if (ads.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) =>
        (current + 1) % ads.length,
      );
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [ads.length]);


  if (ads.length === 0) {
    return null;
  }


  function openAd(ad: TravelAdItem) {
    if (
      ad.destinationType === "PACKAGE" &&
      ad.packageSlug
    ) {
      router.push(
        `/paket/${encodeURIComponent(
          ad.packageSlug,
        )}`,
      );

      return;
    }


    if (
      ad.destinationType === "TRAVEL" &&
      ad.travelSlug
    ) {
      router.push(
        `/travel/${encodeURIComponent(
          ad.travelSlug,
        )}`,
      );
    }
  }


  return (
    <section
      className="reference-main-banner travel-ad-slider"
      aria-label="Iklan Travel"
    >
      <div className="reference-main-banner-shell travel-ad-slider-shell">

        <div className="travel-ad-slides">
          {ads.map((ad, index) => (
            <button
              key={ad.id}
              type="button"
              className={[
                "travel-ad-slide",
                index === activeIndex
                  ? "active"
                  : "",
              ].join(" ")}
              onClick={() => openAd(ad)}
              aria-label={ad.alt}
            >
              <img
                src={ad.image}
                alt={ad.alt}
              />
            </button>
          ))}
        </div>


        {ads.length > 1 && (
          <div
            className="travel-ad-dots"
            aria-label="Pilih iklan"
          >
            {ads.map((ad, index) => (
              <button
                key={ad.id}
                type="button"
                className={
                  index === activeIndex
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveIndex(index)
                }
                aria-label={`Iklan ${
                  index + 1
                }`}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
