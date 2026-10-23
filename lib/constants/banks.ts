import { NIGERIAN_BANKS } from "@/lib/NigerianBanks";

/**
 * Legacy interface for supportedBanks.
 * Backed 100% by NigerianBanks.
 */
export interface SupportedBank {
  name: string;
  code: string;
}

export const supportedBanks: SupportedBank[] = NIGERIAN_BANKS.map((b) => ({
  name: b.name,
  code: b.paystackCode || b.cbnCode,
}));