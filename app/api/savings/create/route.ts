import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { withAuth } from "@/lib/withAuth";
import { Wallet } from "@/models/Wallet";
import { User } from "@/models/User";
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
    const body = await req.json();
    const {
      kind = "individual",
      name,
      category = "Other",
      targetAmount,
      depositAmount = 0,
      term = "30 DAYS",
      startDate,
      endDate,
      frequency = "Weekly",
      debitDay,
      fundingSource = "crypto",
      pin,
    } = body;

    console.log("[POST /api/savings/create] Request received:", {
      userId,
      kind,
      name,
      targetAmount,
      depositAmount,
      term,
      frequency,
      fundingSource,
    });

    if (!name?.trim()) {
      console.warn("[POST /api/savings/create] Validation error: Goal name is required");
      return NextResponse.json(
        { error: "Goal name is required" },
        { status: 400 },
      );
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      console.warn("[POST /api/savings/create] Validation error: Invalid target amount:", targetAmount);
      return NextResponse.json(
        { error: "Valid target amount is required" },
        { status: 400 },
      );
    }

    if (!pin || pin.length !== 6) {
      console.warn("[POST /api/savings/create] Validation error: Invalid PIN format");
      return NextResponse.json(
        { error: "6-digit PIN is required" },
        { status: 400 },
      );
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.warn("[POST /api/savings/create] Wallet not found for user:", userId);
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 404 },
      );
    }

    // 1. Verify 6-digit PIN
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      console.warn("[POST /api/savings/create] PIN verification failed:", pinCheck.error);
      return NextResponse.json(
        { error: pinCheck.error },
        { status: pinCheck.status },
      );
    }

    // 2. Resolve target vault address
    const vaultAddress =
      kind === "lock"
        ? environment.DEFINDEX_LOCK_VAULT_ADDRESS
        : environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;

    if (!vaultAddress) {
      console.error("[POST /api/savings/create] Vault address not configured in environment");
      return NextResponse.json(
        { error: "DeFindex vault address not configured" },
        { status: 500 },
      );
    }

    const stellarAddress = wallet.addresses?.xlm || wallet.address;
    let txHash: string | undefined;
    let initialShares = "0";
    const numDeposit = Number(depositAmount) || 0;

    console.log("[POST /api/savings/create] Plan setup:", {
      kind,
      vaultAddress,
      stellarAddress,
      numDeposit,
    });

    // 3. Execute initial deposit on Stellar Testnet if depositAmount > 0
    if (numDeposit > 0) {
      let secret: string;
      try {
        secret = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          pin,
        );
      } catch (decErr) {
        console.error("[POST /api/savings/create] Decryption failed:", decErr);
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
      const amountStroops = Math.round(numDeposit * 10_000_000);

      // Auto-ensure Circle USDC trustline is active on the account
      await ensureStellarTrustline(
        userKeypair,
        new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.testnet.USDC),
        "testnet",
      );

      console.log(`[POST /api/savings/create] Requesting DeFindex deposit of ${amountStroops} stroops ($${numDeposit.toFixed(2)}) into vault ${vaultAddress}...`);

      // Request unsigned deposit XDR from DeFindex
      const depositRes = await defindexClient.deposit(vaultAddress, {
        amounts: [amountStroops],
        caller: stellarAddress,
        invest: true,
        slippageBps: 50,
      });

      if (!depositRes.xdr) {
        console.error("[POST /api/savings/create] DeFindex failed to return deposit XDR:", depositRes);
        throw new Error("DeFindex failed to generate deposit transaction");
      }

      // Sign XDR
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        depositRes.xdr,
        StellarSdk.Networks.TESTNET,
      );
      tx.sign(userKeypair);

      console.log("[POST /api/savings/create] Broadcasting deposit transaction to Stellar Testnet...");
      const sendRes = await defindexClient.send(tx.toXDR());
      txHash = sendRes.txHash;
      initialShares = String(sendRes.dfTokens || amountStroops);
      const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

      console.log(`[POST /api/savings/create] Deposit broadcasted! TxHash: ${txHash}, Explorer: ${explorerUrl}`);

      // Record in Transaction collection
      await Transaction.create({
        userId,
        walletId: wallet._id,
        type: "SAVINGS_DEPOSIT",
        status: "CONFIRMED",
        chain: "stellar",
        network: "testnet",
        fromAddress: stellarAddress,
        toAddress: vaultAddress,
        amount: String(numDeposit),
        token: "USDC",
        memo: `savings:create`,
        txHash,
        explorerUrl,
        savingsDetails: {
          vaultAddress,
          shares: initialShares,
        },
        executedAt: new Date(),
      });
    }

    // 4. Save SavingsPlan in MongoDB
    const plan = await SavingsPlan.create({
      userId,
      walletId: wallet._id,
      walletAddress: stellarAddress,
      kind,
      name: name.trim(),
      category,
      targetAmount: Number(targetAmount),
      currentAmount: numDeposit,
      currency: "USDC",
      chain: "stellar",
      vaultAddress,
      sharesOwned: initialShares,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      term,
      frequency,
      debitDay,
      fundingSource,
      status: "Active",
      penaltyFeePercent: 5,
      txHashes: txHash ? [txHash] : [],
    });

    console.log(`[POST /api/savings/create] Plan saved to MongoDB with ID: ${plan._id}`);

    // 5. Update user flag hasCreatedSavings
    await User.updateOne(
      { _id: userId },
      { $set: { hasCreatedSavings: true } },
    ).catch((err) => console.warn("[SavingsCreate] Failed to update hasCreatedSavings:", err));

    return NextResponse.json(
      {
        ok: true,
        plan: formatPlanForUI(plan),
        txHash,
        explorerUrl: txHash
          ? getExplorerTxUrl("stellar", txHash, true)
          : undefined,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[POST /api/savings/create] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create savings plan" },
      { status: 500 },
    );
  }
});
