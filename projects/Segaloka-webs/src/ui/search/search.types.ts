import type { ReactNode } from "react";

/**
 * Props internal canonical Search.
 *
 * Visual Search tidak dapat dikustomisasi consumer.
 * Consumer hanya memberikan field/behavior.
 */
export type SearchProps = {
  origin?: ReactNode;
  destination: ReactNode;
  travelers: ReactNode;
  date: ReactNode;
  returnDate?: ReactNode;

  onSearch: () => void;

  canSearch?: boolean;
  searchLabel: string;
};
