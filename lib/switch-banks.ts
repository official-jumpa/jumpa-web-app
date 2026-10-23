import { resolveNigerianBank, NIGERIAN_BANKS } from "@/lib/NigerianBanks";

/**
 * Legacy interface for SwitchBanks.
 * Retained for backwards compatibility across older imports.
 */
export interface SwitchBank {
  code: string;
  name: string;
  icon?: string;
}

/**
 * All Nigerian banks supported by Switch, mapped directly from NigerianBanks.
 */
export const SwitchBanks: SwitchBank[] = NIGERIAN_BANKS.map((b) => ({
  code: b.switchCode || b.cbnCode,
  name: b.name,
  icon: "https://res.cloudinary.com/dyedbeksr/image/upload/v1763964534/Group_1000003624_nrunnu.png",
}));

/**
 * Resolve a Switch bank code from a user-supplied bank name or Paystack bank name.
 * Uses the unified NigerianBanks registry as the single source of truth.
 */
export function resolveBankCode(
  bankNameInput: string,
): { code: string; name: string } | null {
  if (!bankNameInput || typeof bankNameInput !== "string") return null;

  const master = resolveNigerianBank(bankNameInput);
  if (master && (master.switchCode || master.cbnCode)) {
    return {
      code: master.switchCode || master.cbnCode,
      name: master.name,
    };
  }

  return null;
}
