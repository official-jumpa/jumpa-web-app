import { randomBytes } from "node:crypto";
import { environment } from "@/lib/environment";
import {
  type GasSponsorshipStore,
  gasSponsorshipStore,
  type SponsorshipRecord,
} from "@/lib/functions/gasSponsorshipFunctions";
import {
  isTronAddress,
  type TronAccount,
  tronAccountFromSecret,
  tronAddressFrom41Hex,
} from "./address";
import * as tronNode from "./node";
import { type TronFeeParams, TronNodeError, type TronSignedTx } from "./node";
import { TRON_MAX_EXPIRY_MS } from "./raw-data";
import {
  TRON_TOKEN_DECIMALS,
  type TronTransferResult,
  toRawUnits,
  tronExplorerUrl,
} from "./transfer";

/**
 * Tron has no fee payer, so a user holding USDT/USDC but too little TRX gets the TRX from
 * Jumpa's sponsor wallet first and pays it back in the same token, plus the platform fee,
 * before their own transfer goes out. Order: top-up → fee to FEE_WALLET_TRON → transfer.
 */

/** Bandwidth a signed TRC-20 transfer burns, with the 64-byte result reserve; ~345 on mainnet. */
const TOKEN_TX_BYTES = BigInt(350);
/** Same for the sponsor's plain TRX top-up (~268). */
const TRX_TX_BYTES = BigInt(270);
/** Gas carries 10% headroom so a dynamic-energy rise can't fail the transfer; the user keeps what isn't burned. */
const HEADROOM = { num: BigInt(11), den: BigInt(10) };
/** fee_limit on each transfer: the live estimate with room, never a fixed number. */
const FEE_LIMIT = { num: BigInt(3), den: BigInt(2) };
/** Top-ups round up to 0.01 TRX. */
const TOP_UP_STEP_SUN = BigInt(10_000);
const SUN_PER_TRX = 1_000_000;
/** One cent in the stablecoins' 6-decimal units; fees round up to it. */
const CENT_RAW = BigInt(10_000);
/** A record still in flight after this is checked on chain; a send waits at most 30s per step. */
const IN_FLIGHT_MS = 60_000;

const ZERO = BigInt(0);
const ceilDiv = (a: bigint, b: bigint) => (a + b - BigInt(1)) / b;
const withHeadroom = (sun: bigint) => ceilDiv(sun * HEADROOM.num, HEADROOM.den);
const burnFor = (energy: bigint, fees: TronFeeParams) =>
  energy * fees.energySun + TOKEN_TX_BYTES * fees.bandwidthSun;
const feeLimitFor = (energy: bigint, fees: TronFeeParams) =>
  ceilDiv(energy * fees.energySun * FEE_LIMIT.num, FEE_LIMIT.den) +
  TOKEN_TX_BYTES * fees.bandwidthSun;

/** "4.13" from 4130000 units. */
export function formatTokenRaw(raw: bigint): string {
  const unit = BigInt(10) ** BigInt(TRON_TOKEN_DECIMALS);
  const fraction = (raw % unit)
    .toString()
    .padStart(TRON_TOKEN_DECIMALS, "0")
    .replace(/0+$/, "");
  const whole = (raw / unit).toString();
  return fraction ? `${whole}.${fraction.padEnd(2, "0")}` : whole;
}

export const formatSunAsTrx = (sun: bigint) =>
  (Number(sun) / SUN_PER_TRX).toFixed(2);

/* ───────────────────────────── Config ───────────────────────────── */

/** The wallet that pays the gas, from SPONSORED_FEE_TRON_KEY; null when unset or invalid. */
export function getTronSponsor(): {
  account: TronAccount;
  address: string;
} | null {
  const secret = environment.SPONSORED_FEE_TRON_KEY.trim();
  if (!secret) return null;
  try {
    const { account, address } = tronAccountFromSecret(secret);
    return { account, address };
  } catch {
    console.error(
      "[TronSponsor] SPONSORED_FEE_TRON_KEY is not a valid key; sponsorship is off.",
    );
    return null;
  }
}

/** Where fees land, from FEE_WALLET_TRON; null when unset or invalid. */
export function getTronFeeWallet(): string | null {
  const address = environment.FEE_WALLET_TRON.trim();
  if (!address) return null;
  if (!isTronAddress(address)) {
    console.error(
      "[TronSponsor] FEE_WALLET_TRON is not a valid Tron address; sponsorship is off.",
    );
    return null;
  }
  return address;
}

