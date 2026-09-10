import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { withAuth } from "@/lib/withAuth";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { getRawSavingsPlanById } from "@/lib/functions/savingsFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { topUpSavingsSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { decryptMnemonic } from "@/lib/crypto";
import {
  deriveStellarKeypairFromMnemonic,
  deriveStellarKeypairFromPrivateKey,
  ensureStellarTrustline,
} from "@/lib/chains/stellar";
import { fetchStellarBalances } from "@/lib/chains/stellar/account";
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
    const body = await req.json().catch(() => ({}));

    const planId = searchParams.get("id") || body.id || body.planId;
    const validation = topUpSavingsSchema.safeParse({ ...body, planId });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { amount, pin } = validation.data;

    const [wallet, plan] = await Promise.all([
      findWalletForUser(userId),
      getRawSavingsPlanById(validation.data.planId, userId),
    ]);

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 },
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Savings plan not found" },
        { status: 404 },
      );
    }

    if (plan.kind === "lock") {
      return NextResponse.json(
        { error: "Locked savings plans cannot be topped up. Funds remain locked until maturity." },
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

    const stellarAddress = wallet.addresses?.xlm || wallet.address;

    // 2. Check balance
    const balances = await fetchStellarBalances(stellarAddress);
    const availableUsdc = Number(balances.testnet.usdc) || 0;
    if (availableUsdc < amount) {
      return NextResponse.json(
        {
          error:
            `Insufficient balance — you have $${availableUsdc.toFixed(2)} USDC ` +
            `and this top-up needs $${amount.toFixed(2)}.`,
        },
        { status: 400 },
      );
    }

    // 3. Decrypt and derive keypair
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

    await ensureStellarTrustline(
      userKeypair,
      new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.testnet.USDC),
      "testnet",
    );

    const amountStroops = Math.round(amount * 10_000_000);
    const depositRes = await defindexClient.deposit(plan.vaultAddress, {
      amounts: [amountStroops],
      caller: stellarAddress,
      invest: true,
      slippageBps: 50,
    });

    if (!depositRes.xdr) {
      throw new Error("DeFindex failed to generate top-up transaction");
    }

    const tx = StellarSdk.TransactionBuilder.fromXDR(
      depositRes.xdr,
      StellarSdk.Networks.TESTNET,
    );
    tx.sign(userKeypair);

    const sendRes = await defindexClient.send(tx.toXDR());
    const txHash = sendRes.txHash;
    const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

    // 4. Update SavingsPlan in MongoDB
    const oldBalance = plan.currentAmount || 0;
    const newTotal = oldBalance + amount;
    plan.currentAmount = newTotal;
    if (txHash && !plan.txHashes.includes(txHash)) {
      plan.txHashes.push(txHash);
    }
    await plan.save();

    // 5. Record Transaction via transactionFunctions
    await createTransactionRecord({
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
