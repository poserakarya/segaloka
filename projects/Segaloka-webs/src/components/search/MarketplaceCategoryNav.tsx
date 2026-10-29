"use client";

import Link from "next/link";
import {
  Building2,
  Globe2,
  MapPin,
  Plane,
  Ticket,
} from "lucide-react";

import {
  useMarketplacePreferences,
} from "@/components/providers/MarketplacePreferencesProvider";


export type MarketplaceSearchCategory =
  | "umrah"
  | "haji"
  | "halal-tour"
  | "domestik"
  | "internasional"
  | "segadeals"
  | "visa";


type Props = {
  activeCategory?: string;
  preserveParams?: URLSearchParams | ReadonlyURLSearchParamsLike;
  className?: string;
};


type ReadonlyURLSearchParamsLike = {
  toString(): string;
};


type CategoryItem = {
  key: MarketplaceSearchCategory;
  label: {
    ID: string;
    EN: string;
    AR: string;
  };
  href?: string;
};


const categories: CategoryItem[] = [
  {
    key: "umrah",
    label: {
      ID: "Umrah",
      EN: "Umrah",
      AR: "العمرة",
    },
  },
  {
    key: "haji",
    label: {
      ID: "Haji",
      EN: "Hajj",
      AR: "الحج",
    },
  },
  {
    key: "halal-tour",
    label: {
      ID: "Halal Tour",
      EN: "Halal Tour",
      AR: "السياحة الحلال",
    },
  },
  {
    key: "domestik",
    label: {
      ID: "Domestik",
      EN: "Domestic",
      AR: "محلي",
    },
  },
  {
    key: "internasional",
    label: {
      ID: "Internasional",
      EN: "International",
      AR: "دولي",
    },
  },
  {
    key: "segadeals",
    label: {
      ID: "SegaDeals",
      EN: "SegaDeals",
      AR: "SegaDeals",
    },
    href: "/segadeals",
  },
  {
    key: "visa",
    label: {
      ID: "Visa",
      EN: "Visa",
      AR: "تأشيرة",
    },
  },
];


function CategoryIcon({
  category,
}: {
  category: MarketplaceSearchCategory;
}) {
  const common = {
    size: 18,
    strokeWidth: 2,
    "aria-hidden": true,
  } as const;

  switch (category) {
    case "umrah":
      return <Building2 {...common} />;

    case "haji":
      return <Plane {...common} />;

    case "halal-tour":
      return <Globe2 {...common} />;

    case "domestik":
      return <MapPin {...common} />;

    case "internasional":
      return <Globe2 {...common} />;

    case "segadeals":
      return <Ticket {...common} />;

    case "visa":
      return <Building2 {...common} />;
  }
}


function normalizeCategory(value?: string) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (normalized === "halaltour") {
    return "halal-tour";
  }

  if (normalized === "international") {
    return "internasional";
  }

  if (normalized === "domestic") {
    return "domestik";
  }

  if (normalized === "hajj") {
    return "haji";
  }

  return normalized;
}


export default function MarketplaceCategoryNav({
  activeCategory,
  preserveParams,
  className = "",
}: Props) {
  const {
    language,
    direction,
  } = useMarketplacePreferences();

  const normalizedActive =
    normalizeCategory(activeCategory);

  function createHref(item: CategoryItem) {
    if (item.href) {
      return item.href;
    }

    const params = new URLSearchParams(
      preserveParams?.toString() ?? "",
    );

    params.set("category", item.key);

    return `/search?${params.toString()}`;
  }

  return (
    <nav
      className={[
        "marketplace-category-nav",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={
        language === "ID"
          ? "Jenis perjalanan"
          : language === "AR"
            ? "نوع الرحلة"
            : "Travel categories"
      }
      dir={direction}
    >
      <div className="marketplace-category-nav-scroll">
        {categories.map((item) => {
          const active =
            normalizedActive === item.key;

          return (
            <Link
              key={item.key}
              href={createHref(item)}
              prefetch={false}
              className={[
                "marketplace-category-nav-item",
                active
                  ? "marketplace-category-nav-item-active"
                  : "",
                item.key === "segadeals"
                  ? "marketplace-category-nav-item-segadeals"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={
                active ? "page" : undefined
              }
            >
              <span className="marketplace-category-nav-icon">
                <CategoryIcon category={item.key} />
              </span>

              <span>
                {item.label[language]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}