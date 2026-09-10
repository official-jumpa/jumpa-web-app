"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import { settingsHref } from "@/components/settings/sections";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { Select } from "@/components/ui/select";
import { getAssetLogo } from "@/lib/assets";
import {
  DEFAULT_RATE_CURRENCY,
  formatRate,
  RATE_CURRENCIES,
  RATE_TOKENS,
} from "@/lib/rates";

const CURRENCY_OPTIONS = RATE_CURRENCIES.map(({ code, flag }) => ({
  value: code,
  label: code,
  icon: flag,
}));

/** `?section=rates`. What every token is worth in the chosen currency. */
export function CurrencyRates() {
  const [currency, setCurrency] = useState(DEFAULT_RATE_CURRENCY);
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const matches = term
    ? RATE_TOKENS.filter((token) =>
        [token.symbol, token.name].some((field) =>
          field.toLowerCase().includes(term),
        ),
      )
    : RATE_TOKENS;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader
        back={settingsHref()}
        title="Currency Rates"
        action={
          <Select
            label="Rate currency"
            variant="currency"
            value={currency}
            onValueChange={setCurrency}
            options={CURRENCY_OPTIONS}
          />
        }
      />

      {/* h-14.5 — the design's stroke is inside, a CSS border is outside. */}
      <label className="mt-4.75 flex h-14.5 w-full items-center gap-2 rounded-pill border border-jumpa-neutral-60 bg-jumpa-neutral-50 pr-5.25 pl-4">
        <SearchAltIcon
          aria-hidden="true"
          className="size-6 shrink-0 text-jumpa-primary-950"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for Rates"
          aria-label="Search for Rates"
          className="w-full min-w-0 bg-transparent text-sm leading-4 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-primary-950"
        />
      </label>

      {matches.length === 0 ? (
        <p className="mt-10 text-center text-sm text-jumpa-neutral-400">
          No rate matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <SettingCard className="mt-4.25">
          {matches.map((token, index) => (
            <Fragment key={token.symbol}>
              {index > 0 ? <SettingRule /> : null}
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  {/* Resolved from the symbol so the mark cannot disagree. */}
                  <Image
                    src={getAssetLogo(token.symbol)}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full object-contain"
                  />
                  <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
                    {token.symbol}
                  </span>
                </span>
                <span className="shrink-0 text-sm leading-4 font-medium text-jumpa-black">
                  {formatRate(token, currency)}
                </span>
              </div>
            </Fragment>
          ))}
        </SettingCard>
      )}
    </div>
  );
}
