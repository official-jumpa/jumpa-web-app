/**
 * Jumpa — Real On-Chain Transfer Execution
 *
 * Executes real on-chain transfers across Stellar (Mainnet & Testnet with memo),
 * Solana (SOL, USDC, USDT), and EVM (Base & Ethereum).
 * Accepts privateKey directly.
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  Connection,
  PublicKey,
  Keypair as SolKeypair,
  Transaction as SolTransaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet as ethMainnet } from "viem/chains";
import { getHorizonServer } from "./stellar/client";
import { environment } from "@/lib/environment";

// Stellar USDC Issuers
const STELLAR_USDC_ISSUERS = {
  mainnet: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  testnet: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};

// Solana SPL Token Mints (Mainnet)
const SOLANA_MINTS: Record<string, { mint: string; decimals: number }> = {
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  USDT: {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
  },
};

// Base & Ethereum Token Contracts
const EVM_CONTRACTS: Record<string, Record<string, { address: `0x${string}`; decimals: number }>> = {
  base: {
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
    },
  },
  eth: {
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
    },
    USDT: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },
  },
};

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "boolean" }],
  },
] as const;

export interface TransferResult {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  feePaid?: string;
  fromAddress: string;
}

/**
 * 1. Stellar Transfer (Mainnet or Testnet)
 */
export async function sendStellar(params: {
  privateKey: string;
  destination: string;
  amount: string;
  asset: string;
  network: "mainnet" | "testnet";
  memo?: string;
}): Promise<TransferResult> {
  const { privateKey, destination, amount, asset, network, memo } = params;

  const sourceKeypair = StellarSdk.Keypair.fromSecret(privateKey.trim());
  const fromAddress = sourceKeypair.publicKey();
  const server = getHorizonServer(network);

  let sourceAccount: any;
  try {
    sourceAccount = await server.loadAccount(fromAddress);
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.message?.includes("Not Found")) {
      const advice =
        network === "testnet"
          ? "Your Stellar Testnet account is unfunded. Please use the faucet on the home page first."
          : "Your Stellar account is not activated (minimum 1 XLM balance required).";
      throw new Error(advice);
    }
    throw err;
  }

  // Check if destination exists
  let destExists = false;
  try {
    await server.loadAccount(destination);
    destExists = true;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.message?.includes("Not Found")) {
      destExists = false;
    } else {
      throw err;
    }
  }

  const upperAsset = asset.toUpperCase();
  let paymentOp: StellarSdk.xdr.Operation;

  if (upperAsset === "XLM" || upperAsset === "NATIVE") {
    paymentOp = destExists
      ? StellarSdk.Operation.payment({
          destination,
          asset: StellarSdk.Asset.native(),
          amount: String(amount),
        })
      : StellarSdk.Operation.createAccount({
          destination,
          startingBalance: String(amount),
        });
  } else if (upperAsset === "USDC") {
    if (!destExists) {
      throw new Error(
        "Destination Stellar account is not activated. Only XLM can be sent to fund a new account.",
      );
    }
    const issuer = STELLAR_USDC_ISSUERS[network];
    paymentOp = StellarSdk.Operation.payment({
      destination,
      asset: new StellarSdk.Asset("USDC", issuer),
      amount: String(amount),
    });
  } else {
    throw new Error(`Unsupported Stellar asset: ${asset}`);
  }

  const passphrase =
    network === "mainnet"
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: passphrase,
  }).addOperation(paymentOp);

  // Attach memo if provided
  if (memo && memo.trim()) {
    const trimmedMemo = memo.trim();
    // If digits only and fits in uint64, use Memo.id, else Memo.text
    if (/^\d+$/.test(trimmedMemo) && trimmedMemo.length <= 19) {
      try {
        txBuilder.addMemo(StellarSdk.Memo.id(trimmedMemo));
      } catch {
        txBuilder.addMemo(StellarSdk.Memo.text(trimmedMemo.slice(0, 28)));
      }
    } else {
      txBuilder.addMemo(StellarSdk.Memo.text(trimmedMemo.slice(0, 28)));
    }
  }

  const tx = txBuilder.setTimeout(60).build();
  tx.sign(sourceKeypair);

  console.log(`[Transfer Service] Submitting Stellar (${network}) transfer...`);
  const horizonRes = await server.submitTransaction(tx);

  const txHash = horizonRes.hash;
  const explorerUrl = `https://stellar.expert/explorer/${network}/tx/${txHash}`;

  return {
    success: true,
    txHash,
    explorerUrl,
    feePaid: "0.00001 XLM",
    fromAddress,
  };
}

