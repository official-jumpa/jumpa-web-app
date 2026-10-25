/**
 * Jumpa — EVM (Base & Ethereum) Sponsored Transactions & Gas Abstraction Engine
 *
 * Enables true gas abstraction for USDC on Base (L2) and Ethereum Mainnet (L1)
 * using Circle's native EIP-3009 (transferWithAuthorization).
 * The platform sponsor wallet pays the native network ETH gas, while the user reimburses
 * the network fee directly in USDC within the exact same atomic transaction via canonical Multicall3.
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseSignature,
  parseUnits,
  parseEther,
  toHex,
  type Account,
  type Address,
  type Hex,
  type PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { base, mainnet } from "viem/chains";
import { environment } from "@/lib/environment";
import {
  CONTRACT_ADDRESSES,
  getExplorerTxUrl,
  getRpcUrl,
} from "@/lib/blockchain";
import type { TransferResult } from "@/lib/chains/transfer-service";

/** Canonical Multicall3 address deployed on both Base and Ethereum Mainnet */
export const MULTICALL3_ADDRESS: Address =
  "0xcA11bde05977b3631167028862bE2a173976CA11";
export const MULTICALL3_BASE_ADDRESS: Address = MULTICALL3_ADDRESS;

/** Circle Native USDC Addresses & Decimals */
export const BASE_USDC_ADDRESS: Address =
  CONTRACT_ADDRESSES.base.mainnet.USDC.address;
export const BASE_USDC_DECIMALS =
  CONTRACT_ADDRESSES.base.mainnet.USDC.decimals;

export const ETHEREUM_USDC_ADDRESS: Address =
  CONTRACT_ADDRESSES.ethereum.mainnet.USDC.address;
export const ETHEREUM_USDC_DECIMALS =
  CONTRACT_ADDRESSES.ethereum.mainnet.USDC.decimals;

/** Tether USDT Addresses & Decimals */
export const BASE_USDT_ADDRESS: Address =
  CONTRACT_ADDRESSES.base.mainnet.USDT.address;
export const BASE_USDT_DECIMALS =
  CONTRACT_ADDRESSES.base.mainnet.USDT.decimals;

export const ETHEREUM_USDT_ADDRESS: Address =
  CONTRACT_ADDRESSES.ethereum.mainnet.USDT.address;
export const ETHEREUM_USDT_DECIMALS =
  CONTRACT_ADDRESSES.ethereum.mainnet.USDT.decimals;

/** EIP-712 Domain Helper for Circle USDC */
export function getUsdcEip712Domain(chainId: number, verifyingContract: Address) {
  return {
    name: "USD Coin",
    version: "2",
    chainId,
    verifyingContract,
  } as const;
}

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

/** Universal ERC-20 ABI compatible with Tether USDT (which returns void on transfer) */
export const ERC20_OR_USDT_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
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
 * Returns the public address where platform fees should be collected on EVM/Base/Ethereum.
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
 * Returns the configured USD fee amount for Ethereum gas abstraction (default 0.10).
 */
export function getEthereumFeeAmount(): number {
  return environment.FEE_USD_AMOUNT_EVM ?? 0.1;
}

/**
 * Generates a cryptographically random 32-byte nonce for EIP-3009 authorizations.
 */
