import * as StellarSdk from "@stellar/stellar-sdk";
import { getExplorerTxUrl } from "@/lib/blockchain";
import {
  collectStellarGasFeeUsdc,
  deriveStellarKeypairFromMnemonic,
  deriveStellarKeypairFromPrivateKey,
  ensureSufficientStellarGas,
  getStellarFeeAmount,
} from "@/lib/chains/stellar";
import { fetchStellarBalances } from "@/lib/chains/stellar/account";
import { DefindexClient } from "@/lib/chains/stellar/defindex-client";
import { decryptMnemonic, encryptMnemonic } from "@/lib/crypto";
import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { creditPlanForUsdcDeposit } from "@/lib/functions/savingsFunctions";
import { generateId } from "@/lib/schema-ids";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { type ISavingsPlan, SavingsPlan } from "@/models/SavingsPlan";
import { Transaction } from "@/models/Transaction";
import { type IWallet, Wallet } from "@/models/Wallet";

/** Moving a saver's Stellar USDC into their DeFindex savings position. Manual top-ups and auto-save share it. */

/** Below this much XLM the account is topped up from Jumpa's sponsor before a deposit. */
const MIN_GAS_XLM = 2.0;
const TARGET_GAS_XLM = 2.5;
const STROOPS_PER_USDC = 10_000_000;

const defindex = new DefindexClient(
  environment.DEFINDEX_API_KEY,
  environment.DEFINDEX_BASE_URL,
  "mainnet",
);

/** `unconfirmed` may still land: its Transaction stays PENDING and the resolver books it. */
export type UsdcDepositFailure =
  | "insufficient"
  | "build"
  | "rejected"
  | "unconfirmed";

export class UsdcDepositError extends Error {
  readonly kind: UsdcDepositFailure;

  constructor(message: string, kind: UsdcDepositFailure) {
    super(message);
    this.name = "UsdcDepositError";
    this.kind = kind;
  }
}

/**
 * The saver's Stellar keys, or null when they will not open. Without a PIN only
 * a v3-sealed wallet opens; `pinVersion` alone is not trusted, as it defaults to v3.
 */
export function unlockStellarKeypair(
  wallet: IWallet,
  pin?: string,
): StellarSdk.Keypair | null {
  try {
    const secret = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
      wallet,
    );
    const keys =
      wallet.setupMethod === "IMPORTED_PRIVATE_KEY"
        ? deriveStellarKeypairFromPrivateKey(secret)
        : deriveStellarKeypairFromMnemonic(secret);
    return StellarSdk.Keypair.fromSecret(keys.secretKey);
  } catch {
    return null;
  }
}

/**
 * Auto-save signs with no PIN, so at setup a wallet only its PIN opens is
 * re-sealed as v3, as the background migration does. False if the PIN cannot open it.
 */
export async function enablePinlessSigning(
  wallet: IWallet,
  pin: string,
): Promise<boolean> {
  if (unlockStellarKeypair(wallet)) return true;
  let secret: string;
  try {
    secret = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
      wallet,
    );
  } catch {
    return false;
  }
  await Wallet.updateOne(
    { _id: wallet._id },
    { $set: { ...encryptMnemonic(secret), pinVersion: "v3" } },
  );
  return true;
}

let sponsorQueue: Promise<unknown> = Promise.resolve();

/** Gas top-ups share one sponsor account and its sequence number, so they go one at a time. */
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = sponsorQueue.then(task, task);
  sponsorQueue = run.catch(() => undefined);
  return run;
}

/**
 * Deposits `amount` USDC into the plan's vault and credits the plan.
 * The signed transaction is recorded before it is sent, so one that lands
 * after a timeout is still booked by the resolver, exactly once.
 */