/**
 * 2. Solana Transfer (Mainnet)
 */
export async function sendSolana(params: {
  privateKey: string; // 64-byte hex or base58
  destination: string;
  amount: string;
  asset: string;
}): Promise<TransferResult> {
  const { privateKey, destination, amount, asset } = params;

  let keypair: SolKeypair;
  try {
    const cleanHex = privateKey.replace(/^0x/, "");
    if (cleanHex.length === 128) {
      keypair = SolKeypair.fromSecretKey(Buffer.from(cleanHex, "hex"));
    } else {
      // @ts-expect-error bs58 untyped module
      const bs58 = (await import("bs58")).default;
      keypair = SolKeypair.fromSecretKey(bs58.decode(privateKey.trim()));
    }
  } catch (err) {
    throw new Error(`Invalid Solana private key: ${err instanceof Error ? err.message : String(err)}`);
  }

  const fromAddress = keypair.publicKey.toBase58();
  const destPubkey = new PublicKey(destination);
  const connection = new Connection(
    environment.SOL_MAINNET || "https://api.mainnet-beta.solana.com",
    "confirmed",
  );

  const upperAsset = asset.toUpperCase();
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  const tx = new SolTransaction();

  if (upperAsset === "SOL") {
    const lamports = BigInt(Math.round(numAmount * LAMPORTS_PER_SOL));
    tx.add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: destPubkey,
        lamports,
      }),
    );
  } else if (SOLANA_MINTS[upperAsset]) {
    const tokenInfo = SOLANA_MINTS[upperAsset];
    const mintPubkey = new PublicKey(tokenInfo.mint);

    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mintPubkey,
      keypair.publicKey,
    );

    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mintPubkey,
      destPubkey,
    );

    const rawAmount = BigInt(
      Math.round(numAmount * Math.pow(10, tokenInfo.decimals)),
    );

    tx.add(
      createTransferInstruction(
        fromAta.address,
        toAta.address,
        keypair.publicKey,
        rawAmount,
      ),
    );
  } else {
    throw new Error(`Unsupported Solana asset: ${asset}`);
  }

  console.log(`[Transfer Service] Submitting Solana transfer...`);
  const txHash = await sendAndConfirmTransaction(connection, tx, [keypair]);
  const explorerUrl = `https://solscan.io/tx/${txHash}`;

  return {
    success: true,
    txHash,
    explorerUrl,
    feePaid: "0.000005 SOL",
    fromAddress,
  };
}

/**
 * 3. EVM Transfer (Base or Ethereum)
 */
export async function sendEvm(params: {
  privateKey: string;
  destination: string;
  amount: string;
  asset: string;
  chain: "base" | "eth";
}): Promise<TransferResult> {
  const { privateKey, destination, amount, asset, chain } = params;

  const cleanKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(cleanKey);
  const targetChain = chain === "base" ? base : ethMainnet;
  const rpcUrl =
    chain === "base"
      ? environment.ALCHEMY_BASE_MAINNET_RPC || "https://mainnet.base.org"
      : environment.ALCHEMY_MAINNET_RPC || environment.EVM_RPC_URL || "https://eth.llamarpc.com";

  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: targetChain,
    transport: http(rpcUrl),
  });

  const upperAsset = asset.toUpperCase();
  let txHash: `0x${string}`;

  if (upperAsset === "ETH") {
    txHash = await walletClient.sendTransaction({
      to: destination as `0x${string}`,
      value: parseEther(amount),
    });
  } else {
    const contracts = EVM_CONTRACTS[chain];
    const tokenConfig = contracts?.[upperAsset];
    if (!tokenConfig) {
      throw new Error(`Unsupported asset ${asset} on ${chain}`);
    }

    const rawAmount = parseUnits(amount, tokenConfig.decimals);
    txHash = await walletClient.writeContract({
      address: tokenConfig.address,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [destination as `0x${string}`, rawAmount],
    });
  }

  console.log(`[Transfer Service] Waiting for EVM receipt on ${chain}...`);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const explorerUrl =
    chain === "base"
      ? `https://basescan.org/tx/${txHash}`
      : `https://etherscan.io/tx/${txHash}`;

  return {
    success: true,
    txHash,
    explorerUrl,
    fromAddress: account.address,
  };
}
