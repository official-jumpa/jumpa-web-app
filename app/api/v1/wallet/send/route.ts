import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  findWalletForUser,
  findWalletByAddress,
} from "@/lib/functions/walletFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { dispatchTransactionEmail } from "@/lib/functions/transactionEmailFunctions";
import {
  logUserActivity,
  trackRecent,
} from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { sendTokenSchema } from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { decryptMnemonic } from "@/lib/crypto";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { deriveStellarKeypairFromMnemonic } from "@/lib/chains/stellar";
import { NETWORK_CONFIGS, shortenAddress } from "@/lib/transfer";
import {
  sendStellar,
  sendSolana,
  sendEvm,
  resolveChainPrivateKey,
  type TransferResult,
} from "@/lib/chains/transfer-service";
import { executeTronTokenTransfer } from "@/lib/chains/tron/transfer";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import {
  assertDailyTransactionLimit, isLimitError,
} from "@/lib/functions/transactionLimitFunctions";

/**
 * POST /api/v1/wallet/send
 * Body: { recipient: string, amount: string, asset: string, network: string, memo?: string, pin: string }
 *
 * Broadcasts an on-chain token or native transfer across Stellar, Solana, EVM (Base/Eth), or Tron.
 */
export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "high", action: "send_crypto" },
  });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = await req.json().catch(() => ({}));
  const validation = sendTokenSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { recipient, amount, asset, network: networkName, memo, pin } =
    validation.data;

  const config = NETWORK_CONFIGS[networkName];
  if (!config) {
    return NextResponse.json(
      { success: false, error: `Unsupported network "${networkName}"` },
      { status: 400 },
    );
  }

  if (!config.assets.includes(asset)) {
    return NextResponse.json(
      {
        success: false,
        error: `Asset "${asset}" is not supported on ${networkName}`,
      },
      { status: 400 },
    );
  }

  const wallet = await findWalletForUser(session.user.id);
  if (!wallet) {
    return NextResponse.json(
      { success: false, error: "No wallet found for user." },
      { status: 404 },
    );
  }

  // Count failed attempts and honour account lockout
  const pinCheck = await verifyWalletPin(wallet, pin, {
    userId: session.user.id,
  });
  if (!pinCheck.ok) {
    return NextResponse.json(
      { success: false, error: pinCheck.error },
      { status: pinCheck.status },
    );
  }

  // Enforce security transaction limits (discreetly)
  let amountInUsd: number | undefined;
  try {
    const limitCheck = await assertDailyTransactionLimit({
      userId: session.user.id,
      amount,
      tokenOrCurrency: asset,
    });
    amountInUsd = limitCheck.amountInUsd;
  } catch (limitErr: any) {
    if (isLimitError(limitErr)) {
      return NextResponse.json(
        { success: false, error: limitErr.message },
        { status: 400 },
      );
    }
    throw limitErr;
  }

  let phrase: string;
  try {
    phrase = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Incorrect PIN" },
      { status: 401 },
    );
  }

  let result: TransferResult;

  try {
    if (config.chain === "stellar") {
      const isTestnet = config.network === "testnet";
      const keypair = deriveStellarKeypairFromMnemonic(phrase);
      result = await sendStellar({
        privateKey: keypair.secretKey,
        destination: recipient,
        amount,
        asset,
        memo,
        network: isTestnet ? "testnet" : "mainnet",
      });
    } else if (config.chain === "solana") {
      const privateKey = await resolveChainPrivateKey(phrase, "solana");
      result = await sendSolana({
        privateKey,
        destination: recipient,
        amount,
        asset,
      });
    } else if (config.chain === "tron") {
      const tronRes = await executeTronTokenTransfer({
        mnemonicOrPrivateKey: phrase,
        toAddress: recipient,
        amount,
      });
      if (!tronRes.success || !tronRes.txHash) {
        throw new Error(tronRes.error || "Tron transfer failed");
      }
      result = {
        success: true,
        txHash: tronRes.txHash,
        explorerUrl:
          tronRes.explorerUrl ||
          `https://tronscan.org/#/transaction/${tronRes.txHash}`,
        fromAddress: wallet.addresses?.trx || "",
      };
    } else {
      // EVM (ethereum / base)
      const evmChain: "base" | "eth" =
        config.chain === "base" ? "base" : "eth";
      const privateKey = await resolveChainPrivateKey(phrase, evmChain);
      result = await sendEvm({
        privateKey,
        destination: recipient,
        amount,
        asset,
        chain: evmChain,
      });
    }
  } catch (err: any) {
    console.error(
      `[Wallet] failed | Chain: ${config.chain} | Error: ${formatOneLineError(err)}`,
    );
    const isTimeout =
      err?.name === "TimeoutError" ||
      err?.name === "AbortError" ||
      err?.code === "ETIMEDOUT";

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "The transaction broadcast timed out. Please verify your internet connection and check transaction history before retrying."
          : err?.message || "Failed to process transfer. Please try again.",
      },
      { status: isTimeout ? 504 : 400 },
    );
  }

  // Record recent destination for fast transfer history
  trackRecent(session.user.id, {
    type: "wallet",
    name: shortenAddress(recipient),
    identifier: recipient,
    details: {
      walletAddress: recipient,
      network: networkName,
      chain: config.chain,
      memo: memo || undefined,
    },
  }).catch((e) =>
    console.warn(
      `[Wallet Send] trackRecent notice: ${formatOneLineError(e)}`,
    ),
  );

  // Log user activity
  logUserActivity({
    userId: session.user.id,
    action: "TRANSFER_SENT",
    details: {
      recipient,
      amount,
      asset,
      network: networkName,
      chain: config.chain,
      txHash: result.txHash,
    },
    req,
  }).catch((e) =>
    console.error(`Error: ${formatOneLineError(e)}`),
  );

  try {
    const isTestnet = config.network === "testnet";

    const tx = await createTransactionRecord({
      userId: session.user.id,
      status: "CONFIRMED",
      type: "TRANSFER",
      amount: String(amount),
      amountInUsd,
      token: asset,
      chain: config.chain,
      txHash: result.txHash,
      fromAddress: result.fromAddress,
      toAddress: recipient,
      memo,
      network: isTestnet ? "testnet" : "mainnet",
      explorerUrl: result.explorerUrl,
    });

    createNotification({
      userId: session.user.id,
      tab: "transactions",
      type: "TRANSFER_SENT",
      title: "Crypto Sent",
      body: `You sent ${amount} ${asset} on ${networkName}`,
      metadata: {
        txHash: result.txHash,
        amount: String(amount),
        token: asset,
        chain: config.chain,
        toAddress: recipient,
      },
      link: tx?._id ? `/transactions/${tx._id}` : "/transactions",
    }).catch((e) =>
      console.error(
        `[Wallet:Send] Sender Notification error: ${formatOneLineError(e)}`,
      ),
    );

    if (tx?._id) {
      dispatchTransactionEmail(tx._id, "WITHDRAWAL_CONFIRMED").catch(() => {});
    }

    // If recipient is another registered Jumpa user, notify them & invalidate their balance cache
    try {
      const recipientWallet = await findWalletByAddress(recipient);
      if (
        recipientWallet?.userId &&
        recipientWallet.userId !== session.user.id
      ) {
        const shortSender = shortenAddress(result.fromAddress);
        createNotification({
          userId: recipientWallet.userId,
          tab: "transactions",
          type: "FUNDS_RECEIVED",
          title: "Crypto Received",
          body: `${amount} ${asset} received from ${shortSender}`,
          metadata: {
            txHash: result.txHash,
            amount: String(amount),
            token: asset,
            chain: config.chain,
            fromAddress: result.fromAddress,
          },
          link: "/transactions",
        }).catch((e) =>
          console.error(
            `Error: ${formatOneLineError(e)}`,
          ),
        );

        invalidateBalanceCache(recipientWallet.userId);
        invalidateBalanceCache(recipientWallet.address);
      }
    } catch (recipientErr) {
      console.warn(
        `Error: ${formatOneLineError(recipientErr)}`,
      );
    }

    // Invalidate sender balance cache
    invalidateBalanceCache(session.user.id);
    if (wallet.address) {
      invalidateBalanceCache(wallet.address);
    }

    return NextResponse.json({
      success: true,
      data: {
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        transactionId: tx?._id,
      },
    });
  } catch (dbErr) {
    console.error(`Error: ${formatOneLineError(dbErr)}`);
    return NextResponse.json({
      success: true,
      data: {
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
      },
    });
  }
}
