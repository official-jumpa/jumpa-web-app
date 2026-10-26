import * as StellarSdk from "@stellar/stellar-sdk";
import {
  CIRCLE_IRIS_API,
  CONTRACT_ADDRESSES,
  getExplorerTxUrl,
  stellarAddressToBytes32,
} from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { createNotification } from "@/lib/functions/notificationFunctions";

/**
 * Submits CCTP receive message on Stellar.
 * If the message mintRecipient is Circle's CctpForwarder, calls cctpForwarder.mint_and_forward.
 * Otherwise, calls messageTransmitter.receive_message.
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
    const stellarCctp = CONTRACT_ADDRESSES.cctp.mainnet.stellar;

    // Detect if this message targets Circle's CctpForwarder contract on Stellar
    const forwarderBytes32 = Buffer.from(
      stellarAddressToBytes32(stellarCctp.cctpForwarder).replace(/^0x/, ""),
      "hex",
    );
    // In MessageV2, destinationCaller is at offset 108..140; BurnMessageV2 mintRecipient is at 184..216
    const isTargetingForwarder =
      msgBytes.length >= 216 &&
      (msgBytes.subarray(184, 216).equals(forwarderBytes32) ||
        msgBytes.subarray(108, 140).equals(forwarderBytes32));

    let operation: StellarSdk.xdr.Operation;
    if (isTargetingForwarder) {
      const forwarderContract = new StellarSdk.Contract(stellarCctp.cctpForwarder);
      operation = forwarderContract.call(
        "mint_and_forward",
        StellarSdk.xdr.ScVal.scvBytes(msgBytes),
        StellarSdk.xdr.ScVal.scvBytes(attBytes),
      );
    } else {
      const mtAddress = stellarCctp.messageTransmitter;
      const mtContract = new StellarSdk.Contract(mtAddress);
      operation = mtContract.call(
        "receive_message",
        new StellarSdk.Address(sourceAddress).toScVal(),
        StellarSdk.xdr.ScVal.scvBytes(msgBytes),
        StellarSdk.xdr.ScVal.scvBytes(attBytes),
      );
    }

    let tx = new StellarSdk.TransactionBuilder(acc, {
      fee: "500000",
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    try {
      tx = await rpc.prepareTransaction(tx);
    } catch (prepErr: any) {
      const prepErrMsg = prepErr?.message || String(prepErr);
      if (prepErrMsg.includes("6908") || prepErrMsg.includes("NonceAlreadyUsed")) {
        console.log("[Stellar Relayer] Nonce already used; transfer already executed on Stellar");
        return { ok: true, mintTxHash: "already_minted" };
      }
      throw prepErr;
    }

    tx.sign(relayerKeypair);

    const sendRes = await rpc.sendTransaction(tx);
    if (sendRes.status === "ERROR") {
      const errStr = JSON.stringify(sendRes);
      if (errStr.includes("6908") || errStr.includes("NonceAlreadyUsed")) {
        console.log("[Stellar Relayer] Nonce already used; transfer already executed on Stellar");
        return { ok: true, mintTxHash: "already_minted" };
      }
      return { ok: false, error: `Stellar sendTransaction failed: ${errStr}` };
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

      // Poll up to 250 attempts x 6s = 25 minutes to accommodate standard L1 finality fallback
      while (attempts < 250) {
        await new Promise((r) => setTimeout(r, 6000));
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

      let mintTxHash = msgObj.destinationMintTxHash;

      if (mintTxHash) {
        console.log("[Stellar Relayer] Already minted on destination:", mintTxHash);
      } else {
        console.log("[Stellar Relayer] Attestation ready! Minting on Stellar...");
        const result = await submitStellarReceiveMessage({
          messageHex: msgObj.message,
          attestationHex: msgObj.attestation,
        });

        if (!result.ok || !result.mintTxHash) {
          console.error("[Stellar Relayer] Failed to mint on Stellar:", result.error);
          return;
        }

        mintTxHash =
          result.mintTxHash === "already_minted"
            ? (msgObj.destinationMintTxHash || "confirmed_on_stellar")
            : result.mintTxHash;
      }

      await connectDB();
      await Transaction.findOneAndUpdate(
        { txHash },
        {
          $set: {
            status: "CONFIRMED",
            "bridgeDetails.mintTxHash": mintTxHash,
            "bridgeDetails.mintExplorerUrl":
              mintTxHash && mintTxHash !== "confirmed_on_stellar"
                ? getExplorerTxUrl("stellar", mintTxHash, false)
                : undefined,
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
