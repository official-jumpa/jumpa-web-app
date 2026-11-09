import {
  type Address,
  getTypesForEIP712Domain,
  type Hex,
  type TypedDataDefinition,
  verifyTypedData,
} from "viem";
import {
  PERMIT_TYPES,
  SIGN_MARGIN_SECONDS,
  SWITCH_DEPOSIT_SAFE_SECONDS,
  USDT0_PERMIT_DOMAIN,
} from "./constants";

export type PermitMessage = {
  owner: Address;
  spender: Address;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
};

export type PermitTypedData = TypedDataDefinition<
  typeof PERMIT_TYPES,
  "Permit"
>;

export function buildPermitTypedData(message: PermitMessage): PermitTypedData {
  return {
    domain: USDT0_PERMIT_DOMAIN,
    types: PERMIT_TYPES,
    primaryType: "Permit",
    message,
  };
}

/** JSON for `eth_signTypedData_v4`: bigints as decimal strings, domain types spelled out. */
export function serializeTypedData(typedData: TypedDataDefinition): string {
  return JSON.stringify(
    {
      ...typedData,
      types: {
        EIP712Domain: getTypesForEIP712Domain({ domain: typedData.domain }),
        ...typedData.types,
      },
    },
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
  );
}

/** True only when `signature` is the owner's permit for exactly this message. */
export async function verifyPermitSignature(
  message: PermitMessage,
  signature: Hex,
): Promise<boolean> {
  try {
    return await verifyTypedData({
      ...buildPermitTypedData(message),
      address: message.owner,
      signature,
    });
  } catch {
    return false;
  }
}

/** Whether a signature for this order can still be relayed safely. */
export function isSignable(
  order: { deadline: number; createdAt: Date },
  nowMs: number,
): boolean {
  const secondsLeft = order.deadline - nowMs / 1000;
  const ageSeconds = (nowMs - order.createdAt.getTime()) / 1000;
  return (
    secondsLeft >= SIGN_MARGIN_SECONDS &&
    ageSeconds <= SWITCH_DEPOSIT_SAFE_SECONDS
  );
}