const PRICE_TTL_MS = 60_000;
let priceCache: { at: number; usd: number } | undefined;

/** Live TRX price from the first feed that answers; throws rather than guess, so a fee is never mispriced. */
export async function getLiveTrxPriceUsd(): Promise<number> {
  if (priceCache && Date.now() - priceCache.at < PRICE_TTL_MS)
    return priceCache.usd;
  // biome-ignore lint/suspicious/noExplicitAny: each feed's JSON, read by one field
  const feeds: Array<[string, (data: any) => unknown]> = [
    [
      "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd",
      (d) => d?.tron?.usd,
    ],
    [
      "https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT",
      (d) => d?.price,
    ],
    [
      "https://api.kraken.com/0/public/Ticker?pair=TRXUSD",
      (d) => d?.result?.TRXUSD?.c?.[0],
    ],
  ];
  for (const [url, pick] of feeds) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const usd = Number(pick(await res.json()));
      if (usd > 0 && Number.isFinite(usd)) {
        priceCache = { at: Date.now(), usd };
        return usd;
      }
    } catch {
      // next feed
    }
  }
  console.error("[TronSponsor] No TRX price feed answered.");
  throw new TronNodeError(
    "Couldn't price the network fee right now. Please try again shortly.",
  );
}

/** A never-used address: what a single-use deposit address looks like to the token contract. */
function unusedTronAddress(): string {
  return tronAddressFrom41Hex(`41${randomBytes(20).toString("hex")}`);
}

/* ───────────────────────────── Maths ───────────────────────────── */

export type TronGasInputs = {
  userTrxSun: bigint;
  userActivated: boolean;
  /** Energy of the user's own transfer, and of the fee transfer to the fee wallet. */
  mainEnergy: bigint;
  feeEnergy: bigint;
  fees: TronFeeParams;
  trxPriceUsd: number;
  platformFeeUsd: number;
  /** Fees left unpaid by earlier sponsored transfers, in 6-decimal units. */
  owedRaw: bigint;
};

export type TronGasPlan =
  /** The user's TRX covers the transfer; `burnSun` is what it should burn. */
  | { mode: "self"; burnSun: bigint }
  | {
      mode: "sponsored";
      /** TRX sent to the user (0 when they hold enough and only an old fee is collected). */
      topUpSun: bigint;
      /** Everything Jumpa spends: the top-up plus what sending it burns. */
      costSun: bigint;
      /** This transfer's fee: the cost at the live TRX price plus the platform fee, rounded up to the cent. */
      feeRaw: bigint;
      owedRaw: bigint;
      /** What the fee transfer moves: this fee plus anything owed. */
      collectRaw: bigint;
    };

/** Decides who pays the gas and what it costs. Pure, so every number is testable. */
export function planTronGas(input: TronGasInputs): TronGasPlan {
  const { fees } = input;
  const selfBurn = burnFor(input.mainEnergy, fees);
  if (input.owedRaw === ZERO && input.userTrxSun >= withHeadroom(selfBurn)) {
    return { mode: "self", burnSun: selfBurn };
  }

  // Both transfers burn the user's TRX: the fee first, then their own.
  const target = withHeadroom(burnFor(input.feeEnergy, fees) + selfBurn);
  const shortfall =
    target > input.userTrxSun ? target - input.userTrxSun : ZERO;
  const topUpSun = ceilDiv(shortfall, TOP_UP_STEP_SUN) * TOP_UP_STEP_SUN;

  // Sending TRX to an address that has never held any creates its account, which the sender pays for.
  const sendCostSun = input.userActivated
    ? TRX_TX_BYTES * fees.bandwidthSun
    : fees.activationSun;
  const costSun = topUpSun > ZERO ? topUpSun + sendCostSun : ZERO;

  let feeRaw = ZERO;
  if (topUpSun > ZERO) {
    const feeUsd =
      (Number(costSun) / SUN_PER_TRX) * input.trxPriceUsd +
      input.platformFeeUsd;
    // Whole cents up; rounding at 1e-8 first keeps float noise from adding a cent.
    feeRaw = BigInt(Math.ceil(Math.round(feeUsd * 1e8) / 1e6)) * CENT_RAW;
  }

  return {
    mode: "sponsored",
    topUpSun,
    costSun,
    feeRaw,
    owedRaw: input.owedRaw,
    collectRaw: feeRaw + input.owedRaw,
  };
}

