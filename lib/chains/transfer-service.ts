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
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { sendAndConfirmTransactionPolling } from "@/lib/chains/solana/send-and-confirm";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
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
import {
  wrapWithFeeBump,
  getSponsorKeypair,
  getStellarFeeCollectorPubkey,
  getStellarFeeAmount,
} from "./stellar/sponsor";
import { environment } from "@/lib/environment";
import { CONTRACT_ADDRESSES, getExplorerTxUrl, getRpcUrl, getSolanaRpcUrl } from "@/lib/blockchain";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { HDKey } from "@scure/bip32";
import { deriveStellarKeypairFromMnemonic } from "@/lib/chains/stellar";
import {
  parseSolanaKeypair,
  getSolanaSponsorKeypair,
  executeSponsoredSplTransfer,
} from "./solana/sponsor";

export function resolveChainPrivateKey(
  secret: string,
  chain: "stellar" | "solana" | "base" | "eth" | "ethereum",
): string {
  const trimmed = secret.trim();
  const isMnemonic = trimmed.split(/\s+/).length >= 12;

  if (isMnemonic) {
    if (chain === "stellar") {
      return deriveStellarKeypairFromMnemonic(trimmed).secretKey;
    }

    const seed = bip39.mnemonicToSeedSync(trimmed);

    if (chain === "solana") {
      const derived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
      const keypair = SolKeypair.fromSeed(derived);
      return Buffer.from(keypair.secretKey).toString("hex");
    }

    if (chain === "base" || chain === "eth" || chain === "ethereum") {
      const hdKey = HDKey.fromMasterSeed(seed);
      const child = hdKey.derive("m/44'/60'/0'/0/0");
      if (!child.privateKey) throw new Error("Could not derive EVM private key");
      return `0x${Buffer.from(child.privateKey).toString("hex")}`;
    }
  }

  // Already a raw private key
  return trimmed;
}

// Stellar USDC Issuers
const STELLAR_USDC_ISSUERS = {
  mainnet: CONTRACT_ADDRESSES.stellar.mainnet.USDC,
  testnet: CONTRACT_ADDRESSES.stellar.testnet.USDC,
};

// Solana SPL Token Mints (Mainnet)
const SOLANA_MINTS: Record<string, { mint: string; decimals: number }> =
  CONTRACT_ADDRESSES.solana.mainnet;

// Base & Ethereum Token Contracts
const EVM_CONTRACTS: Record<
  string,
  Record<string, { address: `0x${string}`; decimals: number }>
