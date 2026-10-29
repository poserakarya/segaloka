"use client";

import { Search as SearchIcon } from "lucide-react";

import type { SearchProps } from "./search.types";

/**
 * CANONICAL SEARCH SEGALOKA
 *
 * LOCKED:
 *
 * Dari
 * → Tujuan
 * → Traveler
 * → Tanggal
 * → Search
 *
 * Layout/visual tidak dikontrol oleh halaman consumer.
 */
export function Search({
  origin,
  destination,
  travelers,
  date,
  onSearch,
  canSearch = true,
  searchLabel,
}: SearchProps) {
  return (
    <div
      className="hero-search-card segaloka-search-master"
      data-segaloka-ui="search"
      data-segaloka-search-version="1"
    >
      <div
        className="segaloka-search-master__slot segaloka-search-master__origin"
        data-search-field="origin"
      >
        {origin}
      </div>

      <div
        className="segaloka-search-master__slot segaloka-search-master__destination"
        data-search-field="destination"
      >
        {destination}
      </div>

      <div
        className="segaloka-search-master__slot segaloka-search-master__travelers"
        data-search-field="travelers"
      >
        {travelers}
      </div>

      <div
        className="segaloka-search-master__slot segaloka-search-master__date"
        data-search-field="date"
      >
        {date}
      </div>

      <button
        type="button"
        className="hero-search-button segaloka-search-master__submit"
        onClick={onSearch}
        disabled={!canSearch}
        aria-disabled={!canSearch}
      >
        <SearchIcon
          size={19}
          aria-hidden="true"
        />

        <span>{searchLabel}</span>
      </button>
    </div>
  );
}

export default Search;
