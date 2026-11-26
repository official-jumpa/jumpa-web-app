import { environment } from "@/lib/environment";
import { getCentiivQuote } from "@/lib/functions/centiivFunctions";
import { SwitchService } from "@/lib/switch";

/*
 * Naira rates for the chat's rate answer, with every fee already taken off. Each one is priced
 * from the same provider quote the deposit and cash-out cards use, so the rate and the card agree.
 */

/** Sample sizes that clear every provider's minimum. */
const BUY_SAMPLE_NGN = 50_000;
const SELL_SAMPLE_TOKENS = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Jumpa's Switch fee as a fraction; SWITCH_JUMPA_FEE is a percentage (1 = 1%). */
const jumpaSwitchFee = () => environment.SWITCH_JUMPA_FEE / 100;

/** Naira paid per token when buying `asset` through Switch, fees included. */
export async function getSwitchBuyRate(asset: string): Promise<number | null> {
  const quote = await SwitchService.getQuote(BUY_SAMPLE_NGN, asset);
  const tokens = Number(quote.data?.destination?.amount);
  if (quote.success && tokens > 0) return round2(BUY_SAMPLE_NGN / tokens);

  // No quote: the plain rate with Jumpa's fee, which comes off the tokens.
  const res = await SwitchService.getOnrampRate(asset);
  return res.success && res.rate
    ? round2(res.rate / (1 - jumpaSwitchFee()))
    : null;
}

/** Naira received per token when cashing out `asset` through Switch, fees included. */
export async function getSwitchSellRate(asset: string): Promise<number | null> {
  const quote = await SwitchService.getOfframpQuote(SELL_SAMPLE_TOKENS, asset);
  const naira = Number(quote.data?.destination?.amount);
  if (quote.success && naira > 0) return round2(naira / SELL_SAMPLE_TOKENS);

  // No quote: the plain rate with Jumpa's fee, which comes off the naira.
  const res = await SwitchService.getOfframpRate(asset);
  return res.success && res.rate
    ? round2(res.rate * (1 - jumpaSwitchFee()))
    : null;
}

/** Naira paid per USDC when buying on Stellar through Centiiv, fees included. Throws if Centiiv is down. */
export async function getCentiivBuyRate(): Promise<number | null> {
  const quote = await getCentiivQuote({
    fromAsset: "NGN",
    toAsset: "USDC",
    amount: BUY_SAMPLE_NGN,
  });
  const usdc = Number(quote.estimatedReceivableAmount);
  return usdc > 0 ? round2(BUY_SAMPLE_NGN / usdc) : null;
}

/** Naira received per USDC when cashing out on Stellar through Centiiv, fees included. Throws if Centiiv is down. */
export async function getCentiivSellRate(): Promise<number | null> {
  const quote = await getCentiivQuote({
    fromAsset: "USDC",
    toAsset: "NGN",
    amount: SELL_SAMPLE_TOKENS,
  });
  const naira = Number(quote.estimatedReceivableAmount);
  return naira > 0 ? round2(naira / SELL_SAMPLE_TOKENS) : null;
}

/** " (this includes Jumpa's 1% service fee)" for Switch prices, or "" when the fee is off. */
export function jumpaSwitchFeeAside(): string {
  const fee = environment.SWITCH_JUMPA_FEE;
  return fee > 0 ? ` (this includes Jumpa's ${fee}% service fee)` : "";
}

/** What a Switch card amount already includes, so the bot never invents a reason for the difference. */
export function switchFeeNoteForAI(): string {
  return (
    ` This amount already has all fees taken off${jumpaSwitchFeeAside()}. Only if the user asks why it` +
    " differs from amount × rate, explain that. A new card would give about the same amount, so never" +
    " suggest cancelling or recreating it to get a better rate."
  );
}