> = {
  base: {
    USDC: CONTRACT_ADDRESSES.base.mainnet.USDC,
  },
  eth: {
    USDC: CONTRACT_ADDRESSES.ethereum.mainnet.USDC,
    USDT: CONTRACT_ADDRESSES.ethereum.mainnet.USDT,
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
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount.");
  }

  // Calculate available spendable XLM (total XLM minus account reserve)
  const nativeBal = sourceAccount.balances.find(
    (b: any) => b.asset_type === "native",
  );
  const totalXlm = nativeBal ? parseFloat(nativeBal.balance) : 0;
  const minReserve = 1.0 + (sourceAccount.subentry_count || 0) * 0.5;
  const availableXlm = Math.max(0, totalXlm - minReserve);

  const passphrase =
    network === "mainnet"
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

  let txBuilder: StellarSdk.TransactionBuilder;
  let feePaid = "0.00001 XLM";
  let useGasAbstraction = false;

  if (upperAsset === "XLM" || upperAsset === "NATIVE") {
    if (availableXlm < numAmount + 0.00001) {
      throw new Error(
        `Insufficient XLM balance to complete the transaction.`,
      );
    }

    const paymentOp = destExists
      ? StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount: String(amount),
      })
      : StellarSdk.Operation.createAccount({
        destination,
        startingBalance: String(amount),
      });

    txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: passphrase,
    }).addOperation(paymentOp);
  } else if (upperAsset === "USDC") {
    if (!destExists) {
      throw new Error(
        "Destination Stellar account is not activated. Only XLM can be sent to fund a new account.",
      );
    }

    const issuer = STELLAR_USDC_ISSUERS[network];
    const usdcAsset = new StellarSdk.Asset("USDC", issuer);

    const usdcBal = sourceAccount.balances.find(
      (b: any) =>
        b.asset_code === "USDC" &&
        (!b.asset_issuer || b.asset_issuer === issuer),
    );
    const userUsdc = usdcBal ? parseFloat(usdcBal.balance) : 0;

    // Check if user has enough available XLM to pay native transaction fee (0.00001 XLM)
    const hasEnoughXlmGas = availableXlm >= 0.0001;
    const sponsorKey = getSponsorKeypair();

    if (!hasEnoughXlmGas && sponsorKey) {
      useGasAbstraction = true;
      const feeAmount = getStellarFeeAmount();
      const feeCollectorPubkey = getStellarFeeCollectorPubkey();
      if (!feeCollectorPubkey) {
        throw new Error("Stellar fee collection address is not configured.");
      }

      const totalRequiredUsdc = numAmount + feeAmount;
      if (userUsdc < totalRequiredUsdc) {
        throw new Error(
          `Insufficient USDC balance to complete the transaction. You need at least ${totalRequiredUsdc.toFixed(4)} USDC.`,
        );
      }

      console.log(
        `[Transfer Service] User available XLM (${availableXlm.toFixed(4)} XLM) < 0.0001 XLM. Activating Stellar gas abstraction (Fee: ${feeAmount} USDC)...`,
      );

      // Operation 1: User -> Destination
      const userPaymentOp = StellarSdk.Operation.payment({
        destination,
        asset: usdcAsset,
        amount: String(amount),
      });

      // Operation 2: User -> Jumpa Fee Collector
      const feePaymentOp = StellarSdk.Operation.payment({
        destination: feeCollectorPubkey,
        asset: usdcAsset,
        amount: feeAmount.toFixed(7),
      });

      txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: (Number(StellarSdk.BASE_FEE) * 2).toString(),
        networkPassphrase: passphrase,
      })
        .addOperation(userPaymentOp)
        .addOperation(feePaymentOp);

      feePaid = `$${feeAmount.toFixed(2)}`;
    } else {
      // User has enough XLM to pay own gas fee (or gas abstraction not configured)
      if (userUsdc < numAmount) {
        throw new Error(
          `Insufficient USDC balance. You need at least ${numAmount.toFixed(4)} USDC.`,
        );
      }
      if (!hasEnoughXlmGas) {
        throw new Error(
          `Insufficient XLM balance to pay network transaction fee. Available: ${availableXlm.toFixed(4)} XLM.`,
        );
      }

      const paymentOp = StellarSdk.Operation.payment({
        destination,
        asset: usdcAsset,
        amount: String(amount),
      });

      txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: passphrase,
      }).addOperation(paymentOp);

      feePaid = "0.00001 XLM";
    }
  } else {
    throw new Error(`Unsupported Stellar asset: ${asset}`);
  }

  // Attach memo if provided, otherwise brand with Jumpa on-chain
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
  } else {
    txBuilder.addMemo(StellarSdk.Memo.text("Jumpa: Transfer"));
  }

  const tx = txBuilder.setTimeout(60).build();
  tx.sign(sourceKeypair);

  let finalTx: StellarSdk.FeeBumpTransaction | StellarSdk.Transaction = tx;
  if (useGasAbstraction) {
    const bumpRes = wrapWithFeeBump(tx, network);
    finalTx = bumpRes.tx;
  }

  console.log(
    `[Transfer Service] Submitting Stellar (${network}) transfer...${useGasAbstraction ? " (gas abstracted)" : " (user paid XLM gas)"}`,
  );
  const horizonRes = await server.submitTransaction(finalTx);

  const txHash = horizonRes.hash;
  const explorerUrl = getExplorerTxUrl("stellar", txHash, network === "testnet");

  return {
    success: true,
    txHash,
    explorerUrl,
    feePaid,
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
    keypair = parseSolanaKeypair(privateKey);
  } catch (err) {
    throw new Error(`Invalid Solana private key: ${err instanceof Error ? err.message : String(err)}`);
  }

  const fromAddress = keypair.publicKey.toBase58();
  const destPubkey = new PublicKey(destination);
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");

  const upperAsset = asset.toUpperCase();
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid transfer amount");
  }

  // 1. Native SOL Transfer (User pays own SOL gas)
  if (upperAsset === "SOL") {
    const tx = new SolTransaction();
    const lamports = BigInt(Math.round(numAmount * LAMPORTS_PER_SOL));
    tx.add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: destPubkey,
        lamports,
      }),
    );

    const txHash = await sendAndConfirmTransactionPolling(connection, tx, [keypair]);
    const explorerUrl = getExplorerTxUrl("solana", txHash);

    return {
      success: true,
      txHash,
      explorerUrl,
      feePaid: "0.000005 SOL",
      fromAddress,
    };
  }

  // 2. SPL Token Transfer (USDC, USDT)
  if (SOLANA_MINTS[upperAsset]) {
    // Check user's native SOL balance
    const lamports = await connection.getBalance(keypair.publicKey);
    const solBalance = lamports / 1e9;

    // Only activate gas abstraction if user has insufficient SOL (< 0.001 SOL) to pay network fee
    if (solBalance < 0.001 && getSolanaSponsorKeypair()) {
      console.log(
        `[Transfer Service] User SOL balance (${solBalance.toFixed(6)} SOL) < 0.001 SOL — sponsoring ${upperAsset} transfer with in-token fee deduction...`,
      );
      return await executeSponsoredSplTransfer({
        userKeypair: keypair,
        destination,
        amount,
        asset: upperAsset,
        connection,
      });
    }

    // User pays own SOL network fee if they have enough SOL (>= 0.001 SOL) or sponsor is not configured
    const tx = new SolTransaction();
    const tokenInfo = SOLANA_MINTS[upperAsset];
    const mintPubkey = new PublicKey(tokenInfo.mint);

    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mintPubkey,
      keypair.publicKey,
    );

    // Check if destPubkey is already a Token Account owned by TOKEN_PROGRAM_ID
    let finalDestAddress = destPubkey;
    const accountInfo = await connection.getAccountInfo(destPubkey);

    if (
      accountInfo &&
      accountInfo.owner.toBase58() === TOKEN_PROGRAM_ID.toBase58()
    ) {
      finalDestAddress = destPubkey;
    } else {
      const toAta = await getOrCreateAssociatedTokenAccount(
        connection,
        keypair,
        mintPubkey,
        destPubkey,
        true, // allowOwnerOffCurve: supports PDAs & contract deposit vaults
      );
      finalDestAddress = toAta.address;
    }

    const rawAmount = BigInt(
      Math.round(numAmount * Math.pow(10, tokenInfo.decimals)),
    );

    tx.add(
      createTransferInstruction(
        fromAta.address,
        finalDestAddress,
        keypair.publicKey,
        rawAmount,
      ),
    );

    const txHash = await sendAndConfirmTransactionPolling(connection, tx, [keypair]);
    const explorerUrl = getExplorerTxUrl("solana", txHash);

    return {
      success: true,
      txHash,
      explorerUrl,
      feePaid: "0.000005 SOL",
      fromAddress,
    };
  }

  throw new Error(`Unsupported Solana asset: ${asset}`);
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
  const rpcUrl = getRpcUrl(chain === "eth" ? "ethereum" : "base");

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

  // EVM transaction is already signed and broadcast to the mempool.
  // Wait briefly (up to 3s on Base, 1.5s on Ethereum). If block inclusion takes longer,
  // return the valid broadcast txHash immediately so user gets instant confirmation without 90s delays.
  const waitTimeout = chain === "base" ? 3000 : 1500;
  console.log(`[Transfer Service] EVM tx broadcast (${txHash}) on ${chain}. Quick receipt check (${waitTimeout / 1000}s cap)...`);
  try {
    await Promise.race([
      publicClient.waitForTransactionReceipt({ hash: txHash }),
      new Promise((resolve) => setTimeout(resolve, waitTimeout)),
    ]);
  } catch (receiptErr) {
    console.warn(`[Transfer Service] Receipt check note on ${chain}:`, receiptErr);
  }

  const explorerUrl = getExplorerTxUrl(chain, txHash);

  return {
    success: true,
    txHash,
    explorerUrl,
    fromAddress: account.address,
  };
}
