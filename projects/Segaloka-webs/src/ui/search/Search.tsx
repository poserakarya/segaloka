"use client";

import { Search as SearchIcon } from "lucide-react";

import type { SearchProps } from "./search.types";

/**
 * CANONICAL SEARCH SEGALOKA
 *
 * Visual contract:
 * DOM children sengaja tidak dibungkus.
 *
 * CSS Hero existing bergantung pada direct children
 * .hero-search-card.
 *
 * Jangan menambahkan wrapper pada field.
 */
export function Search({
  origin,
  destination,
  travelers,
  date,
  returnDate,
  onSearch,
  canSearch = true,
  searchLabel,
}: SearchProps) {
  return (
    <div
      className={
        origin
          ? "hero-search-card"
          : "hero-search-card hero-search-card-no-origin"
      }
      data-segaloka-ui="search"
      data-segaloka-search-version="1"
    >
      {origin}

      {destination}

      {travelers}

      {date}

      {returnDate}

      <button
        type="button"
        className="hero-search-button"
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
