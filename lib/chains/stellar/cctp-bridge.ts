import * as StellarSdk from "@stellar/stellar-sdk";
import { CIRCLE_IRIS_API, CONTRACT_ADDRESSES, getExplorerTxUrl } from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { createNotification } from "@/lib/functions/notificationFunctions";

/**
 * Submits receive_message to Stellar MessageTransmitter contract.
 * Exact Soroban function signature:
 * receive_message(caller: Address, message: Bytes, attestation: Bytes) -> Bool
 */
export async function submitStellarReceiveMessage({
  messageHex,
  attestationHex,
}: {
  messageHex: string;
  attestationHex: string;
}): Promise<{ ok: boolean; mintTxHash?: string; error?: string }> {
  try {
    const cleanMsg = messageHex.replace(/^0x/, "");
    const cleanAtt = attestationHex.replace(/^0x/, "");
    const msgBytes = Buffer.from(cleanMsg, "hex");
    const attBytes = Buffer.from(cleanAtt, "hex");

    const rpcUrl = process.env.STELLAR_RPC_URL || "https://mainnet.sorobanrpc.com";
    const rpc = new StellarSdk.rpc.Server(rpcUrl);

    const sponsoredKey = process.env.SPONSORED_FEE_STELLAR_KEY;
    if (!sponsoredKey) {
      return { ok: false, error: "Missing SPONSORED_FEE_STELLAR_KEY" };
    }

    const relayerKeypair = StellarSdk.Keypair.fromSecret(sponsoredKey);
    const sourceAddress = relayerKeypair.publicKey();

    const acc = await rpc.getAccount(sourceAddress);
    const mtAddress = CONTRACT_ADDRESSES.cctp.mainnet.stellar.messageTransmitter;
    const mtContract = new StellarSdk.Contract(mtAddress);

    const receiveOp = mtContract.call(
      "receive_message",
      new StellarSdk.Address(sourceAddress).toScVal(),
      StellarSdk.xdr.ScVal.scvBytes(msgBytes),
      StellarSdk.xdr.ScVal.scvBytes(attBytes),
    );

    let tx = new StellarSdk.TransactionBuilder(acc, {
      fee: "500000",
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(receiveOp)
      .setTimeout(60)
      .build();

    tx = await rpc.prepareTransaction(tx);
    tx.sign(relayerKeypair);

    const sendRes = await rpc.sendTransaction(tx);
    if (sendRes.status === "ERROR") {
      return { ok: false, error: `Stellar sendTransaction failed: ${JSON.stringify(sendRes)}` };
    }

    let txStatus = await rpc.getTransaction(sendRes.hash);
    let attempts = 0;
    while (txStatus.status === "NOT_FOUND" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000));
      txStatus = await rpc.getTransaction(sendRes.hash);
      attempts++;
    }

    if (txStatus.status === "SUCCESS") {
      return { ok: true, mintTxHash: sendRes.hash };
    } else {
      return { ok: false, error: `Stellar transaction status: ${txStatus.status}` };
    }
  } catch (err: any) {
    console.error("[Stellar Relayer Error]", err);
    return { ok: false, error: err?.message || "Failed to submit Stellar receive_message" };
  }
}

/**
 * Automated Background Relayer for CCTP v2 transfers to Stellar.
 * Polls Circle Iris for attestation and broadcasts receive_message automatically.
 */
export function relayToStellar({
  txHash,
  userId,
  amount,
  sourceDomain,
}: {
  txHash: string;
  userId: string;
  amount: string;
  sourceDomain: number;
}) {
  (async () => {
    try {
      let attempts = 0;
      let msgObj: any = null;

      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const res = await fetch(
            `${CIRCLE_IRIS_API.mainnet}/v2/messages/${sourceDomain}?transactionHash=${txHash}`,
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
        console.warn("[Stellar Relayer] Iris attestation timeout for:", txHash);
        return;
      }

      if (msgObj.destinationMintTxHash) {
        console.log("[Stellar Relayer] Already minted on destination:", msgObj.destinationMintTxHash);
        return;
      }

      console.log("[Stellar Relayer] Attestation ready! Minting on Stellar...");
      const result = await submitStellarReceiveMessage({
        messageHex: msgObj.message,
        attestationHex: msgObj.attestation,
      });

      if (!result.ok || !result.mintTxHash) {
        console.error("[Stellar Relayer] Failed to mint on Stellar:", result.error);
        return;
      }

      await connectDB();
      await Transaction.findOneAndUpdate(
        { txHash },
        {
          $set: {
            status: "CONFIRMED",
            "bridgeDetails.mintTxHash": result.mintTxHash,
            "bridgeDetails.mintExplorerUrl": getExplorerTxUrl(
              "stellar",
              result.mintTxHash,
              false,
            ),
          },
        },
      );

      invalidateBalanceCache(userId);

      await createNotification({
        userId,
        tab: "transactions",
        title: "Bridge Completed",
        body: `${amount} USDC has arrived on Stellar!`,
        type: "BRIDGE_COMPLETED",
      }).catch(() => null);
    } catch (err) {
      console.error("[Stellar Relayer Error]", err);
    }
  })();
}
