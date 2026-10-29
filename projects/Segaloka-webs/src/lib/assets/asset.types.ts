export const SEGALOKA_ASSET_DOMAINS = [
  "brand",
  "hero",
  "categories",
  "packages",
  "destinations",
  "travel",
  "vendors",
  "accommodation",
  "attractions",
  "promo",
  "segadeals",
  "affiliate",
  "help-center",
  "payments",
  "documents",
  "avatars",
  "placeholders",
] as const;

export type SegalokaAssetDomain =
  (typeof SEGALOKA_ASSET_DOMAINS)[number];

export const SEGALOKA_ASSET_VISIBILITIES = [
  "public",
  "private",
  "signed",
] as const;

export type SegalokaAssetVisibility =
  (typeof SEGALOKA_ASSET_VISIBILITIES)[number];

export const SEGALOKA_ASSET_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

export type SegalokaAssetStatus =
  (typeof SEGALOKA_ASSET_STATUSES)[number];

export type SegalokaAssetOwnerType =
  | "platform"
  | "travel"
  | "vendor"
  | "traveler"
  | "affiliate"
  | "agent"
  | "partner";

export interface SegalokaLocalizedText {
  id?: string | null;
  en?: string | null;
  ar?: string | null;
}

export interface SegalokaAsset {
  id: string;

  domain: SegalokaAssetDomain;

  ownerType: SegalokaAssetOwnerType;
  ownerId?: string | null;

  visibility: SegalokaAssetVisibility;
  status: SegalokaAssetStatus;

  bucket?: string | null;
  storagePath?: string | null;

  /**
   * Untuk static asset yang dibundel di /public.
   * Contoh:
   * /images/brand/segaloka-logo.png
   */
  localPath?: string | null;

  /**
   * URL resolved dari CDN / Supabase Storage.
   * Jangan disimpan sebagai source of truth jika dapat
   * dibentuk kembali dari bucket + storagePath.
   */
  url?: string | null;

  mimeType?: string | null;

  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;

  alt?: SegalokaLocalizedText;
  title?: SegalokaLocalizedText;

  sortOrder?: number;

  createdAt?: string;
  updatedAt?: string;
}