export async function moveUsdcIntoPlan(params: {
  userId: string;
  walletId: string;
  stellarAddress: string;
  keypair: StellarSdk.Keypair;
  planId: string;
  amount: number;
  via: "topup" | "autosave";
  /** Manual top-ups pay a small USDC fee when their gas is topped up; auto-save runs never do. */
  chargeGasFee: boolean;
}): Promise<{ plan: ISavingsPlan; txHash: string; explorerUrl: string }> {
  const {
    userId,
    walletId,
    stellarAddress,
    keypair,
    planId,
    amount,
    via,
    chargeGasFee,
  } = params;
  await connectDB();
  const vault = environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;

  const balances = await fetchStellarBalances(stellarAddress);
  const available = Number(balances.mainnet.usdc) || 0;
  const needsGas = (Number(balances.mainnet.xlm) || 0) < MIN_GAS_XLM;
  const fee = chargeGasFee && needsGas ? getStellarFeeAmount() : 0;
  if (available < amount + fee) {
    throw new UsdcDepositError(
      fee > 0
        ? `Insufficient USDC balance: you have $${available.toFixed(2)} USDC, but this top-up requires $${amount.toFixed(2)} USDC plus $${fee.toFixed(2)} USDC network fee.`
        : `Insufficient balance: you have $${available.toFixed(2)} USDC and this top-up needs $${amount.toFixed(2)}.`,
      "insufficient",
    );
  }

  if (needsGas) {
    const gas = await oneAtATime(() =>
      ensureSufficientStellarGas(
        stellarAddress,
        MIN_GAS_XLM,
        TARGET_GAS_XLM,
        "mainnet",
      ),
    );
    if (gas.sponsored && fee > 0) {
      await collectStellarGasFeeUsdc({
        userKeypair: keypair,
        amountUsdc: fee,
        network: "mainnet",
      }).catch((err) =>
        console.warn(
          `[SavingsUsdc] Gas fee not collected: ${formatOneLineError(err)}`,
        ),
      );
    }
  }

  let xdr: string | undefined;
  try {
    const built = await defindex.deposit(vault, {
      amounts: [Math.round(amount * STROOPS_PER_USDC)],
      caller: stellarAddress,
      invest: true,
      slippageBps: 50,
    });
    xdr = built?.xdr;
  } catch (err) {
    console.error(`[SavingsUsdc] Build failed: ${formatOneLineError(err)}`);
  }
  if (!xdr) {
    throw new UsdcDepositError(
      "We couldn't prepare your top-up. Please try again.",
      "build",
    );
  }

  const tx = StellarSdk.TransactionBuilder.fromXDR(
    xdr,
    StellarSdk.Networks.PUBLIC,
  );
  tx.sign(keypair);
  const txHash = tx.hash().toString("hex");
  const explorerUrl = getExplorerTxUrl("stellar", txHash, false);

  const record = await Transaction.create({
    _id: generateId("wdref"),
    userId,
    walletId,
    type: "SAVINGS_DEPOSIT",
    status: "PENDING",
    chain: "stellar",
    network: "mainnet",
    fromAddress: stellarAddress,
    toAddress: vault,
    amount: String(amount),
    token: "USDC",
    memo: `savings:${via}:${planId}`,
    txHash,
    explorerUrl,
    savingsDetails: { planId, vaultAddress: vault },
  });

  try {
    await defindex.send(tx.toXDR());
  } catch (err) {
    const { statusCode, rawDetail } = err as {
      statusCode?: number;
      rawDetail?: unknown;
    };
    const detail = formatOneLineError(rawDetail ?? err);
    // A 4xx is the network turning it down; anything else may still land.
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      await Transaction.updateOne(
        { _id: record._id, status: "PENDING" },
        { $set: { status: "FAILED", errorMessage: detail } },
      );
      throw new UsdcDepositError(
        "Unable to complete on-chain savings top-up. Please verify your balance and try again.",
        "rejected",
      );
    }
    await Transaction.updateOne(
      { _id: record._id },
      { $set: { errorMessage: detail } },
    );
    throw new UsdcDepositError(
      "We couldn't confirm your top-up yet. Check your savings in a few minutes before trying again.",
      "unconfirmed",
    );
  }

  // The resolver may have booked it already; whoever flips it to CONFIRMED credits the plan.
  const confirmed = await Transaction.updateOne(
    { _id: record._id, status: "PENDING" },
    { $set: { status: "CONFIRMED", executedAt: new Date() } },
  );
  const plan = confirmed.modifiedCount
    ? await creditPlanForUsdcDeposit({ userId, planId, amount, txHash })
    : await SavingsPlan.findById(planId).lean<ISavingsPlan>();
  if (!plan) throw new Error(`Savings plan ${planId} not found after deposit`);

  return { plan, txHash, explorerUrl };
}
