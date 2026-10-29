"use client";

import { ArrowRight, Building2, Globe2, Map, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { TravelProduct } from "@/data/home";
import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type SponsoredPackageRailProps = {
  packages: TravelProduct[];
  rotationIntervalMs: number;
};


export function SponsoredPackageRail({
  packages,
  rotationIntervalMs,
}: SponsoredPackageRailProps) {
  const { formatCurrency } = useMarketplacePreferences();
  const [visiblePackages, setVisiblePackages] = useState(packages);

  useEffect(() => {
    if (packages.length < 2 || rotationIntervalMs <= 0) return;

    const timer = window.setInterval(() => {
      setVisiblePackages((current) =>
        [...current].sort(() => Math.random() - 0.5),
      );
    }, rotationIntervalMs);

    return () => window.clearInterval(timer);
  }, [packages, rotationIntervalMs]);

  const categoryFor = (item: TravelProduct) =>
    item.title.toLowerCase().includes("haji")
      ? { label: "Haji", Icon: Map }
      : item.title.toLowerCase().includes("halal")
        ? { label: "Halal Tour", Icon: Globe2 }
        : { label: "Umrah", Icon: Building2 };

  const packageCards = Array.from(
    { length: Math.min(8, Math.max(visiblePackages.length, 0) * 2) },
    (_, index) => visiblePackages[index % visiblePackages.length],
  );

  return (
    <div className="accommodation-grid sponsored-package-grid">
      {packageCards.map((item, index) => (
        <a className="product-card reference-package-card" href={`/paket/${item.id}`} key={`${item.id}-${index}`}>
          <div className="reference-package-visual">
            <img src={item.image} alt={item.title} className="product-image" />
            <div className="reference-package-visual-overlay" />
            <span className="reference-package-category">{categoryFor(item).label}</span>
            <span
  className="reference-package-travel-logo"
  title={item.travelName || "Travel"}
>
  {item.travelLogo ? (
    <img
      src={item.travelLogo}
      alt={`Logo ${item.travelName || "Travel"}`}
      loading="lazy"
    />
  ) : null}
</span>
            <span className="reference-package-rating">
              <Star size={12} fill="currentColor" /> {item.rating} ({item.reviews})
            </span>
          </div>

          <div className="product-body reference-package-body">
            <span className="product-location">{item.location}</span>
            <h3>{item.title}</h3>
            <div className="reference-package-meta">
              <span>{item.duration ?? "Durasi tersedia"}</span>
              <span>· {item.location.split(" · ")[0]}</span>
            </div>
            <div className="reference-package-availability">
              <span /> {item.duration ? `${item.duration} perjalanan` : item.location}
            </div>
            <div className="product-price">
              <small>HARGA</small>
              <strong>{formatCurrency(item.price)}</strong>
              <span className="reference-package-arrow"><ArrowRight size={15} /></span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
