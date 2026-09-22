/**
 * Jumpa — On-Chain Offramp Token Transfer Executor
 *
 * Executes real on-chain token transfers to Switch's deposit address on Base or Solana.
 */

import {
  Connection,
  PublicKey,
  Keypair as SolKeypair,
  Transaction as SolTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";

import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { base, mainnet } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import { environment } from "@/lib/environment";
import { submitCentiivStellarPayment } from "@/lib/functions/centiivFunctions";
import * as StellarSdk from "@stellar/stellar-sdk";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
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

import { CONTRACT_ADDRESSES, getExplorerTxUrl } from "@/lib/blockchain";

export interface OfframpAssetConfig {
  chain: "base" | "solana" | "stellar" | "ethereum";
  address?: string; // For EVM
  mint?: string; // For Solana
  decimals: number;
}

export const OFFRAMP_ASSETS: Record<string, OfframpAssetConfig> = {
  "stellar:usdc": {
    chain: "stellar" as any,
    decimals: 7,
  },
  "base:usdc": {
    chain: "base",
    address: CONTRACT_ADDRESSES.base.mainnet.USDC.address,
    decimals: CONTRACT_ADDRESSES.base.mainnet.USDC.decimals,
  },
  "base:cngn": {
    chain: "base",
    address: CONTRACT_ADDRESSES.base.mainnet.cNGN.address,
    decimals: CONTRACT_ADDRESSES.base.mainnet.cNGN.decimals,
  },
  "solana:usdc": {
    chain: "solana",
    mint: CONTRACT_ADDRESSES.solana.mainnet.USDC.mint,
    decimals: CONTRACT_ADDRESSES.solana.mainnet.USDC.decimals,
  },
  "solana:usdt": {
    chain: "solana",
    mint: CONTRACT_ADDRESSES.solana.mainnet.USDT.mint,
    decimals: CONTRACT_ADDRESSES.solana.mainnet.USDT.decimals,
  },
  "ethereum:usdc": {
    chain: "ethereum",
    address: CONTRACT_ADDRESSES.ethereum.mainnet.USDC.address,
    decimals: CONTRACT_ADDRESSES.ethereum.mainnet.USDC.decimals,
  },
  "ethereum:usdt": {
    chain: "ethereum",
    address: CONTRACT_ADDRESSES.ethereum.mainnet.USDT.address,
    decimals: CONTRACT_ADDRESSES.ethereum.mainnet.USDT.decimals,
  },
};

export interface OfframpExecutionResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  /** "PENDING" when Horizon timed out (504) but the tx may still land on-chain */
  txStatus?: "CONFIRMED" | "PENDING";
}

