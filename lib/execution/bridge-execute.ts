/**
 * lib/execution/bridge-execute.ts
 *
 * Full cross-chain USDC bridging pipeline via Circle CCTP v2:
 * 1. Mnemonic decryption via PIN.
 * 2. Key derivation (Stellar ed25519 or EVM account).
 * 3. Pre-flight source balance check.
 * 4. Submission of depositForBurn / burn transaction on source chain.
 * 5. DB persistence in Transaction model with type: "BRIDGE".
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  erc20Abi,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia } from "viem/chains";
import { decryptMnemonic } from "@/lib/crypto";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import {
  deriveStellarKeypairFromMnemonic,
  getHorizonServer,
  getSorobanRpcServer,
} from "@/lib/chains/stellar";
import { deriveAddresses } from "@/lib/derive-addresses";
import {
  CONTRACT_ADDRESSES,
  CCTP_DOMAINS,
  evmAddressToBytes32,
  stellarAddressToBytes32,
  getExplorerTxUrl,
  getRpcUrl,
} from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import type { IWallet } from "@/models/Wallet";

export interface BridgeExecuteParams {
  wallet: IWallet;
  pin: string;
  fromChain: "stellar" | "base" | "ethereum";
  toChain: "stellar" | "base" | "ethereum";
  amount: string;
  toAmount: string;
  recipientAddress: string;
  transferType?: "standard" | "fast";
  fee: string;
  userId: string;
}

export type BridgeExecuteResult =
  | {
      ok: true;
      txHash: string;
      explorerUrl: string;
      fromChain: string;
      toChain: string;
      sentAmount: string;
      receivedAmount: string;
      recipientAddress: string;
      status: "pending" | "confirmed";
    }
  | { ok: false; error: string; status: number };

async function submitSorobanTx({
  rpc,
  sourceAccount,
  keypair,
  operation,
  networkPassphrase,
}: {
  rpc: StellarSdk.rpc.Server;
  sourceAccount: StellarSdk.Account;
  keypair: StellarSdk.Keypair;
  operation: any;
  networkPassphrase: string;
}): Promise<string> {
  const rawTx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const sim = await rpc.simulateTransaction(rawTx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(`Soroban simulation failed: ${sim.error}`);
  }

  const preparedTx = StellarSdk.rpc.assembleTransaction(rawTx, sim).build();
  preparedTx.sign(keypair);

  const sendRes = await rpc.sendTransaction(preparedTx);
  if (sendRes.status === "ERROR") {
    throw new Error(
      `Soroban transaction send error: ${JSON.stringify(sendRes.errorResult || sendRes)}`,
    );
  }

  const hash = sendRes.hash;
  let attempts = 0;

  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const txRes: any = await rpc.getTransaction(hash);
      if (txRes.status === "SUCCESS") {
        return hash;
      }
      if (txRes.status === "FAILED") {
        throw new Error(
          `Transaction failed on Stellar Soroban: ${JSON.stringify(txRes.resultMetaXdr || txRes)}`,
        );
      }
    } catch (pollErr: any) {
      if (pollErr?.message?.includes("Transaction failed")) {
        throw pollErr;
      }
    }
    attempts++;
  }

  return hash;
}

export async function executeBridge(
  params: BridgeExecuteParams,
): Promise<BridgeExecuteResult> {
  const {
    wallet,
    pin,
    fromChain,
    toChain,
    amount,
    toAmount,
    recipientAddress,
    transferType = "fast",
    fee,
    userId,
  } = params;

  // 1. Decrypt mnemonic
  let phrase: string;
  try {
    phrase = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch {
    return {
      ok: false,
      error: "Incorrect PIN",
      status: 401,
    };
  }

  const derived = deriveAddresses(phrase);
  let txHash = "";
  let explorerUrl = "";

  try {
    if (fromChain === "stellar") {
      // ── Stellar Testnet -> Base Sepolia via Circle CCTP Soroban ──
      const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
      const sourceKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);
      const sourceAddress = sourceKeypair.publicKey();

      const horizon = getHorizonServer("testnet");
      const rpc = getSorobanRpcServer("testnet");

      let account: any;
      try {
        account = await horizon.loadAccount(sourceAddress);
      } catch (loadErr: any) {
        if (loadErr?.response?.status === 404) {
          return {
            ok: false,
            error: "Stellar testnet account not activated. Please fund with Friendbot first.",
            status: 400,
          };
        }
        return {
          ok: false,
          error: loadErr?.message?.includes("fetch failed")
            ? "Stellar testnet Horizon node unreachable. Please check connection and try again."
            : loadErr?.message || "Failed to load Stellar account.",
          status: 502,
        };
      }

      // Verify Stellar XLM balance for gas
      const xlmBal = account.balances.find((b: any) => b.asset_type === "native");
      const xlmAmount = xlmBal ? parseFloat(xlmBal.balance) : 0;
      if (xlmAmount < 1) {
        return {
          ok: false,
          error: `Insufficient XLM balance for network fees (available: ${xlmAmount.toFixed(2)} XLM, need at least 1 XLM)`,
          status: 400,
        };
      }

      // Verify Stellar USDC testnet balance
      const testnetUsdcIssuer = CONTRACT_ADDRESSES.stellar.testnet.USDC;
      const usdcBalObj = account.balances.find(
        (b: any) =>
          b.asset_code === "USDC" &&
          (b.asset_issuer === testnetUsdcIssuer || !testnetUsdcIssuer),
      ) || account.balances.find((b: any) => b.asset_code === "USDC");

      const currentBalance = usdcBalObj ? parseFloat(usdcBalObj.balance) : 0;
      const sendAmount = parseFloat(amount);

      if (currentBalance < sendAmount) {
        return {
          ok: false,
          error: `Insufficient testnet USDC balance on Stellar (available: ${currentBalance.toFixed(2)} USDC)`,
          status: 400,
        };
      }

      const stellarCctp = CONTRACT_ADDRESSES.cctp.testnet.stellar;
      const destCctp =
        toChain === "ethereum"
          ? CONTRACT_ADDRESSES.cctp.testnet.ethereum
          : CONTRACT_ADDRESSES.cctp.testnet.base;
      const stellarUsdcContract = stellarCctp.usdc;
      const tokenMessengerContract = stellarCctp.tokenMessenger;

      // Stellar USDC uses 7 decimals
      const amountInSubunits = BigInt(Math.round(sendAmount * 10_000_000));

      // 1. Check current allowance for TokenMessengerMinter on Soroban USDC
      const usdcContract = new StellarSdk.Contract(stellarUsdcContract);
      const allowanceOp = usdcContract.call(
        "allowance",
        new StellarSdk.Address(sourceAddress).toScVal(),
        new StellarSdk.Address(tokenMessengerContract).toScVal(),
      );

      const simAccount = new StellarSdk.Account(sourceAddress, "0");
      const simTx = new StellarSdk.TransactionBuilder(simAccount, {
        fee: "100000",
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(allowanceOp)
        .setTimeout(30)
        .build();

      let currentAllowance = BigInt(0);
      try {
        const simRes = await rpc.simulateTransaction(simTx);
        if (StellarSdk.rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
          currentAllowance = BigInt(StellarSdk.scValToNative(simRes.result.retval));
        }
      } catch (e) {
        console.warn("[Bridge] Allowance simulation check note:", e);
      }

      // 2. Submit approve if current allowance is insufficient
      if (currentAllowance < amountInSubunits) {
        const latestLedger = await rpc.getLatestLedger();
        const expirationLedger = latestLedger.sequence + 50000;
        const approvalAmount =
          amountInSubunits * BigInt(100) > BigInt("100000000000")
            ? amountInSubunits * BigInt(100)
            : BigInt("100000000000");

        const approveOp = usdcContract.call(
          "approve",
          new StellarSdk.Address(sourceAddress).toScVal(),
          new StellarSdk.Address(tokenMessengerContract).toScVal(),
          StellarSdk.nativeToScVal(approvalAmount, { type: "i128" }),
          StellarSdk.nativeToScVal(expirationLedger, { type: "u32" }),
        );

        const accForApprove = await rpc.getAccount(sourceAddress);
        await submitSorobanTx({
          rpc,
          sourceAccount: accForApprove,
          keypair: sourceKeypair,
          operation: approveOp,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        });
      }

      // 3. Submit deposit_for_burn to TokenMessengerMinter
      const accForBurn = await rpc.getAccount(sourceAddress);
      const messengerContract = new StellarSdk.Contract(tokenMessengerContract);

      // Convert destination EVM address to 32-byte hex for CCTP mint recipient
      const destBytes32 = evmAddressToBytes32(recipientAddress);
      const destBytesBuffer = Buffer.from(destBytes32.replace(/^0x/, ""), "hex");

      const fastTransfer = transferType === "fast";
      const feeNum = parseFloat(fee || "0");
      const maxFeeSubunits =
        feeNum > 0
          ? BigInt(Math.round(feeNum * 10_000_000))
          : fastTransfer
            ? BigInt(1500000)
            : BigInt(0);
      const finalityThreshold = fastTransfer ? 1000 : 2000;

      const burnOp = messengerContract.call(
        "deposit_for_burn",
        new StellarSdk.Address(sourceAddress).toScVal(),
        StellarSdk.nativeToScVal(amountInSubunits, { type: "i128" }),
        StellarSdk.nativeToScVal(destCctp.domain, { type: "u32" }),
        StellarSdk.xdr.ScVal.scvBytes(destBytesBuffer),
        new StellarSdk.Address(stellarUsdcContract).toScVal(),
        StellarSdk.xdr.ScVal.scvBytes(Buffer.alloc(32)),
        StellarSdk.nativeToScVal(maxFeeSubunits, { type: "i128" }),
        StellarSdk.nativeToScVal(finalityThreshold, { type: "u32" }),
      );

      txHash = await submitSorobanTx({
        rpc,
        sourceAccount: accForBurn,
        keypair: sourceKeypair,
        operation: burnOp,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      explorerUrl = getExplorerTxUrl("stellar", txHash, true);
    } else {
      // ── EVM (Base or Ethereum Sepolia) -> Stellar Testnet ──
      const isEth = fromChain === "ethereum";
      const evmChain = isEth ? sepolia : baseSepolia;
      const evmRpcUrl = getRpcUrl(isEth ? "ethereum-sepolia" : "base-sepolia");
      const evmCctp = isEth
        ? CONTRACT_ADDRESSES.cctp.testnet.ethereum
        : CONTRACT_ADDRESSES.cctp.testnet.base;
      const chainLabel = isEth ? "Ethereum Sepolia" : "Base Sepolia";

      const evmAccount = mnemonicToAccount(phrase);
      const publicClient = createPublicClient({
        chain: evmChain,
        transport: http(evmRpcUrl),
      });
      const walletClient = createWalletClient({
        account: evmAccount,
        chain: evmChain,
        transport: http(evmRpcUrl),
      });

      const stellarCctp = CONTRACT_ADDRESSES.cctp.testnet.stellar;
      const sendAmount = parseUnits(amount, evmCctp.decimals);

      // Check EVM ETH balance for gas
      const ethBalance = await publicClient.getBalance({
        address: evmAccount.address,
      });
      if (ethBalance === BigInt(0)) {
        return {
          ok: false,
          error: `Insufficient ${chainLabel} ETH for gas. Please fund your address with testnet ETH.`,
          status: 400,
        };
      }

      // Check EVM USDC balance
      const usdcBalance = await publicClient.readContract({
        address: evmCctp.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [evmAccount.address],
      });

      if (usdcBalance < sendAmount) {
        return {
          ok: false,
          error: `Insufficient ${chainLabel} USDC balance (available: ${(Number(usdcBalance) / 10 ** evmCctp.decimals).toFixed(2)} USDC)`,
          status: 400,
        };
      }

      // Check / approve USDC allowance for TokenMessenger on EVM
      const currentAllowance = await publicClient.readContract({
        address: evmCctp.usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: [evmAccount.address, evmCctp.tokenMessenger],
      });

      if (currentAllowance < sendAmount) {
        const approveHash = await walletClient.writeContract({
          address: evmCctp.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [evmCctp.tokenMessenger, sendAmount * BigInt(100)],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Recipient for Stellar via CctpForwarder
      const forwarderBytes32 = stellarAddressToBytes32(stellarCctp.cctpForwarder);

      const tokenMessengerAbi = [
        {
          type: "function",
          name: "depositForBurn",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
          ],
          outputs: [{ name: "_nonce", type: "uint64" }],
          stateMutability: "nonpayable",
        },
      ] as const;

      txHash = await walletClient.writeContract({
        address: evmCctp.tokenMessenger,
        abi: tokenMessengerAbi,
        functionName: "depositForBurn",
        args: [sendAmount, stellarCctp.domain, forwarderBytes32, evmCctp.usdc],
      });

      explorerUrl = getExplorerTxUrl(isEth ? "ethereum" : "base", txHash, true);
    }

    const fromDisplayName =
      fromChain === "stellar"
        ? "Stellar Testnet"
        : fromChain === "ethereum"
          ? "Ethereum Sepolia"
          : "Base Sepolia";
    const toDisplayName =
      toChain === "stellar"
        ? "Stellar Testnet"
        : toChain === "ethereum"
          ? "Ethereum Sepolia"
          : "Base Sepolia";

    // 2. Persist in database
    await connectDB();
    await Transaction.create({
      userId,
      walletId: wallet._id,
      type: "BRIDGE",
      status: "PENDING",
      chain: fromChain,
      network: "testnet",
      fromAddress:
        fromChain === "stellar"
          ? derived.addresses.xlm
          : derived.addresses.eth || derived.addresses.base,
      toAddress: recipientAddress,
      amount,
      token: "USDC",
      txHash,
      explorerUrl,
      bridgeDetails: {
        provider: "circle_cctp_v2",
        fromChain: fromDisplayName,
        toChain: toDisplayName,
        fromToken: "USDC",
        toToken: "USDC",
        fromAmount: amount,
        toAmount,
        fee,
        relayerFee: transferType === "fast" ? fee : "0.00",
      },
    });

    // 3. Automated Instant Relayer: automatically submit receiveMessage on destination EVM chain
    if (fromChain === "stellar" && (toChain === "ethereum" || toChain === "base")) {
      relayStellarToEvm({
        txHash,
        toChain,
        userId,
        amount: toAmount,
      });
    }

    return {
      ok: true,
      txHash,
      explorerUrl,
      fromChain: fromDisplayName,
      toChain: toDisplayName,
      sentAmount: amount,
      receivedAmount: toAmount,
      recipientAddress,
      status: "pending",
    };
  } catch (err: any) {
    console.error("[Bridge Execute Error]", err);
    return {
      ok: false,
      error: err?.message || "Failed to execute bridge transfer",
      status: 500,
    };
  }
}

/**
 * Automated Background Relayer for CCTP v2 transfers from Stellar to EVM (Ethereum / Base).
 * Polls Circle Iris for attestation and broadcasts receiveMessage automatically.
 */
