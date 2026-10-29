"use client";

import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";

type MarketplacePriceProps = {
  amountInIdr: number;
  className?: string;
};

export function MarketplacePrice({
  amountInIdr,
  className,
}: MarketplacePriceProps) {
  const { formatCurrency } =
    useMarketplacePreferences();

  return (
    <span className={className}>
      {formatCurrency(amountInIdr)}
    </span>
  );
}