import type { SegalokaAssetDomain } from "./asset.types";

export const SEGALOKA_PUBLIC_ASSET_ROOT = "/images";

export function getStaticAssetPath(
  domain: SegalokaAssetDomain,
  filename: string,
): string {
  const cleanFilename = filename.replace(/^\/+/, "");

  return `${SEGALOKA_PUBLIC_ASSET_ROOT}/${domain}/${cleanFilename}`;
}

export const SEGALOKA_STATIC_ASSETS = {
  brand: {
    logo: "/images/brand/segaloka-logo.png",
  },

  hero: {},

  categories: {},

  placeholders: {},
} as const;