/* ───────────────────────────── Execution ───────────────────────────── */

type TronNode = Pick<
  typeof tronNode,
  | "getTronAccount"
  | "getTronFeeParams"
  | "readTokenBalance"
  | "estimateTokenTransferEnergy"
  | "buildTrxTransfer"
  | "buildTokenTransfer"
  | "signTronTransaction"
  | "broadcastTronTransaction"
  | "waitForTronTransaction"
  | "readTronTransactionOutcome"
>;

export type TronSponsorDeps = {
  node: TronNode;
  store: GasSponsorshipStore;
  trxPriceUsd: () => Promise<number>;
  sponsor: () => { account: TronAccount; address: string } | null;
  feeWallet: () => string | null;
  platformFeeUsd: () => number;
  now: () => number;
};

const defaultDeps: TronSponsorDeps = {
  node: tronNode,
  store: gasSponsorshipStore,
  trxPriceUsd: getLiveTrxPriceUsd,
  sponsor: getTronSponsor,
  feeWallet: getTronFeeWallet,
  platformFeeUsd: () => environment.FEE_USD_AMOUNT_TRON,
  now: () => Date.now(),
};

/** Moves records whose transaction has had time to land; returns what the user still owes and whether gas is still landing. */
async function settleUnsettled(
  userId: string,
  deps: TronSponsorDeps,
): Promise<{
  owed: SponsorshipRecord[];
  owedRaw: bigint;
  inFlight: boolean;
}> {
  const owed: SponsorshipRecord[] = [];
  let inFlight = false;
  for (const record of await deps.store.unsettled(userId, "tron")) {
    if (record.status === "OWED") {
      owed.push(record);
      continue;
    }
    const age = deps.now() - new Date(record.updatedAt).getTime();
    // Younger ones belong to a send still running.
    if (age < IN_FLIGHT_MS) {
      inFlight = true;
      continue;
    }
    const topping = record.status === "TOPPING_UP";
    const hash = topping ? record.topUpTxHash : record.feeTxHash;
    const outcome = hash
      ? await deps.node.readTronTransactionOutcome(hash)
      : "FAILED";
    // Unseen past its expiry, it never lands.
    const gone =
      outcome === "FAILED" ||
      (outcome === "PENDING" && age > TRON_MAX_EXPIRY_MS);
    const expect = {
      status: record.status,
      ...(topping ? {} : { feeTxHash: record.feeTxHash }),
    };
    const move = (patch: Parameters<GasSponsorshipStore["update"]>[1]) =>
      deps.store.update([record._id], patch, expect);

    if (outcome === "SUCCESS") {
      if (topping && (await move({ status: "OWED" }))) owed.push(record);
      if (!topping) await move({ status: "PAID" });
    } else if (gone) {
      if (topping) await move({ status: "CANCELLED" });
      else if (await move({ status: "OWED", feeTxHash: null }))
        owed.push(record);
    } else {
      inFlight = true;
    }
  }
  return {
    owed,
    owedRaw: owed.reduce((sum, r) => sum + BigInt(r.feeRaw), ZERO),
    inFlight,
  };
}

/** What a user still owes for earlier sponsored gas, in 6-decimal units. */
export async function getTronOwedRaw(
  userId: string,
  deps: TronSponsorDeps = defaultDeps,
): Promise<bigint> {
  return (await settleUnsettled(userId, deps)).owedRaw;
}

type Assessment = {
  balanceRaw: bigint;
  fees: TronFeeParams;
  mainEnergy: bigint;
  feeEnergy: bigint;
  plan: TronGasPlan;
};