export function generateEip3009Nonce(): Hex {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
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
 * Generic EVM Sponsored USDC Transfer (Base or Ethereum Mainnet).
 */
export async function executeSponsoredEvmUsdcTransfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
  chain?: "base" | "eth" | "ethereum";
}): Promise<TransferResult> {
  const { mnemonicOrPrivateKey, destination, amount, chain = "base" } = params;

  const isEthereum = chain === "eth" || chain === "ethereum";
  const chainLabel = isEthereum ? "Ethereum" : "Base";
  const targetChain = isEthereum ? mainnet : base;

  const sponsorAccount = getEvmSponsorAccount();
  if (!sponsorAccount) {
    throw new Error(
      `${chainLabel} transaction sponsorship is not configured.`,
    );
  }

  const feeCollectorAddress = getEvmFeeCollectorAddress();
  if (!feeCollectorAddress) {
    throw new Error(`${chainLabel} fee collection address could not be resolved.`);
  }

  const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  const usdcAddress = isEthereum ? ETHEREUM_USDC_ADDRESS : BASE_USDC_ADDRESS;
  const usdcDecimals = 6;
  const userAccount = parseUserEvmAccount(mnemonicOrPrivateKey);
  const rpcUrl = getRpcUrl(isEthereum ? "ethereum" : "base");

  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const sponsorWalletClient = createWalletClient({
    account: sponsorAccount,
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const feeAmount = isEthereum ? getEthereumFeeAmount() : getBaseFeeAmount();
  const totalRequired = numAmount + feeAmount;

  // 1. Verify User USDC balance
  const userBalanceRaw = await publicClient.readContract({
    address: usdcAddress,
    abi: USDC_EIP3009_ABI,
    functionName: "balanceOf",
    args: [userAccount.address],
  });

  const userUsdcBalance =
    Number(userBalanceRaw) / Math.pow(10, usdcDecimals);

  if (userUsdcBalance < totalRequired) {
    throw new Error(
      `Insufficient USDC balance on ${chainLabel} to complete the transaction. Available: ${userUsdcBalance.toFixed(2)} USDC, Required: ${totalRequired.toFixed(2)} USDC (transfer: ${numAmount.toFixed(2)}, network fee: ${feeAmount.toFixed(2)}).`,
    );
  }

  // 2. Prepare EIP-3009 parameters
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(0);
  const validBefore = BigInt(now + 3600); // 1 hour validity

  const rawTransferValue = parseUnits(
    String(numAmount),
    usdcDecimals,
  );
  const rawFeeValue = parseUnits(
    String(feeAmount),
    usdcDecimals,
  );

  const transferNonce = generateEip3009Nonce();
  const feeNonce = generateEip3009Nonce();

  const domain = getUsdcEip712Domain(targetChain.id, usdcAddress);

  console.log(
    `[${chainLabel} Sponsor] Signing authorizations for ${userAccount.address} -> ${destination} (${numAmount} USDC) + fee (${feeAmount} USDC)...`,
  );

  // 3. User signs TransferWithAuthorization for recipient
  const transferSignatureHex = await (userAccount as any).signTypedData({
    domain,
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
    const feeSignatureHex = await (userAccount as any).signTypedData({
      domain,
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
      `[${chainLabel} Sponsor] Submitting atomic Multicall3 batch via sponsor ${sponsorAccount.address}...`,
    );

    txHash = await sponsorWalletClient.writeContract({
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: "aggregate3",
      args: [
        [
          {
            target: usdcAddress,
            allowFailure: false,
            callData: mainTransferCallData,
          },
          {
            target: usdcAddress,
            allowFailure: false,
            callData: feeTransferCallData,
          },
        ],
      ],
    });
  } else {
    // Single transfer direct submission
    console.log(
      `[${chainLabel} Sponsor] Submitting direct EIP-3009 transfer via sponsor ${sponsorAccount.address}...`,
    );

    txHash = await sponsorWalletClient.writeContract({
      address: usdcAddress,
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

  // 5. Quick receipt check (up to 12s on Ethereum, 3s on Base)
  const waitTimeout = isEthereum ? 12000 : 3000;
  try {
    await Promise.race([
      publicClient.waitForTransactionReceipt({ hash: txHash }),
      new Promise((resolve) => setTimeout(resolve, waitTimeout)),
    ]);
  } catch (receiptErr) {
    console.warn(`[${chainLabel} Sponsor] Receipt check note:`, receiptErr);
  }

  const explorerUrl = getExplorerTxUrl(isEthereum ? "ethereum" : "base", txHash);
  console.log(
    `[${chainLabel} Sponsor] Transfer broadcast confirmed! TxHash: ${txHash} (Fee: ${feeAmount} USDC)`,
  );

  return {
    success: true,
    txHash,
    explorerUrl,
    feePaid: `${feeAmount} USDC`,
    fromAddress: userAccount.address,
  };
}

/**
 * Builds, signs, and executes an atomic sponsored USDC transfer on Base.
 */
export async function executeSponsoredBaseUsdcTransfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
}): Promise<TransferResult> {
  return executeSponsoredEvmUsdcTransfer({ ...params, chain: "base" });
}

/**
 * Builds, signs, and executes an atomic sponsored USDC transfer on Ethereum Mainnet.
 */
export async function executeSponsoredEthereumUsdcTransfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
}): Promise<TransferResult> {
  return executeSponsoredEvmUsdcTransfer({ ...params, chain: "ethereum" });
}

/**
 * Fetches current live ETH USD price across verified public feeds:
 * CoinGecko, DefiLlama, CoinPaprika, CoinLore, Chainlink 
 *
 * Strict: If all feeds fail, throws an error
 */
export async function getLiveEthPriceUsd(): Promise<number> {
  // 1. CoinGecko
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) {
      const data = await res.json();
      const price = Number(data?.ethereum?.usd);
      if (price && price > 0) return price;
    }
  } catch (err) {
    console.warn("[EVM Price] CoinGecko feed note:", err);
  }

  // 2. DefiLlama
  try {
    const res = await fetch(
      "https://coins.llama.fi/prices/current/coingecko:ethereum",
      { signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) {
      const data = await res.json();
      const price = Number(data?.coins?.["coingecko:ethereum"]?.price);
      if (price && price > 0) return price;
    }
  } catch (err) {
    console.warn("[EVM Price] DefiLlama feed note:", err);
  }

  // 3. CoinPaprika
  try {
    const res = await fetch(
      "https://api.coinpaprika.com/v1/tickers/eth-ethereum",
      { signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) {
      const data = await res.json();
      const price = Number(data?.quotes?.USD?.price);
      if (price && price > 0) return price;
    }
  } catch (err) {
    console.warn("[EVM Price] CoinPaprika feed note:", err);
  }

  // 4. CoinLore
  try {
    const res = await fetch(
      "https://api.coinlore.net/api/ticker/?id=80",
      { signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.[0]?.price_usd);
      if (price && price > 0) return price;
    }
  } catch (err) {
    console.warn("[EVM Price] CoinLore feed note:", err);
  }

  // 5. Chainlink On-Chain Oracle on Ethereum Mainnet (direct RPC, no HTTP API rate-limits)
  try {
    const rpc = getRpcUrl("ethereum");
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(rpc),
    });
    const chainlinkAbi = [
      {
        name: "latestRoundData",
        type: "function",
        inputs: [],
        outputs: [
          { name: "roundId", type: "uint80" },
          { name: "answer", type: "int256" },
          { name: "startedAt", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
          { name: "answeredInRound", type: "uint80" },
        ],
        stateMutability: "view",
      },
    ] as const;
    const [, answer] = await publicClient.readContract({
      address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      abi: chainlinkAbi,
      functionName: "latestRoundData",
    });
    const onChainPrice = Number(answer) / 1e8;
    if (onChainPrice && onChainPrice > 0) return onChainPrice;
  } catch (err) {
    console.warn("[EVM Price] Chainlink Oracle feed note:", err);
  }

  // Strict: Fail transaction if live price cannot be retrieved
  throw new Error(
    "Failed to retrieve valid Ethereum price from public oracle feeds (CoinGecko, DefiLlama, CoinPaprika, CoinLore, Chainlink). Transaction halted for safety.",
  );
}

export interface EvmGasSponsorshipPlan {
  chain: "base" | "eth" | "ethereum";
  ethToSendWei: bigint;
  ethToSendFormatted: string;
  ethPriceUsd: number;
  topUpUsd: number;
  feeToCollectUsd: number;
  isDynamic: boolean;
}

/**
 * Dynamically calculates the ETH to send to the user and the fee to collect.
 * - Base: Send $0.01 worth of Base ETH, collect $0.05 fee.
 * - Ethereum:
 *   Weekend Low: Send $0.01 worth of ETH, collect dynamic fee (default 0.10, or cost + 0.05).
 *   If network gas spikes higher than $0.01, dynamically scales up with 20% safety buffer.
 */
export async function calculateEvmGasSponsorship(params: {
  chain: "base" | "eth" | "ethereum";
  requiredGasUnits?: bigint;
}): Promise<EvmGasSponsorshipPlan> {
  const isEthereum = params.chain === "eth" || params.chain === "ethereum";
  const requiredGasUnits = params.requiredGasUnits ?? BigInt(65000);
  const ethPriceUsd = await getLiveEthPriceUsd();

  // 1. Base (L2) Calculation: Send $0.01 in ETH, collect $0.05 fee
  if (!isEthereum) {
    const topUpUsd = 0.01;
    const ethToSend = topUpUsd / ethPriceUsd;
    const ethToSendWei = parseUnits(ethToSend.toFixed(18), 18);
    return {
      chain: "base",
      ethToSendWei,
      ethToSendFormatted: (Number(ethToSendWei) / 1e18).toFixed(8),
      ethPriceUsd,
      topUpUsd,
      feeToCollectUsd: getBaseFeeAmount(), // 0.05
      isDynamic: false,
    };
  }

  // 2. Ethereum (L1) Dynamic Calculation
  const rpc = getRpcUrl("ethereum");
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(rpc),
  });

  let gasPrice = BigInt(50000000); // 0.05 Gwei fallback
  try {
    gasPrice = await publicClient.getGasPrice();
  } catch (err) {
    console.warn(
      "[EVM Sponsor] Failed to read Ethereum gas price, using 0.05 Gwei fallback:",
      err,
    );
  }

  // Calculate dynamic gas cost for transfer(s) with 20% safety buffer
  const rawCostWei = gasPrice * requiredGasUnits;
  const bufferedCostWei = (rawCostWei * BigInt(12)) / BigInt(10);
  const bufferedCostEth = Number(bufferedCostWei) / 1e18;
  const bufferedCostUsd = bufferedCostEth * ethPriceUsd;

  // At Weekend Low: send $0.01 worth of ETH. If network gas spikes, dynamically scale up.
  const topUpUsd = Math.max(0.01, bufferedCostUsd);
  const ethToSend = topUpUsd / ethPriceUsd;
  const ethToSendWei = parseUnits(ethToSend.toFixed(18), 18);

  // Dynamic fee calculation: default 0.10, or (cost + 0.05) if gas is higher
  const feeToCollectUsd = Math.max(
    getEthereumFeeAmount(), // 0.10
    Math.ceil((topUpUsd + 0.05) * 100) / 100,
  );

  return {
    chain: "ethereum",
    ethToSendWei,
    ethToSendFormatted: (Number(ethToSendWei) / 1e18).toFixed(8),
    ethPriceUsd,
    topUpUsd,
    feeToCollectUsd,
    isDynamic: true,
  };
}

