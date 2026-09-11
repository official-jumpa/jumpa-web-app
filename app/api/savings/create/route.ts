import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { withAuth } from "@/lib/withAuth";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { createSavingsPlanRecord } from "@/lib/functions/savingsFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { setUserCreatedSavings } from "@/lib/functions/userFunctions";
import { createSavingsPlanSchema } from "@/lib/validations/savings.validation";
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
    const body = await req.json().catch(() => ({}));
    const validation = createSavingsPlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      kind,
      name,
      category,
      targetAmount,
      depositAmount = 0,
      term,
      startDate,
      endDate,
      frequency,
      debitDay,
      fundingSource,
      pin,
    } = validation.data;

    const wallet = await findWalletForUser(userId);
    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 404 },
      );
    }

    // 1. Verify 4-digit PIN
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
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
      return NextResponse.json(
        { error: "DeFindex vault address not configured" },
        { status: 500 },
      );
    }

    const stellarAddress = wallet.addresses?.xlm || wallet.address;
    let txHash: string | undefined;
    let initialShares = "0";
    const numDeposit = depositAmount;

    // 3. Execute initial deposit on Stellar Testnet if depositAmount > 0
    if (numDeposit > 0) {
      const balances = await fetchStellarBalances(stellarAddress);
      const availableUsdc = Number(balances.testnet.usdc) || 0;
      if (availableUsdc < numDeposit) {
        return NextResponse.json(
          {
            error:
              `Insufficient balance — you have $${availableUsdc.toFixed(2)} USDC ` +
              `and this deposit needs $${numDeposit.toFixed(2)}.`,
          },
          { status: 400 },
        );
      }

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
      const amountStroops = Math.round(numDeposit * 10_000_000);

      // Auto-ensure Circle USDC trustline is active on the account
      await ensureStellarTrustline(
        userKeypair,
        new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.testnet.USDC),
        "testnet",
      );

      // Request unsigned deposit XDR from DeFindex
      const depositRes = await defindexClient.deposit(vaultAddress, {
        amounts: [amountStroops],
        caller: stellarAddress,
        invest: true,
        slippageBps: 50,
      });

      if (!depositRes.xdr) {
        throw new Error("DeFindex failed to generate deposit transaction");
      }

      // Sign XDR
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        depositRes.xdr,
        StellarSdk.Networks.TESTNET,
      );
      tx.sign(userKeypair);

      const sendRes = await defindexClient.send(tx.toXDR());
      txHash = sendRes.txHash;
      initialShares = String(sendRes.dfTokens || amountStroops);
      const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

      // Record in Transaction collection via transactionFunctions
      await createTransactionRecord({
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

    // 4. Save SavingsPlan in MongoDB via savingsFunctions
    const plan = await createSavingsPlanRecord({
      userId,
      walletId: wallet._id,
      walletAddress: stellarAddress,
      kind,
      name,
      category,
      targetAmount: targetAmount || 0,
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

    // 5. Update user flag hasCreatedSavings via userFunctions
    setUserCreatedSavings(userId).catch((err) =>
      console.warn("[SavingsCreate] Failed to update hasCreatedSavings:", err),
    );

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