/** Reads the chain and plans the gas for `owner` sending `token` to `to`; null with no token to send. */
async function assess(
  params: { owner: string; token: string; to: string; owedRaw: bigint },
  deps: TronSponsorDeps,
): Promise<Assessment | null> {
  const { owner, token, to, owedRaw } = params;
  const [account, balanceRaw, fees] = await Promise.all([
    deps.node.getTronAccount(owner),
    deps.node.readTokenBalance(owner, token),
    deps.node.getTronFeeParams(),
  ]);
  // A transfer of nothing can't be simulated, and there is nothing to plan.
  if (balanceRaw === ZERO) return null;

  const feeWallet = deps.feeWallet();
  // Energy depends on whether the recipient already holds the token, not on the amount.
  const probe = BigInt(1);
  const [mainEnergy, feeEnergy] = await Promise.all([
    deps.node.estimateTokenTransferEnergy(owner, token, to, probe),
    feeWallet
      ? deps.node.estimateTokenTransferEnergy(owner, token, feeWallet, probe)
      : ZERO,
  ]);

  const inputs = {
    userTrxSun: account.balanceSun,
    userActivated: account.exists,
    mainEnergy,
    feeEnergy,
    fees,
    platformFeeUsd: deps.platformFeeUsd(),
    owedRaw,
  };
  let plan = planTronGas({ ...inputs, trxPriceUsd: 0 });
  // The price only matters once Jumpa pays, so a self-paid send never waits on a price feed.
  if (plan.mode === "sponsored" && plan.topUpSun > ZERO) {
    plan = planTronGas({ ...inputs, trxPriceUsd: await deps.trxPriceUsd() });
  }
  return { balanceRaw, fees, mainEnergy, feeEnergy, plan };
}

/** One unpaid fee at most: a user who still owes pays for their next gas themselves. */
const needsGasWhileOwing = (plan: TronGasPlan) =>
  plan.mode === "sponsored" && plan.owedRaw > ZERO && plan.topUpSun > ZERO;

export type TronTokenSendQuote = {
  balanceRaw: bigint;
  /** Jumpa covers the gas and takes `feeRaw` in the token, including anything owed. */
  sponsored: boolean;
  feeRaw: bigint;
  /** TRX the transfer burns when the user pays their own gas. */
  burnSun: bigint;
};

/**
 * The fee a send would carry right now. Without `to` it assumes a recipient that has never
 * held the token: the dearest case, and what a single-use deposit address always is.
 */
export async function quoteTronTokenSend(
  params: { userId: string; owner: string; token: string; to?: string },
  deps: TronSponsorDeps = defaultDeps,
): Promise<TronTokenSendQuote | null> {
  if (!isTronAddress(params.owner)) return null;
  const { owedRaw } = await settleUnsettled(params.userId, deps);
  const to =
    params.to && isTronAddress(params.to)
      ? params.to.trim()
      : unusedTronAddress();
  const result = await assess(
    { owner: params.owner, token: params.token, to, owedRaw },
    deps,
  );
  if (!result) return null;

  const { plan, balanceRaw } = result;
  if (
    plan.mode === "sponsored" &&
    !needsGasWhileOwing(plan) &&
    deps.sponsor() &&
    deps.feeWallet()
  ) {
    return {
      balanceRaw,
      sponsored: true,
      feeRaw: plan.collectRaw,
      burnSun: ZERO,
    };
  }
  return {
    balanceRaw,
    sponsored: false,
    feeRaw: ZERO,
    burnSun: burnFor(result.mainEnergy, result.fees),
  };
}

/** A send's fee as the send screen shows it: in the token when Jumpa sponsors, in TRX otherwise. */
export type TronTokenSendFee = {
  sponsored: boolean;
  fee: string;
  feeAsset: string;
  feeUsd?: number;
};

export async function getTronTokenSendFee(
  params: {
    userId: string;
    owner: string;
    token: string;
    symbol: string;
    to?: string;
  },
  deps: TronSponsorDeps = defaultDeps,
): Promise<TronTokenSendFee | null> {
  const quote = await quoteTronTokenSend(params, deps);
  if (!quote) return null;
  if (quote.sponsored) {
    const fee = formatTokenRaw(quote.feeRaw);
    return {
      sponsored: true,
      fee,
      feeAsset: params.symbol,
      feeUsd: Number(fee),
    };
  }
  const fee = formatSunAsTrx(quote.burnSun);
  // The dollar hint is optional; a price outage still shows the TRX.
  const price = await deps.trxPriceUsd().catch(() => undefined);
  return {
    sponsored: false,
    fee,
    feeAsset: "TRX",
    feeUsd: price ? Number(fee) * price : undefined,
  };
}

