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
} from "@/lib/chains/stellar";
import { DefindexClient } from "@/lib/chains/stellar/defindex-client";
import { environment } from "@/lib/environment";
import { formatPlanForUI } from "@/lib/savings-service";
import { getExplorerTxUrl } from "@/lib/blockchain";

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

    console.log("[POST /api/savings/withdraw] Received request:", {
      userId,
      planId,
      requestedAmount: amount,
    });

    if (!planId) {
      console.warn("[POST /api/savings/withdraw] Error: Plan ID is required");
      return NextResponse.json(
        { error: "Plan ID is required (?id=...)" },
        { status: 400 },
      );
    }

    if (!amount || amount <= 0) {
      console.warn("[POST /api/savings/withdraw] Error: Invalid amount:", amount);
      return NextResponse.json(
        { error: "Valid withdrawal amount is required" },
        { status: 400 },
      );
    }

    if (!pin || pin.length !== 6) {
      console.warn("[POST /api/savings/withdraw] Error: Invalid PIN format");
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
      console.warn("[POST /api/savings/withdraw] Error: Wallet not found for user:", userId);
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (!plan) {
      console.warn(`[POST /api/savings/withdraw] Error: Savings plan ${planId} not found for user ${userId}`);
      return NextResponse.json(
        { error: "Savings plan not found" },
        { status: 404 },
      );
    }

    if (amount > plan.currentAmount) {
      console.warn(`[POST /api/savings/withdraw] Error: Amount $${amount} exceeds plan balance $${plan.currentAmount}`);
      return NextResponse.json(
        {
          error: `Requested amount ($${amount}) exceeds plan balance ($${plan.currentAmount})`,
        },
        { status: 400 },
      );
    }

    // 1. Verify 6-digit PIN
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      console.warn("[POST /api/savings/withdraw] PIN verification failed:", pinCheck.error);
      return NextResponse.json(
        { error: pinCheck.error },
        { status: pinCheck.status },
      );
    }

    // 2. Check Early Break Fee rules (5% if broken before maturity date)
    const now = new Date();
    const isEarlyBreak = Boolean(
      plan.endDate &&
      new Date(plan.endDate).getTime() > now.getTime() &&
      plan.kind === "lock"
    );

    let penaltyFee = 0;
    if (isEarlyBreak) {
      penaltyFee = amount * ((plan.penaltyFeePercent || 5) / 100);
    }
    const netPayout = Math.max(0, amount - penaltyFee);
    const netPayoutStroops = Math.round(netPayout * 10_000_000);

    console.log("[POST /api/savings/withdraw] Fee & Payout calculation:", {
      planId: plan._id,
      planName: plan.name,
      planKind: plan.kind,
      planEndDate: plan.endDate,
      currentTime: now.toISOString(),
      isEarlyBreak,
      penaltyPercent: isEarlyBreak ? (plan.penaltyFeePercent || 5) : 0,
      grossAmount: `$${amount.toFixed(2)}`,
      penaltyFee: `$${penaltyFee.toFixed(2)}`,
      netPayout: `$${netPayout.toFixed(2)}`,
      onChainPayoutStroops: netPayoutStroops,
    });

    // 3. Decrypt credentials & derive Stellar Keypair
    let secret: string;
    try {
      secret = decryptMnemonic(
        wallet.encryptedMnemonic,
        wallet.iv,
        wallet.salt,
        pin,
      );
    } catch (decErr) {
      console.error("[POST /api/savings/withdraw] Decryption failed:", decErr);
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

    // 4. Request withdrawal transaction from DeFindex for the net payout amount
    console.log(`[POST /api/savings/withdraw] Requesting DeFindex withdrawal for ${netPayoutStroops} stroops ($${netPayout.toFixed(2)}) from vault ${plan.vaultAddress} to ${stellarAddress}...`);
    const withdrawRes = await defindexClient.withdraw(plan.vaultAddress, {
      amounts: [netPayoutStroops],
      caller: stellarAddress,
    });

    if (!withdrawRes.xdr) {
      console.error("[POST /api/savings/withdraw] DeFindex failed to return withdrawal XDR:", withdrawRes);
      throw new Error("DeFindex failed to generate withdrawal transaction");
    }

    const tx = StellarSdk.TransactionBuilder.fromXDR(
      withdrawRes.xdr,
      StellarSdk.Networks.TESTNET,
    );
    tx.sign(userKeypair);

    console.log("[POST /api/savings/withdraw] Broadcasting signed withdrawal transaction to Stellar Testnet...");
    const sendRes = await defindexClient.send(tx.toXDR());
    const txHash = sendRes.txHash;
    const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

    console.log("[POST /api/savings/withdraw] On-chain broadcast succeeded! TxHash:", txHash);

    // 5. Update Plan Balance in MongoDB (deducting full gross amount)
    const remainingBalance = Math.max(0, (plan.currentAmount || 0) - amount);
    plan.currentAmount = remainingBalance;
    if (remainingBalance === 0) {
      plan.status = "Closed";
    }
    if (txHash && !plan.txHashes.includes(txHash)) {
      plan.txHashes.push(txHash);
    }
    await plan.save();

    console.log("[POST /api/savings/withdraw] Updated DB plan:", {
      planId: plan._id,
      previousBalance: (plan.currentAmount || 0) + amount,
      deductedGross: amount,
      remainingBalance,
      status: plan.status,
    });

    // 6. Record Transaction in DB
    await Transaction.create({
      userId,
      walletId: wallet._id,
      type: "SAVINGS_WITHDRAW",
      status: "CONFIRMED",
      chain: "stellar",
      network: "testnet",
      fromAddress: plan.vaultAddress,
      toAddress: stellarAddress,
      amount: String(netPayout),
      token: plan.currency || "USDC",
      memo: `savings:withdraw:${plan._id}`,
      txHash,
      explorerUrl,
      savingsDetails: {
        planId: plan._id,
        vaultAddress: plan.vaultAddress,
        grossAmount: String(amount),
        penaltyFee: penaltyFee > 0 ? String(penaltyFee) : undefined,
      },
      executedAt: new Date(),
    });

    console.log("[POST /api/savings/withdraw] Complete! Returning response to client.");

    return NextResponse.json({
      ok: true,
      withdrawnAmount: amount,
      penaltyFee,
      netPayout,
      plan: formatPlanForUI(plan),
      txHash,
      explorerUrl,
    });
  } catch (err: any) {
    console.error("[POST /api/savings/withdraw] Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process withdrawal" },
      { status: 500 },
    );
  }
});
