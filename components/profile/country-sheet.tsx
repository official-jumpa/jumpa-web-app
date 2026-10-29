"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { COUNTRY_NAMES } from "@/lib/countries";

/** Searchable country list. Picking a row closes the sheet. */
export function CountrySheet({
  value,
  onPick,
  onClose,
}: {
  value: string | null;
  onPick: (country: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? COUNTRY_NAMES.filter((name) => name.toLowerCase().includes(needle))
    : COUNTRY_NAMES;

  return (
    <SheetPortal onClose={onClose}>
      <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-ink">
        Select country
      </h2>

      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-pill bg-jumpa-neutral-50 px-4">
        <SearchAltIcon className="size-4.5 shrink-0 text-jumpa-primary-600" />
        <span className="sr-only">Search countries</span>
        <input
          type="text"
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-sm tracking-jumpa-snug text-jumpa-ink outline-none placeholder:text-jumpa-primary-950"
        />
      </label>

      {/* Fixed height so the sheet does not jump while filtering. A drag inside a
          scrolled list scrolls it instead of pulling the sheet down. */}
      <ul
        onPointerDown={(event) => {
          if (event.currentTarget.scrollTop > 0) event.stopPropagation();
        }}
        className="mt-3 h-[min(56dvh,420px)] overflow-y-auto overscroll-contain"
      >
        {matches.map((name) => {
          const picked = name === value;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => onPick(name)}
                aria-pressed={picked}
                className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm tracking-jumpa-snug tap ${
                  picked
                    ? "bg-jumpa-primary-50 font-medium text-jumpa-primary-600"
                    : "text-jumpa-ink active:bg-jumpa-neutral-50"
                }`}
              >
                <span className="truncate">{name}</span>
                {picked ? <CheckIcon className="size-4.5 shrink-0" /> : null}
              </button>
            </li>
          );
        })}
        {matches.length === 0 ? (
          <li className="pt-6 text-center text-sm text-jumpa-neutral-500">
            No country matches “{query.trim()}”.
          </li>
        ) : null}
      </ul>
    </SheetPortal>
  );
}
