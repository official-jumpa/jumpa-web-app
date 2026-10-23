import { resolveNigerianBank, NIGERIAN_BANKS } from "@/lib/NigerianBanks";

export interface CentiivBank {
  name: string;
  code: string;
  slug?: string;
  active?: boolean;
}

/**
 * Centiiv Stellar banks list, backed 100% by NigerianBanks.
 */
export const centiivBanks: CentiivBank[] = NIGERIAN_BANKS.map((b) => ({
  name: b.name,
  code: b.centiivCode || b.cbnCode,
  active: true,
}));

/**
 * Searches for a bank by its name or alias.
 * Uses the unified NigerianBanks registry as the single source of truth.
 */
export function findCentiivBank(bankName: string): CentiivBank | undefined {
  if (!bankName) return undefined;

  const master = resolveNigerianBank(bankName);
  if (master && (master.centiivCode || master.cbnCode)) {
    return {
      name: master.name,
      code: master.centiivCode || master.cbnCode,
      active: true,
    };
  }

  return undefined;
}