/**
 * Ensures an EVM account has sufficient native ETH to pay for transaction gas.
 * If user's native ETH balance is below required gas, tops up the account with micro-ETH.
 */
export async function ensureSufficientEvmGas(params: {
  userAddress: Address;
  chain?: "base" | "eth" | "ethereum";
  requiredGasUnits?: bigint;
  forceTopUp?: boolean;
}): Promise<{
  sponsored: boolean;
  topUpTxHash?: Hex;
  topUpAmountWei: bigint;
  plan: EvmGasSponsorshipPlan;
}> {
  const { userAddress, chain = "base", requiredGasUnits, forceTopUp = false } = params;
  const isEthereum = chain === "eth" || chain === "ethereum";
  const targetChain = isEthereum ? mainnet : base;
  const rpc = getRpcUrl(isEthereum ? "ethereum" : "base");

  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(rpc),
  });

  const plan = await calculateEvmGasSponsorship({
    chain,
    requiredGasUnits,
  });

  const userEthBalance = await publicClient.getBalance({
    address: userAddress,
  });

  // If user already has at least what we'd send and not forced for testing, no top-up needed
  if (!forceTopUp && userEthBalance >= plan.ethToSendWei) {
    return {
      sponsored: false,
      topUpAmountWei: BigInt(0),
      plan,
    };
  }

  const sponsorAccount = getEvmSponsorAccount();
  if (!sponsorAccount) {
    throw new Error(
      `EVM gas sponsorship is not configured on ${isEthereum ? "Ethereum" : "Base"}.`,
    );
  }

  const sponsorWalletClient = createWalletClient({
    account: sponsorAccount,
    chain: targetChain,
    transport: http(rpc),
  });

  console.log(
    `[EVM Sponsor] Topping up ${userAddress} on ${isEthereum ? "Ethereum" : "Base"} with ${plan.ethToSendFormatted} ETH (~$${plan.topUpUsd.toFixed(2)} USD)...`,
  );

  const topUpTxHash = await sponsorWalletClient.sendTransaction({
    to: userAddress,
    value: plan.ethToSendWei,
  });

  // Wait for top-up receipt so user can immediately spend the gas
  const waitTimeout = isEthereum ? 15000 : 4000;
  try {
    await Promise.race([
      publicClient.waitForTransactionReceipt({ hash: topUpTxHash }),
      new Promise((resolve) => setTimeout(resolve, waitTimeout)),
    ]);
  } catch (err) {
    console.warn("[EVM Sponsor] Top-up receipt wait note:", err);
  }

  return {
    sponsored: true,
    topUpTxHash,
    topUpAmountWei: plan.ethToSendWei,
    plan,
  };
}