function relayStellarToEvm({
  txHash,
  toChain,
  userId,
  amount,
}: {
  txHash: string;
  toChain: "ethereum" | "base";
  userId: string;
  amount: string;
}) {
  (async () => {
    try {
      const isEth = toChain === "ethereum";
      const targetChain = isEth ? sepolia : baseSepolia;
      const rpcUrl = getRpcUrl(isEth ? "ethereum-sepolia" : "base-sepolia");
      const messageTransmitter = isEth
        ? CONTRACT_ADDRESSES.cctp.testnet.ethereum.messageTransmitter
        : CONTRACT_ADDRESSES.cctp.testnet.base.messageTransmitter;

      const sponsoredKey = process.env.SPONSORED_FEE_EVM_KEY;
      if (!sponsoredKey) {
        console.warn("[Relayer] No SPONSORED_FEE_EVM_KEY found in env; skipping auto-mint.");
        return;
      }

      const account = privateKeyToAccount(sponsoredKey as `0x${string}`);
      const publicClient = createPublicClient({ chain: targetChain, transport: http(rpcUrl) });
      const walletClient = createWalletClient({ account, chain: targetChain, transport: http(rpcUrl) });

      let attempts = 0;
      let msgObj: any = null;

      // Poll Iris sandbox for up to ~2 minutes
      while (attempts < 40) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const res = await fetch(
            `https://iris-api-sandbox.circle.com/v2/messages/27?transactionHash=${txHash}`,
            { headers: { Accept: "application/json" }, cache: "no-store" },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.messages?.[0]?.status === "complete") {
              msgObj = data.messages[0];
              break;
            }
          }
        } catch {}
        attempts++;
      }

      if (!msgObj || !msgObj.message || !msgObj.attestation) {
        console.warn("[Relayer] Iris attestation timeout for:", txHash);
        return;
      }

      if (msgObj.destinationMintTxHash) {
        console.log("[Relayer] Already minted on destination:", msgObj.destinationMintTxHash);
        return;
      }

      console.log(`[Relayer] Attestation ready! Minting on ${isEth ? "Ethereum Sepolia" : "Base Sepolia"}...`);

      const messageTransmitterAbi = [
        {
          type: "function",
          name: "receiveMessage",
          inputs: [
            { name: "message", type: "bytes" },
            { name: "attestation", type: "bytes" },
          ],
          outputs: [{ name: "success", type: "bool" }],
          stateMutability: "nonpayable",
        },
      ] as const;

      const mintHash = await walletClient.writeContract({
        address: messageTransmitter,
        abi: messageTransmitterAbi,
        functionName: "receiveMessage",
        args: [msgObj.message as `0x${string}`, msgObj.attestation as `0x${string}`],
      });

      console.log("[Relayer] receiveMessage broadcasted! Hash:", mintHash);
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      console.log("[Relayer] Mint confirmed on-chain!");

      await connectDB();
      await Transaction.findOneAndUpdate(
        { txHash },
        {
          $set: {
            status: "CONFIRMED",
            "bridgeDetails.mintTxHash": mintHash,
            "bridgeDetails.mintExplorerUrl": getExplorerTxUrl(toChain, mintHash, true),
          },
        },
      );

      invalidateBalanceCache(userId);

      await createNotification({
        userId,
        tab: "transactions",
        title: "Bridge Completed",
        body: `${amount} USDC has arrived on ${isEth ? "Ethereum Sepolia" : "Base Sepolia"}!`,
        type: "FUNDS_RECEIVED",
      }).catch(() => null);
    } catch (err) {
      console.error("[Relayer Execution Error]", err);
    }
  })();
}
