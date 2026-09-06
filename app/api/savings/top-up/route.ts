import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { withAuth } from "@/lib/withAuth";
import { Wallet } from "@/models/Wallet";
import { SavingsPlan } from "@/models/SavingsPlan";
import { Transaction } from "@/models/Transaction";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { decryptMnemonic } from "@/lib/crypto";
import {
  deriveStellarKeypairFromMnemonic,
  deriveStellarKeypairFromPrivateKey,
  ensureStellarTrustline,
} from "@/lib/chains/stellar";
import { DefindexClient } from "@/lib/chains/stellar/defindex-client";
import { environment } from "@/lib/environment";
import { formatPlanForUI } from "@/lib/savings-service";
import { getExplorerTxUrl, CONTRACT_ADDRESSES } from "@/lib/blockchain";

const defindexClient = new DefindexClient(
  environment.DEFINDEX_API_KEY,
  environment.DEFINDEX_BASE_URL,
  "testnet",
);

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();

    const planId = searchParams.get("id") || body.id || body.planId;
    const amount = Number(body.amount);
    const pin = body.pin;

    console.log("[POST /api/savings/top-up] Received request:", {
      userId,
      planId,
      topUpAmount: amount,
    });

    if (!planId) {
      console.warn("[POST /api/savings/top-up] Error: Plan ID is required");
      return NextResponse.json(
        { error: "Plan ID is required (?id=...)" },
        { status: 400 },
      );
    }

    if (!amount || amount <= 0) {
      console.warn("[POST /api/savings/top-up] Error: Invalid amount:", amount);
      return NextResponse.json(
        { error: "Valid top-up amount is required" },
        { status: 400 },
      );
    }

    if (!pin || pin.length !== 6) {
      console.warn("[POST /api/savings/top-up] Error: Invalid PIN format");
      return NextResponse.json(
        { error: "6-digit PIN is required" },
        { status: 400 },
      );
    }

    const [wallet, plan] = await Promise.all([
      Wallet.findOne({ userId }),
      SavingsPlan.findOne({ _id: planId, userId }),
    ]);

    if (!wallet) {
      console.warn("[POST /api/savings/top-up] Error: Wallet not found for user:", userId);
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 },
      );
    }

    if (!plan) {
      console.warn(`[POST /api/savings/top-up] Error: Savings plan ${planId} not found for user ${userId}`);
      return NextResponse.json(
        { error: "Savings plan not found" },
        { status: 404 },
      );
    }

    if (plan.kind === "lock") {
      console.warn(`[POST /api/savings/top-up] Error: Attempted to top up locked plan ${planId}`);
      return NextResponse.json(
        { error: "Locked savings plans cannot be topped up. Funds remain locked until maturity." },
        { status: 400 },
      );
    }

    console.log("[POST /api/savings/top-up] Plan & Wallet details:", {
      planId: plan._id,
      planName: plan.name,
      planKind: plan.kind,
      currency: plan.currency,
      vaultAddress: plan.vaultAddress,
      currentBalance: plan.currentAmount,
      targetAmount: plan.targetAmount,
      stellarAddress: wallet.addresses?.xlm || wallet.address,
    });

    // 1. Verify 6-digit PIN
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      console.warn("[POST /api/savings/top-up] PIN verification failed:", pinCheck.error);
      return NextResponse.json(
        { error: pinCheck.error },
        { status: pinCheck.status },
      );
    }

    // 2. Decrypt wallet credentials
    let secret: string;
    try {
      secret = decryptMnemonic(
        wallet.encryptedMnemonic,
        wallet.iv,
        wallet.salt,
        pin,
      );
    } catch (decErr) {
      console.error("[POST /api/savings/top-up] Decryption failed:", decErr);
      return NextResponse.json(
        { error: "Failed to decrypt wallet credentials" },
        { status: 401 },
      );
    }

    const keys =
      wallet.setupMethod === "IMPORTED_PRIVATE_KEY"
        ? deriveStellarKeypairFromPrivateKey(secret)
        : deriveStellarKeypairFromMnemonic(secret);

    const userKeypair = StellarSdk.Keypair.fromSecret(keys.secretKey);
    const stellarAddress = wallet.addresses?.xlm || wallet.address;
    const amountStroops = Math.round(amount * 10_000_000);

    // Auto-ensure Circle USDC trustline is active on the account
    await ensureStellarTrustline(
      userKeypair,
      new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.testnet.USDC),
      "testnet",
    );

    console.log(`[POST /api/savings/top-up] Requesting DeFindex deposit for ${amountStroops} stroops ($${amount.toFixed(2)}) into vault ${plan.vaultAddress} from ${stellarAddress}...`);

    // 3. Execute top-up deposit on DeFindex
    const depositRes = await defindexClient.deposit(plan.vaultAddress, {
      amounts: [amountStroops],
      caller: stellarAddress,
      invest: true,
      slippageBps: 50,
    });

    if (!depositRes.xdr) {
      console.error("[POST /api/savings/top-up] DeFindex failed to return deposit XDR:", depositRes);
      throw new Error("DeFindex failed to generate top-up transaction");
    }

    const tx = StellarSdk.TransactionBuilder.fromXDR(
      depositRes.xdr,
      StellarSdk.Networks.TESTNET,
    );
    tx.sign(userKeypair);

    console.log("[POST /api/savings/top-up] Broadcasting signed transaction to Stellar Testnet...");
    const sendRes = await defindexClient.send(tx.toXDR());
    const txHash = sendRes.txHash;
    const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

    console.log("[POST /api/savings/top-up] On-chain deposit confirmed! TxHash:", txHash);

    // 4. Update SavingsPlan in MongoDB
    const oldBalance = plan.currentAmount || 0;
    const newTotal = oldBalance + amount;
    plan.currentAmount = newTotal;
    if (txHash && !plan.txHashes.includes(txHash)) {
      plan.txHashes.push(txHash);
    }
    await plan.save();

    console.log("[POST /api/savings/top-up] Updated DB plan balance:", {
      planId: plan._id,
      previousBalance: oldBalance,
      addedAmount: amount,
      newTotalBalance: newTotal,
    });

    // 5. Record Transaction
    await Transaction.create({
      userId,
      walletId: wallet._id,
      type: "SAVINGS_DEPOSIT",
      status: "CONFIRMED",
      chain: "stellar",
      network: "testnet",
      fromAddress: stellarAddress,
      toAddress: plan.vaultAddress,
      amount: String(amount),
      token: plan.currency || "USDC",
      memo: `savings:topup:${plan._id}`,
      txHash,
      explorerUrl,
      savingsDetails: {
        planId: plan._id,
        vaultAddress: plan.vaultAddress,
      },
      executedAt: new Date(),
    });

    console.log("[POST /api/savings/top-up] Transaction saved to DB. Returning success response.");

    return NextResponse.json({
      ok: true,
      plan: formatPlanForUI(plan),
      txHash,
      explorerUrl,
    });
  } catch (err: any) {
    console.error("[POST /api/savings/top-up] Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process top-up" },
      { status: 500 },
    );
  }
});
