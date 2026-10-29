"use client";

import {
  marketplaceTranslate,
  type MarketplaceMessageKey,
} from "@/lib/marketplace-i18n";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type MarketplaceTextProps = {
  messageKey: MarketplaceMessageKey;
  className?: string;
};

export function MarketplaceText({
  messageKey,
  className,
}: MarketplaceTextProps) {
  const { language } =
    useMarketplacePreferences();

  return (
    <span className={className}>
      {marketplaceTranslate(language, messageKey)}
    </span>
  );
}