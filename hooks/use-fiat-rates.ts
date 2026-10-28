import { useEffect, useState } from "react";
import type { FiatRates } from "@/lib/jumpa-send";

/** Live fiat-per-dollar rates. Null until they land, or if they never do. */
export function useFiatRates(enabled: boolean) {
  const [rates, setRates] = useState<FiatRates | null>(null);

  useEffect(() => {
    if (!enabled || rates) return;
    let live = true;
    fetch("/api/v1/rates")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (live && json?.fiatRates) setRates(json.fiatRates);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled, rates]);

  return rates;
}
