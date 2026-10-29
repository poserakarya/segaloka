import type { SegalokaAsset } from "./asset.types";

export function resolveSegalokaAssetUrl(
  asset: SegalokaAsset | null | undefined,
): string | null {
  if (!asset) {
    return null;
  }

  if (asset.url) {
    return asset.url;
  }

  if (asset.localPath) {
    return asset.localPath;
  }

  return null;
}

export function isSegalokaAssetAvailable(
  asset: SegalokaAsset | null | undefined,
): boolean {
  return Boolean(
    asset &&
      asset.status === "active" &&
      (asset.url || asset.localPath || asset.storagePath),
  );
}