const SLOW_NETWORK =
  "The Tron network is slow right now, so your transfer wasn't sent. Please try again in a minute.";
const NO_COVER =
  "Network fee cover is unavailable right now. Please try again shortly.";
const IN_PROGRESS =
  "Another transfer is still going through. Please try again in a minute.";

/**
 * Sends a TRC-20 token. When the user's TRX can't cover the gas, Jumpa tops it up and the fee
 * (plus anything owed) is collected on chain before their transfer goes out.
 */
export async function sendTronToken(
  params: {
    userId: string;
    mnemonicOrPrivateKey: string;
    toAddress: string;
    amount: number | string;
    token: string;
    symbol: string;
  },
  deps: TronSponsorDeps = defaultDeps,
): Promise<TronTransferResult> {
  const { userId, token, symbol } = params;
  const toAddress = params.toAddress.trim();
  if (!isTronAddress(toAddress)) {
    return { success: false, error: "That isn't a valid Tron address." };
  }
  const amountRaw = toRawUnits(params.amount, TRON_TOKEN_DECIMALS);
  if (amountRaw === null)
    return { success: false, error: "Invalid transfer amount." };

  try {
    const { account: user, address: owner } = tronAccountFromSecret(
      params.mnemonicOrPrivateKey,
    );
    const transfer = async (
      to: string,
      raw: bigint,
      energy: bigint,
      fees: TronFeeParams,
    ) =>
      deps.node.signTronTransaction(
        await deps.node.buildTokenTransfer({
          owner,
          token,
          to,
          amountRaw: raw,
          feeLimitSun: feeLimitFor(energy, fees),
        }),
        user,
      );

    const { owed, owedRaw, inFlight } = await settleUnsettled(userId, deps);
    // Another send's gas is still landing; sending now could spend it.
    if (inFlight) return { success: false, error: IN_PROGRESS };
    const result = await assess({ owner, token, to: toAddress, owedRaw }, deps);
    if (!result || result.balanceRaw < amountRaw) {
      return { success: false, error: `Not enough ${symbol} for this amount.` };
    }
    const { plan, fees, mainEnergy, feeEnergy, balanceRaw } = result;

    if (plan.mode === "self") {
      const main = await transfer(toAddress, amountRaw, mainEnergy, fees);
      await deps.node.broadcastTronTransaction(main);
      console.log(
        `[TronSponsor] ${owner} sent ${formatTokenRaw(amountRaw)} ${symbol} on their own TRX: ${main.txID}`,
      );
      return {
        success: true,
        txHash: main.txID,
        explorerUrl: tronExplorerUrl(main.txID),
      };
    }

    const sponsor = deps.sponsor();
    const feeWallet = deps.feeWallet();
    if (!sponsor || !feeWallet) {
      const need = formatSunAsTrx(withHeadroom(burnFor(mainEnergy, fees)));
      return {
        success: false,
        error: `You need about ${need} TRX in this wallet to pay the network fee.`,
      };
    }
    if (needsGasWhileOwing(plan)) {
      return {
        success: false,
        error: `Your last network fee is still unpaid, so this transfer can't be covered. Add about ${formatSunAsTrx(plan.topUpSun)} TRX to this wallet and try again; that transfer also pays the old fee.`,
      };
    }
    if (balanceRaw < amountRaw + plan.collectRaw) {
      const most =
        balanceRaw > plan.collectRaw ? balanceRaw - plan.collectRaw : ZERO;
      return {
        success: false,
        error: `Not enough ${symbol}. A ${formatTokenRaw(plan.collectRaw)} ${symbol} network fee is added to this transfer, so you can send up to ${formatTokenRaw(most)} ${symbol}.`,
      };
    }

    // 1. Jumpa's TRX, recorded before broadcast so a crash can't lose the debt.
    let recordId: string | null = null;
    if (plan.topUpSun > ZERO) {
      let topUp: TronSignedTx;
      try {
        topUp = await deps.node.signTronTransaction(
          await deps.node.buildTrxTransfer(
            sponsor.address,
            owner,
            plan.topUpSun,
          ),
          sponsor.account,
        );
      } catch (err) {
        // The node refuses a top-up the sponsor can't afford, so this is also the low-balance alarm.
        console.error(
          `[TronSponsor] Sponsor ${sponsor.address} couldn't send ${formatSunAsTrx(plan.topUpSun)} TRX:`,
          err,
        );
        throw new TronNodeError(NO_COVER);
      }
      recordId = await deps.store.create({
        userId,
        chain: "tron",
        address: owner,
        topUpTxHash: topUp.txID,
        topUpSun: Number(plan.topUpSun),
        costSun: Number(plan.costSun),
        feeRaw: Number(plan.feeRaw),
      });
      // Another send for this user got there first; nothing has been broadcast.
      if (!recordId) throw new TronNodeError(IN_PROGRESS);
      // A failed broadcast may still have reached the network; the record stays TOPPING_UP and the chain settles it.
      await deps.node.broadcastTronTransaction(topUp).catch((err) => {
        console.error(
          `[TronSponsor] Top-up ${topUp.txID} broadcast failed:`,
          err,
        );
        throw new TronNodeError(NO_COVER);
      });
      const landed = await deps.node.waitForTronTransaction(topUp.txID);
      if (landed === "FAILED") {
        await deps.store.update(
          [recordId],
          { status: "CANCELLED" },
          { status: "TOPPING_UP" },
        );
        console.error(`[TronSponsor] Top-up ${topUp.txID} failed on chain.`);
        throw new TronNodeError(NO_COVER);
      }
      if (landed === "PENDING") throw new TronNodeError(SLOW_NETWORK);
      await deps.store.update(
        [recordId],
        { status: "OWED" },
        { status: "TOPPING_UP" },
      );
    }

    // 2. The fee, before the user's transfer, so sponsored gas is always paid for.
    const collectIds = [
      ...(recordId ? [recordId] : []),
      ...owed.map((r) => r._id),
    ];
    const fee = await transfer(feeWallet, plan.collectRaw, feeEnergy, fees);
    const mine = { status: "COLLECTING" as const, feeTxHash: fee.txID };
    // Claimed only while still OWED, so two sends at once can't both collect the same debt.
    const claimed = await deps.store.update(collectIds, mine, {
      status: "OWED",
    });
    if (claimed !== collectIds.length) {
      await deps.store.update(
        collectIds,
        { status: "OWED", feeTxHash: null },
        mine,
      );
      throw new TronNodeError(IN_PROGRESS);
    }
    // As with the top-up, a failed broadcast leaves the claim for the chain to settle.
    await deps.node.broadcastTronTransaction(fee);
    const paid = await deps.node.waitForTronTransaction(fee.txID);
    if (paid === "PENDING") throw new TronNodeError(SLOW_NETWORK);
    if (paid === "FAILED") {
      await deps.store.update(
        collectIds,
        { status: "OWED", feeTxHash: null },
        mine,
      );
      throw new TronNodeError(
        "Couldn't take the network fee, so your transfer wasn't sent. Please try again.",
      );
    }
    await deps.store.update(collectIds, { status: "PAID" }, mine);

    // 3. The user's own transfer.
    const main = await transfer(toAddress, amountRaw, mainEnergy, fees);
    try {
      await deps.node.broadcastTronTransaction(main);
    } catch (err) {
      console.error(
        `[TronSponsor] Fee collected but ${owner}'s transfer didn't broadcast:`,
        err,
      );
      throw new TronNodeError(
        "Your transfer didn't go through. The network fee is already paid, so trying again won't charge it twice.",
      );
    }
    if (recordId)
      await deps.store.update([recordId], { transferTxHash: main.txID });

    console.log(
      `[TronSponsor] ${owner} sent ${formatTokenRaw(amountRaw)} ${symbol}: gas ${formatSunAsTrx(plan.topUpSun)} TRX, fee ${formatTokenRaw(plan.collectRaw)} ${symbol}, tx ${main.txID}`,
    );
    return {
      success: true,
      txHash: main.txID,
      explorerUrl: tronExplorerUrl(main.txID),
      feePaid: formatTokenRaw(plan.collectRaw),
    };
  } catch (err) {
    if (err instanceof TronNodeError)
      return { success: false, error: err.message };
    console.error("[TronSponsor] Unexpected error:", err);
    return {
      success: false,
      error:
        "Unable to send transaction to the Tron network. Please try again shortly.",
    };
  }
}
