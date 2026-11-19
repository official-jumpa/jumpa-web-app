import { environment } from "@/lib/environment";
import {
  type TronAccount,
  tronAddressAbiWord,
  tronAddressTo41Hex,
} from "./address";
import {
  type ExpectedTronTransaction,
  encodeSignedTransaction,
  verifyTronTransaction,
} from "./raw-data";

/** TronGrid's full-node HTTP API: every Tron read, build and broadcast goes through here. */

/** A node-built transaction that passed verifyTronTransaction. */
export type TronUnsignedTx = { txID: string; raw_data_hex: string };
export type TronSignedTx = { txID: string; hex: string };

/** Thrown with a message that is safe to show the user. */
export class TronNodeError extends Error {}

const UNREACHABLE =
  "Unable to reach the Tron network. Please try again shortly.";

// biome-ignore lint/suspicious/noExplicitAny: TronGrid JSON, read field by field
async function tronPost(path: string, body: unknown): Promise<any> {
  const key = environment.TRONGRID_API_KEY.trim();
  const res = await fetch(`${environment.TRON_API_HOST}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "TRON-PRO-API-KEY": key } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error(`[TronNode] ${path} returned HTTP ${res.status}`);
    throw new TronNodeError(UNREACHABLE);
  }
  return res.json();
}

/** Whether the account exists on chain (an address that never received TRX doesn't) and its TRX in sun. */
export async function getTronAccount(
  address: string,
): Promise<{ exists: boolean; balanceSun: bigint }> {
  const account = await tronPost("/wallet/getaccount", {
    address,
    visible: true,
  });
  const exists = Boolean(account?.address);
  return { exists, balanceSun: BigInt(account?.balance ?? 0) };
}

export type TronFeeParams = {
  /** Sun burned per unit of energy. */
  energySun: bigint;
  /** Sun burned per byte of bandwidth once the free daily allowance is gone. */
  bandwidthSun: bigint;
  /** Sun the sender burns when a TRX transfer creates the receiving account. */
  activationSun: bigint;
};

const FEE_PARAMS_TTL_MS = 10 * 60 * 1000;
let feeParamsCache: { at: number; params: TronFeeParams } | undefined;

/** The network's live prices (governance changes them), cached for ten minutes. */
export async function getTronFeeParams(): Promise<TronFeeParams> {
  if (feeParamsCache && Date.now() - feeParamsCache.at < FEE_PARAMS_TTL_MS)
    return feeParamsCache.params;
  const data = await tronPost("/wallet/getchainparameters", {});
  const param = (key: string) => {
    const value = data?.chainParameter?.find(
      (p: { key: string }) => p.key === key,
    )?.value;
    if (value === undefined) throw new TronNodeError(UNREACHABLE);
    return BigInt(value);
  };
  const params: TronFeeParams = {
    energySun: param("getEnergyFee"),
    bandwidthSun: param("getTransactionFee"),
    activationSun:
      param("getCreateAccountFee") +
      param("getCreateNewAccountFeeInSystemContract"),
  };
  feeParamsCache = { at: Date.now(), params };
  return params;
}

/** ABI call data for transfer(to, amount), hex without 0x. */
export function tokenTransferData(to: string, amountRaw: bigint): string {
  return `a9059cbb${tronAddressAbiWord(to)}${amountRaw.toString(16).padStart(64, "0")}`;
}

/** Runs a contract call without sending it. Reverts throw; the caller decides what that means. */
async function simulate(
  owner: string,
  contract: string,
  selector: string,
  parameter: string,
) {
  const data = await tronPost("/wallet/triggerconstantcontract", {
    owner_address: owner,
    contract_address: contract,
    function_selector: selector,
    parameter,
    visible: true,
  });
  const failed =
    !data?.result?.result ||
    data.result.message ||
    data.transaction?.ret?.[0]?.ret === "FAILED";
  if (failed) {
    const message = String(data?.result?.message ?? "no result");
    throw new TronNodeError(
      `Tron simulation failed: ${/^[0-9a-f]+$/i.test(message) ? Buffer.from(message, "hex").toString() : message}`,
    );
  }
  return data;
}

/** A TRC-20 balance in the token's smallest unit. */
export async function readTokenBalance(
  owner: string,
  token: string,
): Promise<bigint> {
  const data = await simulate(
    owner,
    token,
    "balanceOf(address)",
    tronAddressAbiWord(owner),
  );
  const word = data.constant_result?.[0];
  if (typeof word !== "string" || !word) throw new TronNodeError(UNREACHABLE);
  return BigInt(`0x${word}`);
}

/** Energy a transfer(to, amount) from `owner` burns right now, including the token's dynamic-energy penalty. */
export async function estimateTokenTransferEnergy(
  owner: string,
  token: string,
  to: string,
  amountRaw: bigint,
): Promise<bigint> {
  const data = await simulate(
    owner,
    token,
    "transfer(address,uint256)",
    tokenTransferData(to, amountRaw).slice(8),
  );
  if (typeof data.energy_used !== "number")
    throw new TronNodeError(UNREACHABLE);
  return BigInt(data.energy_used);
}

/** Builds a TRX transfer on the node and refuses it unless it moves exactly this. */
export async function buildTrxTransfer(
  owner: string,
  to: string,
  amountSun: bigint,
): Promise<TronUnsignedTx> {
  const owner41 = tronAddressTo41Hex(owner);
  const to41 = tronAddressTo41Hex(to);
  const tx = await tronPost("/wallet/createtransaction", {
    owner_address: owner41,
    to_address: to41,
    amount: Number(amountSun),
  });
  if (!tx?.txID) {
    const reason = String(tx?.Error ?? JSON.stringify(tx));
    console.error("[TronNode] Create TRX transfer failed:", reason);
    throw new TronNodeError(
      reason.includes("balance is not sufficient")
        ? "Not enough TRX for this amount."
        : UNREACHABLE,
    );
  }
  return checked(tx, { kind: "trx", owner41, to41, amountSun });
}

/** Builds a TRC-20 transfer on the node and refuses it unless it is exactly this call. */
export async function buildTokenTransfer(params: {
  owner: string;
  token: string;
  to: string;
  amountRaw: bigint;
  feeLimitSun: bigint;
}): Promise<TronUnsignedTx> {
  const owner41 = tronAddressTo41Hex(params.owner);
  const contract41 = tronAddressTo41Hex(params.token);
  const data = tokenTransferData(params.to, params.amountRaw);
  const res = await tronPost("/wallet/triggersmartcontract", {
    owner_address: owner41,
    contract_address: contract41,
    function_selector: "transfer(address,uint256)",
    parameter: data.slice(8),
    fee_limit: Number(params.feeLimitSun),
  });
  if (!res?.result?.result || !res.transaction) {
    const raw = res?.result?.message;
    console.error(
      "[TronNode] Build token transfer failed:",
      raw ? Buffer.from(raw, "hex").toString() : JSON.stringify(res),
    );
    throw new TronNodeError(UNREACHABLE);
  }
  return checked(res.transaction, {
    kind: "contract",
    owner41,
    contract41,
    data,
    maxFeeLimitSun: params.feeLimitSun,
  });
}

function checked(
  tx: { txID?: string; raw_data_hex?: string },
  expected: ExpectedTronTransaction,
): TronUnsignedTx {
  if (!verifyTronTransaction(tx, expected)) {
    console.error(
      "[TronNode] Node returned a transaction that doesn't match the request; not signing.",
    );
    throw new TronNodeError(UNREACHABLE);
  }
  return {
    txID: String(tx.txID).toLowerCase(),
    raw_data_hex: String(tx.raw_data_hex),
  };
}

/** Signs the transaction id (r + s + v); the id is known before anything is broadcast. */
export async function signTronTransaction(
  tx: TronUnsignedTx,
  account: TronAccount,
): Promise<TronSignedTx> {
  const signature = await account.sign({ hash: `0x${tx.txID}` });
  return {
    txID: tx.txID,
    hex: encodeSignedTransaction(tx.raw_data_hex, signature),
  };
}

/** Broadcasts exactly the signed bytes. */
export async function broadcastTronTransaction(
  tx: TronSignedTx,
): Promise<void> {
  const res = await tronPost("/wallet/broadcasthex", { transaction: tx.hex });
  if (!res?.result) {
    const message = res?.message
      ? Buffer.from(res.message, "hex").toString()
      : JSON.stringify(res);
    console.error(`[TronNode] Broadcast of ${tx.txID} refused: ${message}`);
    throw new TronNodeError(
      /balance is not sufficient|insufficient/i.test(message)
        ? "Not enough TRX to pay the network fee."
        : "Unable to send transaction to the Tron network. Please try again shortly.",
    );
  }
}

export type TronTxOutcome = "SUCCESS" | "FAILED" | "PENDING";

/** Polls until the transaction is in a block (Tron makes one every 3s), or gives up as PENDING. */
export async function waitForTronTransaction(
  txID: string,
  {
    timeoutMs = 30_000,
    intervalMs = 1_500,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<TronTxOutcome> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const outcome = await readTronTransactionOutcome(txID).catch(
      () => "PENDING" as const,
    );
    if (outcome !== "PENDING" || Date.now() >= deadline) return outcome;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** One look at a transaction: PENDING until a block holds it. */
export async function readTronTransactionOutcome(
  txID: string,
): Promise<TronTxOutcome> {
  const info = await tronPost("/wallet/gettransactioninfobyid", {
    value: txID,
  });
  if (!info?.id) return "PENDING";
  // A contract call reports receipt.result; a plain TRX transfer only reports failure.
  if (info.result === "FAILED") return "FAILED";
  if (info.receipt?.result && info.receipt.result !== "SUCCESS")
    return "FAILED";
  return "SUCCESS";
}
