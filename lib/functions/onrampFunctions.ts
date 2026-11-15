import { getCentiivQuote } from "@/lib/functions/centiivFunctions";
import { onrampMinNaira } from "@/lib/naira-deposit";
import { SwitchService } from "@/lib/switch";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/** Centiiv only prices a sized order; this one is large enough that fees don't skew the rate. */
const CENTIIV_RATE_SAMPLE_NGN = 50_000;

/**
 * Naira per token for buying `asset` (e.g. "base:usdc"). Stellar prices through
 * Centiiv, everything else through Switch. Null when the provider can't say.
 */
export async function getOnrampNairaPerToken(
  asset: string,
): Promise<number | null> {
  try {
    if (asset.toLowerCase().includes("stellar")) {
      const quote = await getCentiivQuote({
        fromAsset: "NGN",
        toAsset: "USDC",
        amount: CENTIIV_RATE_SAMPLE_NGN,
      });
      const raw = Number(quote.rate);
      // Centiiv can quote tokens per naira; callers always want naira per token.
      return raw > 0 ? (raw < 1 ? 1 / raw : raw) : null;
    }
    const res = await SwitchService.getOnrampRate(asset);
    return res.success && res.rate && res.rate > 0 ? res.rate : null;
  } catch (err) {
    console.warn(
      `[Onramp] Rate lookup failed for ${asset}: ${formatOneLineError(err)}`,
    );
    return null;
  }
}

/** The smallest naira deposit for `asset`, or null when there's no live rate to price it. */
export async function getOnrampMinNaira(asset: string): Promise<number | null> {
  const rate = await getOnrampNairaPerToken(asset);
  return rate ? onrampMinNaira(rate) : null;
}
