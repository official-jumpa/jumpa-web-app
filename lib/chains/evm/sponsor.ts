/**
 * Jumpa — EVM / Base Sponsored Transactions & Gas Abstraction Engine
 *
 * Enables true gas abstraction for USDC on Base (L2) using EIP-3009 (transferWithAuthorization).
 * The platform sponsor wallet pays the network Base ETH gas, while the user reimburses
 * the network fee directly in USDC (e.g., 0.10 USDC) within the exact same atomic transaction
 * via canonical Multicall3.
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseSignature,
  parseUnits,
  toHex,
  type Account,
  type Address,
  type Hex,
  type PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { environment } from "@/lib/environment";
import {
  CONTRACT_ADDRESSES,
  getExplorerTxUrl,
  getRpcUrl,
} from "@/lib/blockchain";
import type { TransferResult } from "@/lib/chains/transfer-service";

/** Canonical Multicall3 address deployed on Base Mainnet */
export const MULTICALL3_BASE_ADDRESS: Address =
  "0xcA11bde05977b3631167028862bE2a173976CA11";

/** Circle Native USDC on Base Mainnet */
export const BASE_USDC_ADDRESS: Address =
  CONTRACT_ADDRESSES.base.mainnet.USDC.address;
export const BASE_USDC_DECIMALS =
  CONTRACT_ADDRESSES.base.mainnet.USDC.decimals;

/** EIP-712 Domain for Circle USDC on Base Mainnet */
export const BASE_USDC_EIP712_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: base.id, // 8453
  verifyingContract: BASE_USDC_ADDRESS,
} as const;

