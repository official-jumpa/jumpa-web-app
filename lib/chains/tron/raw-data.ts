import { sha256 } from "viem";

/**
 * Checks a node-built Tron transaction byte for byte before it is signed. The signature
 * covers raw_data_hex, not the JSON beside it, so the bytes are what get decoded here.
 */

type Field = { wire: number; value: bigint | Uint8Array };

/** Protobuf fields by number; throws on anything malformed. */
function decodeMessage(bytes: Uint8Array): Map<number, Field[]> {
  const fields = new Map<number, Field[]>();
  let pos = 0;

  const varint = (): bigint => {
    let result = BigInt(0);
    for (let shift = BigInt(0); shift < BigInt(70); shift += BigInt(7)) {
      if (pos >= bytes.length) throw new Error("truncated varint");
      const byte = bytes[pos++];
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result;
    }
    throw new Error("varint too long");
  };

  while (pos < bytes.length) {
    const key = varint();
    const field = Number(key >> BigInt(3));
    const wire = Number(key & BigInt(7));
    let value: bigint | Uint8Array;
    if (wire === 0) {
      value = varint();
    } else if (wire === 2) {
      const length = Number(varint());
      if (pos + length > bytes.length) throw new Error("truncated field");
      value = bytes.subarray(pos, pos + length);
      pos += length;
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (pos + size > bytes.length) throw new Error("truncated field");
      value = BigInt(
        `0x${Buffer.from(bytes.subarray(pos, pos + size))
          .reverse()
          .toString("hex")}`,
      );
      pos += size;
    } else {
      throw new Error(`unsupported wire type ${wire}`);
    }
    fields.set(field, [...(fields.get(field) ?? []), { wire, value }]);
  }
  return fields;
}

const hex = (value: Field["value"] | undefined) =>
  value instanceof Uint8Array ? Buffer.from(value).toString("hex") : undefined;

/** The single value of a field, or undefined; a repeated field fails the check. */
function only(
  fields: Map<number, Field[]>,
  n: number,
): Field["value"] | undefined {
  const list = fields.get(n);
  if (!list) return undefined;
  if (list.length !== 1) throw new Error(`field ${n} repeated`);
  return list[0].value;
}

function onlyFields(fields: Map<number, Field[]>, allowed: number[]): boolean {
  return [...fields.keys()].every((n) => allowed.includes(n));
}

const isZero = (value: Field["value"] | undefined) =>
  value === undefined || value === BigInt(0);

/** What the transaction must do; anything else in it is refused. */
export type ExpectedTronTransaction =
  | { kind: "trx"; owner41: string; to41: string; amountSun: bigint }
  | {
      kind: "contract";
      owner41: string;
      contract41: string;
      /** ABI call data, hex without 0x. */
      data: string;
      maxFeeLimitSun: bigint;
    };

/** Longest a node may set a transaction to live; it never needs more than a minute. */
export const TRON_MAX_EXPIRY_MS = 10 * 60 * 1000;

const TYPE = {
  trx: { id: BigInt(1), url: "type.googleapis.com/protocol.TransferContract" },
  contract: {
    id: BigInt(31),
    url: "type.googleapis.com/protocol.TriggerSmartContract",
  },
} as const;

/** True only when the transaction id is the hash of these bytes and they do exactly what was asked. */
export function verifyTronTransaction(
  tx: { txID?: string; raw_data_hex?: string },
  expected: ExpectedTronTransaction,
  now = Date.now(),
): boolean {
  try {
    if (!tx.txID || !tx.raw_data_hex) return false;
    if (sha256(`0x${tx.raw_data_hex}`).slice(2) !== tx.txID.toLowerCase())
      return false;

    // raw: ref_block_bytes 1, ref_block_num 3, ref_block_hash 4, expiration 8, contract 11,
    // timestamp 14, fee_limit 18. No auths, memo (which costs extra) or scripts.
    const raw = decodeMessage(Buffer.from(tx.raw_data_hex, "hex"));
    if (!onlyFields(raw, [1, 3, 4, 8, 11, 14, 18])) return false;
    const expiration = Number(only(raw, 8) ?? 0);
    if (!expiration || expiration > now + TRON_MAX_EXPIRY_MS) return false;

    const feeLimit = only(raw, 18);
    if (
      expected.kind === "trx"
        ? !isZero(feeLimit)
        : typeof feeLimit !== "bigint" || feeLimit > expected.maxFeeLimitSun
    ) {
      return false;
    }

    const contracts = raw.get(11);
    if (contracts?.length !== 1 || !(contracts[0].value instanceof Uint8Array))
      return false;
    // Contract: type 1, parameter 2, Permission_id 5 (owner only).
    const contract = decodeMessage(contracts[0].value);
    if (!onlyFields(contract, [1, 2, 5]) || !isZero(only(contract, 5)))
      return false;
    if (only(contract, 1) !== TYPE[expected.kind].id) return false;

    const anyParam = only(contract, 2);
    if (!(anyParam instanceof Uint8Array)) return false;
    const parameter = decodeMessage(anyParam);
    const typeUrl = only(parameter, 1);
    if (
      !(typeUrl instanceof Uint8Array) ||
      Buffer.from(typeUrl).toString() !== TYPE[expected.kind].url
    )
      return false;
    const valueBytes = only(parameter, 2);
    if (!(valueBytes instanceof Uint8Array)) return false;
    const value = decodeMessage(valueBytes);

    if (hex(only(value, 1)) !== expected.owner41) return false;
    if (expected.kind === "trx") {
      // TransferContract: owner_address 1, to_address 2, amount 3.
      return (
        onlyFields(value, [1, 2, 3]) &&
        hex(only(value, 2)) === expected.to41 &&
        only(value, 3) === expected.amountSun
      );
    }
    // TriggerSmartContract: owner_address 1, contract_address 2, call_value 3, data 4,
    // call_token_value 5, token_id 6. Nothing may be paid along with the call.
    return (
      onlyFields(value, [1, 2, 3, 4, 5, 6]) &&
      hex(only(value, 2)) === expected.contract41 &&
      hex(only(value, 4)) === expected.data.toLowerCase() &&
      isZero(only(value, 3)) &&
      isZero(only(value, 5)) &&
      isZero(only(value, 6))
    );
  } catch {
    return false;
  }
}

/** A signed transaction as protobuf hex: raw_data (field 1) and one signature (field 2). */
export function encodeSignedTransaction(
  rawDataHex: string,
  signatureHex: string,
): string {
  const lengthPrefix = (n: number) => {
    const out: number[] = [];
    let rest = n;
    while (rest > 0x7f) {
      out.push((rest & 0x7f) | 0x80);
      rest >>>= 7;
    }
    out.push(rest);
    return Buffer.from(out).toString("hex");
  };
  const raw = rawDataHex.toLowerCase();
  const sig = signatureHex.toLowerCase().replace(/^0x/, "");
  return `0a${lengthPrefix(raw.length / 2)}${raw}12${lengthPrefix(sig.length / 2)}${sig}`;
}
