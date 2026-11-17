import { createPublicClient, formatEther, http, parseEther } from "viem";
import { base, mainnet as ethMainnet } from "viem/chains";
import { getRpcUrl } from "@/lib/blockchain";

export type EvmChain = "base" | "eth";

/** Gas a plain ETH transfer uses, and an ERC-20 transfer at most. */
export const EVM_GAS_UNITS = { native: BigInt(21000), token: BigInt(65000) };

/** Least gas a send keeps back, for when the live price reads near zero. */
const EVM_GAS_FLOOR_WEI: Record<EvmChain, bigint> = {
  eth: parseEther("0.0001"),
  base: parseEther("0.000005"),
};

/** One signature's fee on a native SOL transfer. */
export const SOL_TRANSFER_FEE = 0.000005;
/** What a Solana account keeps to stay open; a send that leaves less (but not zero) fails. */
const SOL_RENT_EXEMPT_MIN = 0.00089088;

/** A TRX send's bandwidth (~270 bytes at 1,000 sun) once the free daily allowance is used up. */
const TRX_TRANSFER_FEE = 0.27;
/** Activating an address that has never held TRX costs 1.1 TRX; MAX keeps 1.2 so a send to any address clears. */
const TRX_HOLDBACK = 1.2;

/** MAX keeps back 1.5× what the send checks for, so gas rising before the PIN can't fail it. */
const MAX_HEADROOM = { num: BigInt(3), den: BigInt(2) };

/** Gas a send must leave in the wallet: the live estimate plus 20%, never below the chain's floor. */
export function evmGasReserveWei(
  chain: EvmChain,
  gasPrice: bigint,
  gasUnits: bigint,
): bigint {
  const estimate = (gasPrice * gasUnits * BigInt(12)) / BigInt(10);
  const floor = EVM_GAS_FLOOR_WEI[chain];
  // biome-ignore lint/complexity/useMathMinMax: bigints, which Math.max can't take
  return estimate > floor ? estimate : floor;
}

export type NativeSendFee = {
  /** What the network should charge for this send, in the chain's coin. */
  fee: number;
  /** What MAX leaves in the wallet so the send still clears. */
  holdback: number;
};

/** Live cost of sending a chain's own coin (ETH on Base/Ethereum, SOL on Solana, TRX on Tron). */
export async function getNativeSendFee(
  chain: EvmChain | "solana" | "tron",
): Promise<NativeSendFee> {
  if (chain === "tron") {
    return { fee: TRX_TRANSFER_FEE, holdback: TRX_HOLDBACK };
  }
  if (chain === "solana") {
    return {
      fee: SOL_TRANSFER_FEE,
      holdback: SOL_TRANSFER_FEE + SOL_RENT_EXEMPT_MIN,
    };
  }

  const client = createPublicClient({
    chain: chain === "base" ? base : ethMainnet,
    transport: http(getRpcUrl(chain === "eth" ? "ethereum" : "base")),
  });
  const gasPrice = await client.getGasPrice();
  const reserve = evmGasReserveWei(chain, gasPrice, EVM_GAS_UNITS.native);
  return {
    fee: Number(formatEther(gasPrice * EVM_GAS_UNITS.native)),
    holdback: Number(
      formatEther((reserve * MAX_HEADROOM.num) / MAX_HEADROOM.den),
    ),
  };
}
