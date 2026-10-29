export const SEGALOKA_STORAGE_BUCKETS = {
  publicContent: "public-content",

  travelAssets: "travel-assets",

  vendorAssets: "vendor-assets",

  packageAssets: "package-assets",

  userPrivate: "user-private",

  privateDocuments: "documents-private",
} as const;

export type SegalokaStorageBucket =
  (typeof SEGALOKA_STORAGE_BUCKETS)[keyof typeof SEGALOKA_STORAGE_BUCKETS];

/**
 * Canonical storage hierarchy.
 *
 * public-content/
 *   platform/...
 *
 * travel-assets/
 *   {travelId}/...
 *
 * vendor-assets/
 *   {vendorId}/...
 *
 * package-assets/
 *   {travelId}/{packageId}/...
 *
 * user-private/
 *   {userId}/...
 *
 * documents-private/
 *   {ownerType}/{ownerId}/...
 *
 * Jangan membuat struktur bucket berbeda antara
 * Website, Mobile, Travel Dashboard, Vendor Dashboard
 * dan Control Center.
 */
export const SEGALOKA_STORAGE_CONTRACT_VERSION = 1;
