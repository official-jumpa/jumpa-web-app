import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { withAuth } from "@/lib/withAuth";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { getRawSavingsPlanById } from "@/lib/functions/savingsFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { withdrawSavingsSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
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
    const body = await req.json().catch(() => ({}));

    const planId = searchParams.get("id") || body.id || body.planId;
    const validation = withdrawSavingsSchema.safeParse({ ...body, planId });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { amount, pin } = validation.data;

    const [wallet, plan] = await Promise.all([
      findWalletForUser(userId),
      getRawSavingsPlanById(validation.data.planId, userId),
    ]);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Savings plan not found" },
        { status: 404 },
      );
    }

    const withdrawAmount = amount ?? plan.currentAmount;
    if (withdrawAmount > plan.currentAmount) {
      return NextResponse.json(
        {
          error: `Requested amount ($${withdrawAmount}) exceeds plan balance ($${plan.currentAmount})`,
        },
        { status: 400 },
      );
    }

    // 1. Verify 6-digit PIN
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      return NextResponse.json(
        { error: pinCheck.error },
        { status: pinCheck.status },
      );
    }

    // 2. Early withdrawal penalty check
    let penaltyFee = 0;
    const now = new Date();
    if (plan.kind === "lock" && plan.endDate && now < new Date(plan.endDate)) {
      const penaltyPercent = plan.penaltyFeePercent || 5;
      penaltyFee = Number(((withdrawAmount * penaltyPercent) / 100).toFixed(2));
    }

    const netPayout = Number((withdrawAmount - penaltyFee).toFixed(2));
    const stellarAddress = wallet.addresses?.xlm || wallet.address;

    // 3. Decrypt credentials & derive keypair
    let secret: string;
    try {
      secret = decryptMnemonic(
        wallet.encryptedMnemonic,
        wallet.iv,
        wallet.salt,
        pin,
      );
    } catch {
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

    // 4. Request DeFindex withdrawal transaction
    let txHash: string | undefined;
    let explorerUrl: string | undefined;

    try {
      const netPayoutStroops = Math.round(netPayout * 10_000_000);
      const withdrawRes = await defindexClient.withdraw(plan.vaultAddress, {
        amounts: [netPayoutStroops],
        caller: stellarAddress,
      });


      if (withdrawRes?.xdr) {
        const tx = StellarSdk.TransactionBuilder.fromXDR(
          withdrawRes.xdr,
          StellarSdk.Networks.TESTNET,
        );
        tx.sign(userKeypair);

        const sendRes = await defindexClient.send(tx.toXDR());
        txHash = sendRes.txHash;
        explorerUrl = getExplorerTxUrl("stellar", txHash, true);
      }
    } catch (onChainErr: any) {
      console.warn(
        `[POST /api/savings/withdraw] On-chain DeFindex withdraw failed or bypassed in testnet:`,
        onChainErr?.message || onChainErr,
      );
    }

    // 5. Update Plan Balance in MongoDB
    const remainingBalance = Math.max(0, (plan.currentAmount || 0) - withdrawAmount);
    plan.currentAmount = remainingBalance;
    if (remainingBalance === 0) {
      plan.status = "Closed";
    }
    if (txHash && !plan.txHashes.includes(txHash)) {
      plan.txHashes.push(txHash);
    }
    await plan.save();

    // 6. Record Transaction in DB via transactionFunctions
    await createTransactionRecord({
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
        penaltyFee: penaltyFee > 0 ? String(penaltyFee) : undefined,
      },
      executedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      withdrawnAmount: withdrawAmount,
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
