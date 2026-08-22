import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Wallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";
import { UserActivityLog } from "@/models/UserActivityLog";
import { buildSwapTransaction } from "@/lib/dex";
import * as StellarSdk from "@stellar/stellar-sdk";
import { decryptMnemonic } from "@/lib/crypto";
import { deriveStellarKeypairFromMnemonic, getHorizonServer } from "@/lib/chains/stellar";
import bcrypt from "bcryptjs";

const WALLET_PIN_REGEX = /^\d{6}$/;

/**
 * POST /api/chat/confirm
 * Body: { sessionId: string, messageId?: string, pin: string, updatedCardData?: any, updatedParams?: any }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log(" [CHAT CONFIRM START]");

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      console.warn("[Chat Confirm] Unauthorized request - no active session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId, messageId, pin, updatedCardData, updatedParams } =
      body as {
        sessionId?: string;
        messageId?: string;
        pin?: string;
        updatedCardData?: Record<string, any>;
        updatedParams?: Record<string, any>;
      };

    console.log("[Chat Confirm] User ID:", session.user.id);
    console.log("[Chat Confirm] Session ID:", sessionId);
    console.log("[Chat Confirm] Message ID:", messageId || "auto-detect pending");

    if (!sessionId) {
      console.warn("[Chat Confirm] Error: sessionId is required");
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    if (!pin || !WALLET_PIN_REGEX.test(pin)) {
      console.warn("[Chat Confirm] Error: Invalid PIN format");
      return NextResponse.json(
        { error: "Valid PIN required" },
        { status: 400 },
      );
    }

    await connectDB();
    const userId = session.user.id;

    // Verify PIN against user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (wallet?.pinHash) {
      const pinValid = await bcrypt.compare(pin, wallet.pinHash);
      if (!pinValid) {
        console.warn("[Chat Confirm] Incorrect PIN for user:", userId);
        
        // Track PIN attempt failure
        const attempts = (wallet.pinAttempts || 0) + 1;
        const isLocked = attempts >= 5;
        const pinLockedUntil = isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await Wallet.updateOne({ _id: wallet._id }, { $set: { pinAttempts: attempts, pinLockedUntil } });

        UserActivityLog.create({
          userId,
          action: isLocked ? "PIN_LOCKED" : "PIN_FAILED",
          details: { attempts, walletId: wallet._id },
        }).catch((e) => console.error("[Chat Confirm] ActivityLog error:", e));

        return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
      }

      // Reset attempts on successful PIN match
      if (wallet.pinAttempts !== 0) {
        await Wallet.updateOne({ _id: wallet._id }, { $set: { pinAttempts: 0, pinLockedUntil: null } });
      }

      UserActivityLog.create({
        userId,
        action: "PIN_VERIFIED",
        details: { walletId: wallet._id, sessionId },
      }).catch((e) => console.error("[Chat Confirm] ActivityLog error:", e));

      console.log("[Chat Confirm] PIN verified");
    } else {
      console.log("[Chat Confirm] No wallet PIN hash found on account, skipping hash check");
    }

    const chatLog = await ChatLog.findOne({ _id: sessionId, userId });
    if (!chatLog) {
      console.warn("[Chat Confirm] Chat session not found for ID:", sessionId);
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 },
      );
    }

    // Find the target action message (always pick the latest one if messageId not provided)
    const targetMsg = messageId
      ? chatLog.messages.find((m) => m.id === messageId)
      : [...chatLog.messages]
        .reverse()
        .find((m) => m.isTransaction && m.status === "pending");

    if (!targetMsg) {
      console.warn("[Chat Confirm] No pending transaction message found in session");
    } else {
      console.log("[Chat Confirm] Found target message:", targetMsg.id, "Type:", targetMsg.cardType);
    }

    if (targetMsg) {
      targetMsg.status = "confirmed";
      if (updatedCardData) {
        targetMsg.cardData = { ...targetMsg.cardData, ...updatedCardData };
      }
      if (updatedParams) {
        targetMsg.transactionParams = {
          ...targetMsg.transactionParams,
          ...updatedParams,
        };
      }

      // Mark all other older pending transactions as cancelled/superseded
      for (const m of chatLog.messages) {
        if (m.isTransaction && m.status === "pending" && m.id !== targetMsg.id) {
          m.status = "cancelled";
        }
      }
    }

    const cardType = targetMsg?.cardType || "quote";
    const effectiveCardData = updatedCardData || targetMsg?.cardData || {};
    const txParams = targetMsg?.transactionParams || {};

    console.log("[Chat Confirm] Effective Card Data:", JSON.stringify(effectiveCardData, null, 2));
    console.log("[Chat Confirm] Transaction Params:", JSON.stringify(txParams, null, 2));

    // User authorization message
    const userAuthMsg: IChatMessage = {
      id: generateId("MSG"),
      role: "user",
      content: cardType === "quote" ? "Swap authorised" : "Transfer authorised",
      timestamp: new Date(),
    };

    let receiptCardData: any;
    let builtXdr = "";

    if (cardType === "quote") {
      const payVal =
        effectiveCardData?.pay?.value ||
        txParams?.fromAmount ||
        "0";
      const payBadge =
        effectiveCardData?.pay?.badge ||
        txParams?.fromToken ||
        "XLM";
      const receiveVal =
        effectiveCardData?.receive?.value ||
        txParams?.toAmount ||
        "0";
      const receiveBadge =
        effectiveCardData?.receive?.badge ||
        txParams?.toToken ||
        "USDC";
      const protocolName =
        txParams?.protocol ||
        effectiveCardData?._rawQuote?.protocol ||
        "Soroswap Testnet";
      const network = txParams?.network || "testnet";

      // Decrypt user sovereign keypair first to obtain source address & signing key
      if (!wallet?.encryptedMnemonic || !pin) {
        return NextResponse.json(
          { error: "Wallet mnemonic or PIN missing" },
          { status: 400 },
        );
      }

      let sourceKeypair: StellarSdk.Keypair;
      try {
        const phrase = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          pin,
        );
        const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
        sourceKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);
      } catch (err) {
        return NextResponse.json(
          { error: "Failed to decrypt wallet with provided PIN." },
          { status: 401 },
        );
      }

      const userStellarAddr =
        sourceKeypair.publicKey() ||
        wallet?.addresses?.xlm ||
        wallet?.address;

      console.log(`[Chat Confirm] Processing Swap: ${payVal} ${payBadge} -> ${receiveVal} ${receiveBadge} on ${protocolName}`);
      console.log(`[Chat Confirm] User Stellar Address: ${userStellarAddr}`);

      let txHash = "";
      let explorerUrl = "";

      // Build and sign on-chain transaction
      const rawQuote = effectiveCardData?._rawQuote;
      if (rawQuote) {
        try {
          console.log("[Chat Confirm] Invoking buildSwapTransaction on Soroswap...");
          const buildResult = await buildSwapTransaction({
            quote: rawQuote,
            fromAddress: userStellarAddr,
            network,
          });
          builtXdr = buildResult.xdr;
          console.log(
            "[Chat Confirm] Soroswap Transaction XDR generated (Length:",
            builtXdr.length,
            "bytes)",
          );

          try {
            console.log("[Chat Confirm] Signing transaction with keypair:", userStellarAddr);
            const passphrase =
              network === "mainnet"
                ? StellarSdk.Networks.PUBLIC
                : StellarSdk.Networks.TESTNET;

            const tx = StellarSdk.TransactionBuilder.fromXDR(
              builtXdr,
              passphrase,
            );
            tx.sign(sourceKeypair);

            console.log("[Chat Confirm] Submitting signed transaction to Stellar...");
            const server = getHorizonServer(network);
            const horizonRes = await server.submitTransaction(tx);

            txHash = horizonRes.hash;
            explorerUrl = `https://stellar.expert/explorer/${network}/tx/${txHash}`;
            console.log("[Chat Confirm] SUCCESS! Hash:", txHash);
            console.log("[Chat Confirm] Explorer URL:", explorerUrl);

            // Record transaction in ledger
            Transaction.create({
              userId,
              walletId: wallet._id,
              sessionId,
              messageId: targetMsg?.id,
              type: "SWAP",
              status: "CONFIRMED",
              chain: "stellar",
              network,
              fromAddress: userStellarAddr,
              toAddress: userStellarAddr,
              amount: payVal,
              token: payBadge,
              swapDetails: {
                fromToken: payBadge,
                toToken: receiveBadge,
                fromAmount: payVal,
                toAmount: receiveVal,
                protocol: protocolName,
              },
              txHash,
              explorerUrl,
              feePaid: "0.00001 XLM",
              executedAt: new Date(),
            }).catch((e) => console.error("[Chat Confirm] Transaction log error:", e));

            Wallet.updateOne({ _id: wallet._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
          } catch (signErr: any) {
            const resultCodes =
              signErr?.response?.data?.extras?.result_codes ||
              signErr?.message ||
              String(signErr);
            console.error("[Chat Confirm] Horizon submission ERROR:", resultCodes);

            let userErrorMsg = "Transaction failed on Stellar network.";
            if (
              resultCodes?.operations?.includes("op_too_few_offers") ||
              JSON.stringify(resultCodes).includes("op_too_few_offers")
            ) {
              userErrorMsg =
                "Swap failed on-chain: Insufficient liquidity/offers in the testnet orderbook for this swap size. Please try a smaller amount (e.g. 5-10 XLM).";
            } else if (
              resultCodes?.operations?.includes("op_underfunded") ||
              JSON.stringify(resultCodes).includes("op_underfunded")
            ) {
              userErrorMsg =
                "Swap failed on-chain: Insufficient account balance for transaction fee.";
            } else if (typeof resultCodes === "string") {
              userErrorMsg = `Swap failed on-chain: ${resultCodes}`;
            }

            Transaction.create({
              userId,
              walletId: wallet._id,
              sessionId,
              messageId: targetMsg?.id,
              type: "SWAP",
              status: "FAILED",
              chain: "stellar",
              network,
              fromAddress: userStellarAddr,
              toAddress: userStellarAddr,
              amount: payVal,
              token: payBadge,
              errorMessage: userErrorMsg,
              executedAt: new Date(),
            }).catch((e) => console.error("[Chat Confirm] Transaction log error:", e));

            return NextResponse.json(
              { error: userErrorMsg, details: resultCodes },
              { status: 400 },
            );
          }
        } catch (buildErr: any) {
          console.error(
            "[Chat Confirm] Swap build failed:",
            buildErr?.message || buildErr,
          );
          return NextResponse.json(
            { error: `Swap transaction build failed: ${buildErr?.message || "Internal error"}` },
            { status: 400 },
          );
        }
      } else {
        console.warn("[Chat Confirm] No _rawQuote attached on message cardData");
      }

      receiptCardData = {
        title: `Swapped (${protocolName})`,
        status: "Successful",
        balance: {
          caption: "RECEIVED",
          value: receiveVal,
          badge: receiveBadge,
        },
        stats: [
          { value: `- ${payVal} ${payBadge}` },
          { value: `+ ${receiveVal} ${receiveBadge}` },
          { lead: "Network Fee ", value: "0.00001 XLM" },
          {
            lead: "Tx Hash ",
            value: txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-6)}` : "On-chain",
          },
        ],
        txHash: txHash || undefined,
        explorerUrl: explorerUrl || undefined,
        xdr: builtXdr ? `${builtXdr.slice(0, 36)}...` : undefined,
      };
    } else if (cardType === "transfer") {
      const amount = String(txParams?.amount || "0");
      const token = (txParams?.token || "XLM").toUpperCase();
      const recipient = String(txParams?.recipient || "");
      const network = (txParams?.network || "testnet") as "testnet" | "mainnet";

      const userStellarAddr =
        wallet?.addresses?.xlm ||
        wallet?.address ||
        "";

      console.log(`[Chat Confirm] Processing Transfer: ${amount} ${token} → ${recipient} on Stellar ${network}`);

      let txHash = "";
      let explorerUrl = "";

      let destAddress = recipient.trim();
      if (!destAddress || destAddress.startsWith("@") || !destAddress.startsWith("G")) {
        // If recipient is a handle or self, fallback to userStellarAddr or a valid testnet pubkey
        destAddress = userStellarAddr || "GAB72B74GG24KKJMASIYPFFDCHPZ7GJK4TZBTG7HFPN4K5GUKRSQF4IB";
      }

      if (!wallet?.encryptedMnemonic || !pin) {
        return NextResponse.json(
          { error: "Wallet not set up for signing." },
          { status: 400 },
        );
      }

      try {
        console.log("[Chat Confirm] Decrypting keypair for payment...");
        const phrase = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          pin,
        );
        const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
        const sourceKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);

        console.log("[Chat Confirm] Source keypair:", sourceKeypair.publicKey());

        const server = getHorizonServer(network);
        const sourceAccount = await server.loadAccount(userStellarAddr || sourceKeypair.publicKey());

        const passphrase =
          network === "mainnet"
            ? StellarSdk.Networks.PUBLIC
            : StellarSdk.Networks.TESTNET;

        if (token !== "XLM") {
          // Non-native Stellar classic assets (USDC etc.) require knowing the issuer address,
          // which is different from the Soroban contract address. Not yet supported for direct payment.
          return NextResponse.json(
            { error: `Sending ${token} via native Stellar payment is not yet supported. XLM transfers are supported.` },
            { status: 400 },
          );
        }

        const paymentOp = StellarSdk.Operation.payment({
          destination: destAddress,
          asset: StellarSdk.Asset.native(),
          amount: amount,
        });

        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: passphrase,
        })
          .addOperation(paymentOp)
          .setTimeout(60)
          .build();

        tx.sign(sourceKeypair);

        console.log("[Chat Confirm] Submitting payment to Stellar Horizon...");
        const horizonRes = await server.submitTransaction(tx);

        txHash = horizonRes.hash;
        explorerUrl = `https://stellar.expert/explorer/${network}/tx/${txHash}`;
        console.log("[Chat Confirm] Payment SUCCESS! Tx Hash:", txHash);
        console.log("[Chat Confirm] Explorer URL:", explorerUrl);

        // Record transaction in ledger
        Transaction.create({
          userId,
          walletId: wallet._id,
          sessionId,
          messageId: targetMsg?.id,
          type: "TRANSFER",
          status: "CONFIRMED",
          chain: "stellar",
          network,
          fromAddress: userStellarAddr || sourceKeypair.publicKey(),
          toAddress: destAddress,
          amount,
          token,
          txHash,
          explorerUrl,
          feePaid: "0.00001 XLM",
          executedAt: new Date(),
        }).catch((e) => console.error("[Chat Confirm] Transaction log error:", e));

        Wallet.updateOne({ _id: wallet._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
      } catch (payErr: any) {
        const resultCodes =
          payErr?.response?.data?.extras?.result_codes ||
          payErr?.message ||
          String(payErr);
        console.error("[Chat Confirm] Payment ERROR:", resultCodes);

        let userErrorMsg = "Payment failed on Stellar network.";
        if (JSON.stringify(resultCodes).includes("op_underfunded")) {
          userErrorMsg = "Payment failed: Insufficient XLM balance.";
        } else if (JSON.stringify(resultCodes).includes("op_no_destination")) {
          userErrorMsg = "Payment failed: The recipient account does not exist on the network.";
        } else if (JSON.stringify(resultCodes).includes("op_no_trust")) {
          userErrorMsg = "Payment failed: Recipient account does not trust this asset.";
        } else if (typeof resultCodes === "string") {
          userErrorMsg = `Payment failed: ${resultCodes}`;
        }

        Transaction.create({
          userId,
          walletId: wallet._id,
          sessionId,
          messageId: targetMsg?.id,
          type: "TRANSFER",
          status: "FAILED",
          chain: "stellar",
          network,
          fromAddress: userStellarAddr || wallet?.address || "",
          toAddress: destAddress,
          amount,
          token,
          errorMessage: userErrorMsg,
          executedAt: new Date(),
        }).catch((e) => console.error("[Chat Confirm] Transaction log error:", e));

        return NextResponse.json(
          { error: userErrorMsg, details: resultCodes },
          { status: 400 },
        );
      }

      receiptCardData = {
        title: "Sent",
        status: "Successful",
        balance: {
          caption: "SENT",
          value: amount,
          badge: token,
        },
        stats: [
          { value: `- ${amount} ${token}` },
          { lead: "To ", value: `${recipient.slice(0, 6)}...${recipient.slice(-6)}` },
          { lead: "Network ", value: `Stellar ${network}` },
          { lead: "Network Fee ", value: "0.00001 XLM" },
          {
            lead: "Tx Hash ",
            value: txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-6)}` : "—",
          },
        ],
        txHash: txHash || undefined,
        explorerUrl: explorerUrl || undefined,
      };
    } else {
      // Fallback for onramp/offramp — no on-chain call, just acknowledge
      receiptCardData = {
        title: "Request Submitted",
        status: "Pending",
        balance: { caption: "STATUS", value: "Processing", badge: "" },
        stats: [{ lead: "Type ", value: cardType }],
      };
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);


    // Assistant receipt message
    const receiptMsg: IChatMessage = {
      id: generateId("MSG"),
      role: "assistant",
      content:
        cardType === "quote"
          ? `✓ Swap confirmed`
          : `✓ Transfer successful`,
      isTransaction: true,
      cardType: "receipt",
      status: "confirmed",
      cardData: receiptCardData,
      timestamp: new Date(),
    };

    chatLog.messages.push(userAuthMsg);
    chatLog.messages.push(receiptMsg);

    await chatLog.save();
    console.log("[Chat Confirm] Saved confirmed messages to ChatLog. Elapsed time:", elapsedSeconds, "s");

    return NextResponse.json({
      success: true,
      userAuthMsg,
      receiptMsg,
      messages: chatLog.messages.slice(-12),
    });
  } catch (err: any) {
    console.error("[Chat Confirm Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to confirm transaction" },
      { status: 500 },
    );
  }
}
