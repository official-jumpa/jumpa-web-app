import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { getRpcUrl } from "@/lib/blockchain";
import { getLiveRates } from "@/lib/rates";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/** Jumpa's EVM sponsor pays the gas to mint a bridge on Ethereum; the user pays it back in USDC out of the amount sent. */

/** Gas for receiveMessage on Ethereum's MessageTransmitterV2. */
const MINT_GAS_UNITS = BigInt(175_000);
/** Quotes add 20% to the gas cost, which also absorbs gas rising before the user confirms. */
const GAS_COST_BUFFER = 1.2;
export const MIN_ETHEREUM_DELIVERY_FEE_USDC = 0.5;
/** Quoted when Ethereum gas can't be read. */
const FALLBACK_ETHEREUM_DELIVERY_FEE_USDC = 3.5;
/** Used when live rates have no ETH price. */
const FALLBACK_ETH_PRICE_USD = 2600;
/** The least that must still arrive on Ethereum once the fee is taken. */
const MIN_ETHEREUM_ARRIVAL_USDC = 1;

/** What minting one transfer on Ethereum costs Jumpa right now, in USD; null when gas can't be read. */
async function readEthereumMintCostUsd(): Promise<number | null> {
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(getRpcUrl("ethereum"), { timeout: 8000 }),
    });
    const gasPrice = await client.getGasPrice();
    const rates = await getLiveRates();
    const ethPriceUsd =
      rates.tokens.find((t) => t.symbol === "ETH")?.usd ||
      FALLBACK_ETH_PRICE_USD;
    return (Number(gasPrice * MINT_GAS_UNITS) / 1e18) * ethPriceUsd;
  } catch (err) {
    console.warn(
      `[Ethereum Delivery] Gas read failed: ${formatOneLineError(err)}`,
    );
    return null;
  }
}

/** The delivery fee to quote: mint gas plus the buffer, rounded to cents, never below the minimum. */
export async function quoteEthereumDeliveryFeeUsdc(): Promise<number> {
  const costUsd = await readEthereumMintCostUsd();
  if (costUsd === null) return FALLBACK_ETHEREUM_DELIVERY_FEE_USDC;
  return Math.max(
    MIN_ETHEREUM_DELIVERY_FEE_USDC,
    Math.round(costUsd * GAS_COST_BUFFER * 100) / 100,
  );
}

export type EthereumDeliveryFeeCheck =
  | { ok: true; feeUsdc: number }
  | { ok: false; error: string };

/**
 * Accepts the fee the user confirmed while it still covers the mint; a lower one
 * (gas rose past the quote's buffer, or a tampered request) is refused, never raised silently.
 */
export async function confirmEthereumDeliveryFee(params: {
  /** As the quote sent it: "0.500000" from the bridge screen, "0.50 USDC" from chat. */
  quotedFee: string;
  amountUsdc: number;
}): Promise<EthereumDeliveryFeeCheck> {
  const feeUsdc = Number.parseFloat(params.quotedFee);
  const costUsd = await readEthereumMintCostUsd();
  const lowestAcceptedFee = Math.max(
    MIN_ETHEREUM_DELIVERY_FEE_USDC,
    costUsd ?? 0,
  );
  if (!(feeUsdc >= lowestAcceptedFee)) {
    return {
      ok: false,
      error:
        "The Ethereum delivery fee has changed since your quote. Please review the new quote and try again.",
    };
  }
  if (params.amountUsdc - feeUsdc < MIN_ETHEREUM_ARRIVAL_USDC) {
    return {
      ok: false,
      error: `Delivery to Ethereum costs ${feeUsdc.toFixed(2)} USDC right now, which leaves too little to send. Send more USDC or try again later.`,
    };
  }
  return { ok: true, feeUsdc };
}