export async function executeOfframpTransfer(options: {
  mnemonic: string;
  asset: string;
  depositAddress: string;
  amount: number | string;
}): Promise<OfframpExecutionResult> {
  const { mnemonic, asset, depositAddress, amount } = options;
  const normalizedAsset = asset.toLowerCase().trim();
  const config = OFFRAMP_ASSETS[normalizedAsset];

  if (!config) {
    return {
      success: false,
      error: `Unsupported asset "${asset}" for automated on-chain offramp transfer.`,
    };
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      success: false,
      error: "Invalid deposit amount.",
    };
  }

  try {
    // ── 1. Base / EVM Transfer
    if (config.chain === "stellar") {
      try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const derivationPath = "m/44'/148'/0'";
        const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
        const keypair = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(derivedSeed));
        const secret = keypair.secret();
        
        console.log(`[OfframpTransfer] Stellar account: ${keypair.publicKey()}`);
        
        const txRes = await submitCentiivStellarPayment({
          destinationAddress: depositAddress,
          usdcAmount: amount.toString(),
          userSecretKey: secret
        });

        if (txRes.status === "pending") {
          console.warn(
            `[OfframpTransfer] Stellar tx ${txRes.hash} is PENDING (Horizon 504). Centiiv will detect the payment on-chain.`,
          );
          return {
            success: true,
            txHash: txRes.hash,
            explorerUrl: `https://stellar.expert/explorer/public/tx/${txRes.hash}`,
            txStatus: "PENDING",
          };
        }

        return {
          success: true,
          txHash: txRes.hash,
          explorerUrl: `https://stellar.expert/explorer/public/tx/${txRes.hash}`,
          txStatus: "CONFIRMED",
        };
      } catch (err: any) {
        let details = err.message;
        if (err.response && err.response.data) {
          details += " - " + JSON.stringify(err.response.data);
        }
        console.error("Stellar error:", details);
        return { success: false, error: "Stellar transfer failed: " + details };
      }
    }

    if (config.chain === "base" || config.chain === "ethereum") {
      const isEthereum = config.chain === "ethereum";
      const rpc = isEthereum 
        ? environment.ALCHEMY_MAINNET_RPC 
        : environment.ALCHEMY_BASE_MAINNET_RPC;
      const viemChain = isEthereum ? mainnet : base;
      const networkName = isEthereum ? "Ethereum" : "Base";

      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(rpc),
      });
      const walletClient = createWalletClient({
        chain: viemChain,
        transport: http(rpc),
      });

      const account = mnemonicToAccount(mnemonic as `0x${string}`);
      const tokenAddress = config.address as `0x${string}`;

      // Pre-flight check: Gas (ETH) balance
      const ethBalanceWei = await publicClient.getBalance({
        address: account.address,
      });
      const ethBalance = Number(ethBalanceWei) / 1e18;
      
      const minimumGas = isEthereum ? 0.001 : 0.0003;
      if (ethBalance < minimumGas) {
        return {
          success: false,
          error: `Insufficient ETH balance on ${networkName} network to pay gas fees (minimum ${minimumGas} ETH required).`,
        };
      }

      // Pre-flight check: Token balance
      const tokenBalanceWei = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });
      const tokenBalance =
        Number(tokenBalanceWei) / Math.pow(10, config.decimals);
      console.log(
        `[OfframpTransfer] Asset ${asset} Balance: ${tokenBalance}, Needed: ${numAmount}`,
      );
      if (tokenBalance < numAmount) {
        return {
          success: false,
          error: `Insufficient ${asset.split(":")[1]?.toUpperCase()} balance on ${networkName} (available: ${tokenBalance.toFixed(2)}, required: ${numAmount}).`,
        };
      }

      const amountUnits = parseUnits(String(numAmount), config.decimals);

      console.log(
        `[OfframpTransfer] Writing ERC20 transfer to ${depositAddress} (${amountUnits} units) on ${networkName}...`,
      );

      const txHash = await walletClient.writeContract({
        account,
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [depositAddress as `0x${string}`, amountUnits],
      });

      console.log(`[OfframpTransfer] ${networkName} transfer sent! TxHash: ${txHash}`);

      return {
        success: true,
        txHash,
        explorerUrl: getExplorerTxUrl(config.chain, txHash),
      };
    }

    // ── 2. Solana Transfer
    if (config.chain === "solana") {
      const solRpc =
        environment.SOL_MAINNET ||
        environment.NEXT_PUBLIC_SOLANA_RPC ||
        "https://api.mainnet-beta.solana.com";
      const connection = new Connection(solRpc, "confirmed");

      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const solDerived = derivePath(
        "m/44'/501'/0'/0'",
        seed.toString("hex"),
      ).key;
      const solKeypair = SolKeypair.fromSeed(solDerived);

      console.log(
        `[OfframpTransfer] Solana sender address: ${solKeypair.publicKey.toBase58()}`,
      );

      // Pre-flight check: SOL gas balance
      const lamports = await connection.getBalance(solKeypair.publicKey);
      const solBalance = lamports / 1e9;
      console.log(`[OfframpTransfer] Solana SOL balance: ${solBalance} SOL`);
      if (solBalance < 0.002) {
        return {
          success: false,
          error: "Insufficient SOL balance for transaction fees (minimum 0.002 SOL required).",
        };
      }

      const mintPubkey = new PublicKey(config.mint!);
      const recipientPubkey = new PublicKey(depositAddress);

      // Check token balance
      const sourceATA = await getOrCreateAssociatedTokenAccount(
        connection,
        solKeypair,
        mintPubkey,
        solKeypair.publicKey,
      );

      const tokenBalanceRes = await connection.getTokenAccountBalance(
        sourceATA.address,
      );
      const tokenBalance = tokenBalanceRes.value.uiAmount || 0;
      console.log(
        `[OfframpTransfer] Solana Token Balance: ${tokenBalance}, Needed: ${numAmount}`,
      );
      if (tokenBalance < numAmount) {
        return {
          success: false,
          error: `Insufficient ${asset.split(":")[1]?.toUpperCase()} balance on Solana (available: ${tokenBalance.toFixed(2)}, required: ${numAmount}).`,
        };
      }

      // Check destination ATA
      let finalDestAddress = recipientPubkey;
      const recipientAccountInfo = await connection.getAccountInfo(recipientPubkey);

      const transaction = new SolTransaction();

      if (
        recipientAccountInfo &&
        recipientAccountInfo.owner.toBase58() === TOKEN_PROGRAM_ID.toBase58()
      ) {
        // Recipient is already a Token Account
        finalDestAddress = recipientPubkey;
      } else {
        // Recipient is a wallet owner or PDA: resolve its ATA
        const destATA = await getAssociatedTokenAddress(
          mintPubkey,
          recipientPubkey,
          true, // allowOwnerOffCurve
        );
        finalDestAddress = destATA;

        const destAtaInfo = await connection.getAccountInfo(destATA);
        if (!destAtaInfo) {
          // Destination ATA does not exist yet. Check if sender has enough SOL for rent exemption (~0.00204 SOL)
          const rentLamports = await connection.getMinimumBalanceForRentExemption(165);
          const requiredLamports = rentLamports + 10000; // Rent + transaction fees
          if (lamports < requiredLamports) {
            return {
              success: false,
              error: `Insufficient SOL balance. You have ${solBalance.toFixed(5)} SOL, but at least ${(requiredLamports / 1e9).toFixed(5)} SOL is required`,
            };
          }

          console.log(
            `[OfframpTransfer] Destination ATA not found. Prepending createAssociatedTokenAccountInstruction: ${destATA.toBase58()}`,
          );
          transaction.add(
            createAssociatedTokenAccountInstruction(
              solKeypair.publicKey,
              destATA,
              recipientPubkey,
              mintPubkey,
            ),
          );
        }
      }

      const amountRaw = BigInt(
        Math.floor(numAmount * Math.pow(10, config.decimals)),
      );

      transaction.add(
        createTransferInstruction(
          sourceATA.address,
          finalDestAddress,
          solKeypair.publicKey,
          amountRaw,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      const txHash = await sendAndConfirmTransaction(connection, transaction, [
        solKeypair,
      ]);

      console.log(`[OfframpTransfer] Solana transfer confirmed! TxHash: ${txHash}`);

      return {
        success: true,
        txHash,
        explorerUrl: getExplorerTxUrl("solana", txHash),
      };
    }

    return {
      success: false,
      error: `Unsupported chain for asset "${asset}".`,
    };
  } catch (err: any) {
    console.error("[OfframpTransfer] Error executing transfer:", err);
    return {
      success: false,
      error: err?.message || "Blockchain transfer failed.",
    };
  }
}
