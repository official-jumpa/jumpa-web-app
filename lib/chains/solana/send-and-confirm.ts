import {
  Connection,
  Transaction,
  Signer,
  Commitment,
  ComputeBudgetProgram,
} from "@solana/web3.js";

export interface SendAndConfirmPollingOptions {
  commitment?: Commitment;
  skipPreflight?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
  addPriorityFee?: boolean;
  priorityFeeMicroLamports?: number;
}

/**
 * Sends and confirms a Solana transaction using pure HTTP JSON-RPC polling
 * (`sendRawTransaction` and `getSignatureStatuses`).
 *
 * This completely eliminates dependency on WebSocket `signatureSubscribe`,
 * which is unsupported or restricted by RPC providers like Alchemy (-32601 Method not found).
 */
export async function sendAndConfirmTransactionPolling(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
  options: SendAndConfirmPollingOptions = {},
): Promise<string> {
  const commitment: Commitment = options.commitment || "confirmed";
  const timeoutMs = options.timeoutMs || 60000;
  const pollIntervalMs = options.pollIntervalMs || 1500;
  const addPriorityFee = options.addPriorityFee ?? true;
  const priorityFeeMicroLamports = options.priorityFeeMicroLamports ?? 50_000;

  // 1. Optionally add compute budget priority fee to avoid dropping during congestion
  if (addPriorityFee) {
    const hasComputeBudget = transaction.instructions.some((ix) =>
      ix.programId.equals(ComputeBudgetProgram.programId),
    );
    if (!hasComputeBudget) {
      // Prepend compute unit price instruction
      transaction.instructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFeeMicroLamports,
        }),
      );
    }
  }

  // 2. Assign feePayer if not already set
  if (!transaction.feePayer && signers.length > 0) {
    transaction.feePayer = signers[0].publicKey;
  }

  // 3. Fetch latest blockhash and lastValidBlockHeight
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash(commitment);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  // 4. Sign transaction
  if (signers.length > 0) {
    transaction.sign(...signers);
  }

  // 5. Serialize and broadcast via HTTP sendRawTransaction
  const rawTx = transaction.serialize();
  const txHash = await connection.sendRawTransaction(rawTx, {
    skipPreflight: options.skipPreflight ?? false,
    preflightCommitment: commitment,
  });

  console.log(
    `[Solana HTTP] Broadcasted transaction ${txHash}. Polling confirmation via HTTP...`,
  );

  // 6. Poll via getSignatureStatuses over HTTP
  const startTime = Date.now();
  let lastRebroadcast = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const { value } = await connection.getSignatureStatuses([txHash]);
      const status = value?.[0];

      if (status) {
        if (status.err) {
          throw new Error(
            `Transaction ${txHash} failed on-chain: ${JSON.stringify(status.err)}`,
          );
        }
        if (
          status.confirmationStatus === commitment ||
          status.confirmationStatus === "finalized"
        ) {
          console.log(
            `[Solana HTTP] Transaction ${txHash} confirmed! (status: ${status.confirmationStatus}, took ${Date.now() - startTime}ms)`,
          );
          return txHash;
        }
      }
    } catch (err: any) {
      if (err.message?.includes("failed on-chain")) throw err;
      // Suppress transient network poll hiccups
      console.warn(`[Solana HTTP] Transient polling error:`, err?.message || err);
    }

    // Check if block height has exceeded lastValidBlockHeight
    try {
      const currentHeight = await connection.getBlockHeight(commitment);
      if (currentHeight > lastValidBlockHeight) {
        throw new Error(
          `Signature ${txHash} has expired: block height exceeded.`,
        );
      }
    } catch (err: any) {
      if (err.message?.includes("expired")) throw err;
    }

    // Rebroadcast raw transaction every 4 seconds in case validators dropped the initial packet
    if (Date.now() - lastRebroadcast > 4000) {
      try {
        await connection.sendRawTransaction(rawTx, {
          skipPreflight: true,
        });
        lastRebroadcast = Date.now();
      } catch {
        // Ignore rebroadcast errors
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Transaction ${txHash} was not confirmed within ${timeoutMs / 1000} seconds.`,
  );
}