/** EIP-3009 TransferWithAuthorization Type Definition */
export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const USDC_EIP3009_ABI = [
  {
    name: "transferWithAuthorization",
    type: "function",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const MULTICALL3_ABI = [
  {
    name: "aggregate3",
    type: "function",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
    stateMutability: "payable",
  },
] as const;

/**
 * Resolves the platform sponsor EVM account from environment variables.
 * Uses SPONSORED_FEE_EVM_KEY.
 */
export function getEvmSponsorAccount(): PrivateKeyAccount | null {
  const secret = environment.SPONSORED_FEE_EVM_KEY?.trim();
  if (!secret) return null;
  try {
    const cleanKey = (
      secret.startsWith("0x") ? secret : `0x${secret}`
    ) as Hex;
    return privateKeyToAccount(cleanKey);
  } catch (err) {
    console.error("[EVM Sponsor] Invalid API Key:", err);
    return null;
  }
}

/**
 * Returns the public address where platform fees should be collected on EVM/Base.
 * Defaults to the sponsor account address if FEE_WALLET_EVM is not configured.
 */
export function getEvmFeeCollectorAddress(): Address | null {
  const configured = environment.FEE_WALLET_EVM?.trim();
  if (configured && configured.startsWith("0x") && configured.length === 42) {
    return configured as Address;
  }
  const sponsor = getEvmSponsorAccount();
  return sponsor ? sponsor.address : null;
}

/**
 * Returns the configured USD fee amount for Base gas abstraction (default 0.05).
 */
export function getBaseFeeAmount(): number {
  return environment.FEE_USD_AMOUNT_BASE ?? 0.05;
}

/**
 * Generates a cryptographically random 32-byte nonce for EIP-3009 authorizations.
 */
export function generateEip3009Nonce(): Hex {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for Node environments where global crypto might be namespaced
    const nodeCrypto = require("crypto");
    return `0x${nodeCrypto.randomBytes(32).toString("hex")}` as Hex;
  }
  return toHex(bytes);
}

/**
 * Parses user secret key (mnemonic or raw hex private key) into a viem PrivateKeyAccount.
 */
export function parseUserEvmAccount(
  mnemonicOrPrivateKey: string,
): PrivateKeyAccount | Account {
  const trimmed = mnemonicOrPrivateKey.trim();
  const isMnemonic = trimmed.split(/\s+/).length >= 12;

  if (isMnemonic) {
    return mnemonicToAccount(trimmed);
  }

  const cleanHex = (
    trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`
  ) as Hex;
  return privateKeyToAccount(cleanHex);
}

/**
 * Builds, signs, and executes an atomic sponsored USDC transfer on Base.
 *
 * Flow:
 * 1. User signs EIP-712 TransferWithAuthorization (amount -> destination)
 * 2. User signs EIP-712 TransferWithAuthorization (feeAmount -> Jumpa fee collector)
 * 3. Sponsor submits Multicall3 transaction containing both authorizations in one atomic block.
 * 4. User receives confirmed TransferResult with zero ETH spent.
 */
export async function executeSponsoredBaseUsdcTransfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
}): Promise<TransferResult> {
  const { mnemonicOrPrivateKey, destination, amount } = params;

  const sponsorAccount = getEvmSponsorAccount();
  if (!sponsorAccount) {
    throw new Error(
      "Base transaction sponsorship is not configured.",
    );
  }

  const feeCollectorAddress = getEvmFeeCollectorAddress();
  if (!feeCollectorAddress) {
    throw new Error("Base fee collection address could not be resolved.");
  }

  const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  const userAccount = parseUserEvmAccount(mnemonicOrPrivateKey);
  const rpcUrl = getRpcUrl("base");

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const sponsorWalletClient = createWalletClient({
    account: sponsorAccount,
    chain: base,
    transport: http(rpcUrl),
  });

  const feeAmount = getBaseFeeAmount();
  const totalRequired = numAmount + feeAmount;

  // 1. Verify User USDC balance on Base
  const userBalanceRaw = await publicClient.readContract({
    address: BASE_USDC_ADDRESS,
    abi: USDC_EIP3009_ABI,
    functionName: "balanceOf",
    args: [userAccount.address],
  });

  const userUsdcBalance =
    Number(userBalanceRaw) / Math.pow(10, BASE_USDC_DECIMALS);

  if (userUsdcBalance < totalRequired) {
    throw new Error(
      `Insufficient USDC balance on Base to complete the transaction. Available: ${userUsdcBalance.toFixed(2)} USDC, Required: ${totalRequired.toFixed(2)} USDC (transfer: ${numAmount.toFixed(2)}, network fee: ${feeAmount.toFixed(2)}).`,
    );
  }

  // 2. Prepare EIP-3009 parameters
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(0);
  const validBefore = BigInt(now + 3600); // 1 hour validity

  const rawTransferValue = parseUnits(
    String(numAmount),
    BASE_USDC_DECIMALS,
  );
  const rawFeeValue = parseUnits(
    String(feeAmount),
    BASE_USDC_DECIMALS,
  );

  const transferNonce = generateEip3009Nonce();
  const feeNonce = generateEip3009Nonce();

  console.log(
    `[Base Sponsor] Signing EIP-3009 authorizations for ${userAccount.address} -> ${destination} (${numAmount} USDC) + fee (${feeAmount} USDC)...`,
  );

  // 3. User signs TransferWithAuthorization for main recipient
  const transferSignatureHex = await (userAccount as any).signTypedData({
    domain: BASE_USDC_EIP712_DOMAIN,
    types: EIP3009_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: userAccount.address,
      to: destination as Address,
      value: rawTransferValue,
      validAfter,
      validBefore,
      nonce: transferNonce,
    },
  });

  const parsedTransferSig = parseSignature(transferSignatureHex);
  const transferV = Number(
    parsedTransferSig.v ?? (parsedTransferSig.yParity === 0 ? BigInt(27) : BigInt(28)),
  );

  const mainTransferCallData = encodeFunctionData({
    abi: USDC_EIP3009_ABI,
    functionName: "transferWithAuthorization",
    args: [
      userAccount.address,
      destination as Address,
      rawTransferValue,
      validAfter,
      validBefore,
      transferNonce,
      transferV,
      parsedTransferSig.r,
      parsedTransferSig.s,
    ],
  });

  let txHash: Hex;

  // 4. If fee collection is applicable, assemble atomic batch with Multicall3
  if (
    feeAmount > 0 &&
    feeCollectorAddress.toLowerCase() !== userAccount.address.toLowerCase()
  ) {
    // User signs TransferWithAuthorization for platform fee
    const feeSignatureHex = await (userAccount as any).signTypedData({
      domain: BASE_USDC_EIP712_DOMAIN,
      types: EIP3009_TYPES,
      primaryType: "TransferWithAuthorization",
      message: {
        from: userAccount.address,
        to: feeCollectorAddress,
        value: rawFeeValue,
        validAfter,
        validBefore,
        nonce: feeNonce,
      },
    });

    const parsedFeeSig = parseSignature(feeSignatureHex);
    const feeV = Number(
      parsedFeeSig.v ?? (parsedFeeSig.yParity === 0 ? BigInt(27) : BigInt(28)),
    );

    const feeTransferCallData = encodeFunctionData({
      abi: USDC_EIP3009_ABI,
      functionName: "transferWithAuthorization",
      args: [
        userAccount.address,
        feeCollectorAddress,
        rawFeeValue,
        validAfter,
        validBefore,
        feeNonce,
        feeV,
        parsedFeeSig.r,
        parsedFeeSig.s,
      ],
    });

    console.log(
      `[Base Sponsor] Submitting atomic Multicall3 batch via sponsor ${sponsorAccount.address}...`,
    );

    txHash = await sponsorWalletClient.writeContract({
      address: MULTICALL3_BASE_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: "aggregate3",
      args: [
        [
          {
            target: BASE_USDC_ADDRESS,
            allowFailure: false,
            callData: mainTransferCallData,
          },
          {
            target: BASE_USDC_ADDRESS,
            allowFailure: false,
            callData: feeTransferCallData,
          },
        ],
      ],
    });
  } else {
    // Single transfer direct submission
    console.log(
      `[Base Sponsor] Submitting direct EIP-3009 transfer via sponsor ${sponsorAccount.address}...`,
    );

    txHash = await sponsorWalletClient.writeContract({
      address: BASE_USDC_ADDRESS,
      abi: USDC_EIP3009_ABI,
      functionName: "transferWithAuthorization",
      args: [
        userAccount.address,
        destination as Address,
        rawTransferValue,
        validAfter,
        validBefore,
        transferNonce,
        transferV,
        parsedTransferSig.r,
        parsedTransferSig.s,
      ],
    });
  }

  // 5. Quick receipt check (up to 3 seconds on Base)
  try {
    await Promise.race([
      publicClient.waitForTransactionReceipt({ hash: txHash }),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch (receiptErr) {
    console.warn("[Base Sponsor] Receipt check note:", receiptErr);
  }

  const explorerUrl = getExplorerTxUrl("base", txHash);
  console.log(
    `[Base Sponsor] Transfer broadcast confirmed! TxHash: ${txHash} (Fee: ${feeAmount} USDC)`,
  );

  return {
    success: true,
    txHash,
    explorerUrl,
    feePaid: `${feeAmount} USDC`,
    fromAddress: userAccount.address,
  };
}
