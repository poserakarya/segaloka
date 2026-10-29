export type SegalokaTheme =
  | "light"
  | "dark";

export type SegalokaSearchCategory =
  | "umrah"
  | "haji"
  | "halal-tour"
  | "domestic"
  | "international"
  | "visa"
  | "segadeals";

export type SegalokaSearchValue = {
  origin: string;
  destination: string;
  travelers: number;
  date: string;
};
