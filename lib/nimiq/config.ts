import { environment } from "@/lib/environment";

export type NimiqLimits = {
  /** Rolling 24-hour USD limit per wallet. */
  dailyUsd: number;
  maxTxUsd: number;
  minUsd: number;
};

export type NimiqConfig = NimiqLimits & { enabled: boolean };

const DEFAULT_LIMITS: NimiqLimits = { dailyUsd: 500, maxTxUsd: 500, minUsd: 1 };

/** A malformed limit falls back to the default; it must never disable the check. */
function positive(raw: string, fallback: number): number {
  const value = Number(raw);
  return raw.trim() && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function nimiqConfig(): NimiqConfig {
  return {
    enabled: environment.NIMIQ_MINIAPP_ENABLED === "true",
    dailyUsd: positive(
      environment.NIMIQ_DAILY_LIMIT_USD,
      DEFAULT_LIMITS.dailyUsd,
    ),
    maxTxUsd: positive(environment.NIMIQ_TX_LIMIT_USD, DEFAULT_LIMITS.maxTxUsd),
    minUsd: positive(environment.NIMIQ_MIN_USD, DEFAULT_LIMITS.minUsd),
  };
}
