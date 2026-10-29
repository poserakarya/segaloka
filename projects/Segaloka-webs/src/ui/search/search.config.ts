/**
 * SEGALOKA CANONICAL SEARCH
 *
 * SINGLE SOURCE OF TRUTH:
 * src/ui/search/Search.tsx
 */

export const SEGALOKA_SEARCH_ORDER = [
  "origin",
  "destination",
  "travelers",
  "date",
  "submit",
] as const;

export type SegalokaSearchSlot =
  (typeof SEGALOKA_SEARCH_ORDER)[number];

export const SEGALOKA_SEARCH_VERSION =
  "1.0.0" as const;