/**
 * Builds, signs, and executes a sponsored ERC-20 (USDT, etc.) transfer on Base or Ethereum.
 * Uses JIT micro-ETH gas top-up:
 * 1. Validates user token balance.
 * 2. Tops up user account with micro-ETH if native gas is needed.
 * 3. User transfers token to recipient.
 * 4. User transfers platform fee to Jumpa fee collector (if fee collection enabled).
 */
export async function executeSponsoredEvmErc20Transfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
  asset?: string;
  chain?: "base" | "eth" | "ethereum";
  skipFeeCollection?: boolean;
  forceTopUp?: boolean;
}): Promise<TransferResult> {
  const {
    mnemonicOrPrivateKey,
    destination,
    amount,
    asset = "USDT",
    chain = "base",
    skipFeeCollection = false,
    forceTopUp = false,
  } = params;

  const isEthereum = chain === "eth" || chain === "ethereum";
  const chainLabel = isEthereum ? "Ethereum" : "Base";
  const targetChain = isEthereum ? mainnet : base;
  const upperAsset = asset.toUpperCase();

  const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  // Resolve token contract & decimals
  let tokenAddress: Address;
  let tokenDecimals = 6;
  if (upperAsset === "USDT") {
    tokenAddress = isEthereum ? ETHEREUM_USDT_ADDRESS : BASE_USDT_ADDRESS;
  } else if (upperAsset === "USDC") {
    tokenAddress = isEthereum ? ETHEREUM_USDC_ADDRESS : BASE_USDC_ADDRESS;
  } else {
    throw new Error(`Unsupported sponsored ERC-20 asset: ${asset}`);
  }

  const userAccount = parseUserEvmAccount(mnemonicOrPrivateKey);
  const rpcUrl = getRpcUrl(isEthereum ? "ethereum" : "base");

  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const userWalletClient = createWalletClient({
    account: userAccount,
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const feeCollectorAddress = getEvmFeeCollectorAddress();
  const willCollectFee =
    !skipFeeCollection &&
    feeCollectorAddress !== null &&
    feeCollectorAddress.toLowerCase() !== userAccount.address.toLowerCase();

  // If collecting fee, we need gas for 2 ERC20 transfers (transfer to recipient + fee to Jumpa)
  const requiredGasUnits = willCollectFee ? BigInt(130000) : BigInt(65000);

  const plan = await calculateEvmGasSponsorship({
    chain,
    requiredGasUnits,
  });

  const feeAmount = willCollectFee ? plan.feeToCollectUsd : 0;
  const totalRequired = numAmount + feeAmount;

  // 1. Verify user token balance
  const userTokenBalanceRaw = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_OR_USDT_ABI,
    functionName: "balanceOf",
    args: [userAccount.address],
  });

  const userTokenBalance =
    Number(userTokenBalanceRaw) / Math.pow(10, tokenDecimals);

  if (userTokenBalance < totalRequired) {
    throw new Error(
      `Insufficient ${upperAsset} balance on ${chainLabel} to complete the transaction. Available: ${userTokenBalance.toFixed(2)} ${upperAsset}, Required: ${totalRequired.toFixed(2)} ${upperAsset} (transfer: ${numAmount.toFixed(2)}, fee: ${feeAmount.toFixed(2)}).`,
    );
  }

  // 2. Ensure user has enough ETH for gas (top up if needed)
  const gasRes = await ensureSufficientEvmGas({
    userAddress: userAccount.address,
    chain,
    requiredGasUnits,
    forceTopUp,
  });

  const rawTransferValue = parseUnits(String(numAmount), tokenDecimals);

  // Fetch the fresh pending nonce to ensure no collision even if testing with the sponsor wallet itself
  const currentNonce = await publicClient.getTransactionCount({
    address: userAccount.address,
    blockTag: "pending",
  });

  console.log(
    `[${chainLabel} Sponsor] Broadcasting ${upperAsset} transfer from ${userAccount.address} to ${destination} (${numAmount} ${upperAsset}, nonce: ${currentNonce})...`,
  );

  // 3. User broadcasts transfer to recipient
  const mainTxHash = await userWalletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_OR_USDT_ABI,
    functionName: "transfer",
    args: [destination as Address, rawTransferValue],
    nonce: currentNonce,
  });

  // 4. User transfers fee to fee collector if applicable
  if (willCollectFee && feeAmount > 0 && feeCollectorAddress) {
    try {
      const rawFeeValue = parseUnits(String(feeAmount), tokenDecimals);
      console.log(
        `[${chainLabel} Sponsor] Broadcasting fee transfer (${feeAmount} ${upperAsset}, nonce: ${currentNonce + 1}) to ${feeCollectorAddress}...`,
      );
      await userWalletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_OR_USDT_ABI,
        functionName: "transfer",
        args: [feeCollectorAddress, rawFeeValue],
        nonce: currentNonce + 1,
      });
    } catch (feeErr) {
      console.warn(`[${chainLabel} Sponsor] Fee transfer warning:`, feeErr);
    }
  }

  // 5. Quick receipt check
  const waitTimeout = isEthereum ? 12000 : 3000;
  try {
    await Promise.race([
      publicClient.waitForTransactionReceipt({ hash: mainTxHash }),
      new Promise((resolve) => setTimeout(resolve, waitTimeout)),
    ]);
  } catch (receiptErr) {
    console.warn(`[${chainLabel} Sponsor] Receipt check note:`, receiptErr);
  }

  const explorerUrl = getExplorerTxUrl(isEthereum ? "ethereum" : "base", mainTxHash);
  console.log(
    `[${chainLabel} Sponsor] ${upperAsset} transfer confirmed! TxHash: ${mainTxHash} (Fee: ${feeAmount} ${upperAsset})`,
  );

  return {
    success: true,
    txHash: mainTxHash,
    explorerUrl,
    feePaid: `${feeAmount} ${upperAsset}`,
    fromAddress: userAccount.address,
  };
}

/**
 * Builds, signs, and executes a sponsored USDT transfer on Base.
 */
export async function executeSponsoredBaseUsdtTransfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
}): Promise<TransferResult> {
  return executeSponsoredEvmErc20Transfer({
    ...params,
    asset: "USDT",
    chain: "base",
  });
}

/**
 * Builds, signs, and executes a sponsored USDT transfer on Ethereum Mainnet.
 */
export async function executeSponsoredEthereumUsdtTransfer(params: {
  mnemonicOrPrivateKey: string;
  destination: string;
  amount: string | number;
}): Promise<TransferResult> {
  return executeSponsoredEvmErc20Transfer({
    ...params,
    asset: "USDT",
    chain: "ethereum",
  });
}
