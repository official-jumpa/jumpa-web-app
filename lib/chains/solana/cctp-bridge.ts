import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "./spl-token";
import {
  CONTRACT_ADDRESSES,
  CIRCLE_IRIS_API,
  getSolanaRpcUrl,
  getSolanaUsdcAta,
  getExplorerTxUrl,
} from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { sendAndConfirmVersionedTransactionPolling } from "./send-and-confirm";
import bs58 from "bs58";

/** Circle CCTP official Address Lookup Table on Solana Mainnet */
const CIRCLE_SOLANA_MAINNET_ALT = new PublicKey(
  "3CA7Cjx5EFWd5jMDgX6gL1ENTm7H1PV92TxNkkeB52Qi",
);

/**
 * Submits a deposit_for_burn instruction on Solana TokenMessengerMinterV2.
 * Burns USDC on Solana to initiate a CCTP transfer to another domain (e.g. Stellar, Base, Ethereum).
 */
export async function submitSolanaDepositForBurn({
  ownerKeypair,
  amountSubunits,
  destinationDomain,
  mintRecipientBytes32,
  sponsorKeypair,
  feeSubunits,
}: {
  ownerKeypair: Keypair;
  amountSubunits: bigint;
  destinationDomain: number;
  mintRecipientBytes32: `0x${string}`;
  sponsorKeypair?: Keypair;
  feeSubunits?: bigint;
}): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  try {
    const rpcUrl = getSolanaRpcUrl();
    const connection = new Connection(rpcUrl, "confirmed");

    const solanaCctp = CONTRACT_ADDRESSES.cctp.mainnet.solana;
    const TMM_PROGRAM_ID = new PublicKey(solanaCctp.tokenMessengerMinter);
    const MT_PROGRAM_ID = new PublicKey(solanaCctp.messageTransmitter);
    const USDC_MINT = new PublicKey(solanaCctp.usdc);
    const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

    // Derive PDAs
    const [senderAuthorityPda] = await PublicKey.findProgramAddress(
      [Buffer.from("sender_authority")],
      TMM_PROGRAM_ID,
    );
    const [denylistPda] = await PublicKey.findProgramAddress(
      [Buffer.from("denylist_account"), ownerKeypair.publicKey.toBytes()],
      TMM_PROGRAM_ID,
    );
    const [messageTransmitterPda] = await PublicKey.findProgramAddress(
      [Buffer.from("message_transmitter")],
      MT_PROGRAM_ID,
    );
    const [tokenMessengerPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_messenger")],
      TMM_PROGRAM_ID,
    );
    const [remoteTmPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("remote_token_messenger"),
        Buffer.from(destinationDomain.toString()),
      ],
      TMM_PROGRAM_ID,
    );
    const [tokenMinterPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_minter")],
      TMM_PROGRAM_ID,
    );
    const [localTokenPda] = await PublicKey.findProgramAddress(
      [Buffer.from("local_token"), USDC_MINT.toBytes()],
      TMM_PROGRAM_ID,
    );
    const [tmmEventAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("__event_authority")],
      TMM_PROGRAM_ID,
    );

    // User's USDC ATA
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    );
    const [userAta] = await PublicKey.findProgramAddress(
      [
        ownerKeypair.publicKey.toBytes(),
        TOKEN_PROGRAM_ID.toBytes(),
        USDC_MINT.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Ephemeral keypair for message_sent_event_data
    const messageSentEventKeypair = await Keypair.generate();

    // Clean recipient 32-byte buffer
    const cleanRecipient = mintRecipientBytes32.replace(/^0x/, "");
    const recipientBuf = Buffer.from(cleanRecipient, "hex");

    // Anchor discriminator for deposit_for_burn: d73c3d2e723780b0
    const discriminator = Buffer.from("d73c3d2e723780b0", "hex");
    const paramsBuf = Buffer.alloc(88);
    let offset = 0;
    paramsBuf.writeBigUInt64LE(amountSubunits, offset);
    offset += 8;
    paramsBuf.writeUInt32LE(destinationDomain, offset);
    offset += 4;
    recipientBuf.copy(paramsBuf, offset);
    offset += 32;
    Buffer.alloc(32).copy(paramsBuf, offset); // destination_caller: Pubkey::default()
    offset += 32;
    paramsBuf.writeBigUInt64LE(BigInt(0), offset); // max_fee
    offset += 8;
    paramsBuf.writeUInt32LE(2000, offset); // min_finality_threshold (2000 for standard)
    offset += 4;

    const ixData = Buffer.concat([discriminator, paramsBuf]);

    // If sponsorKeypair is provided (gas abstraction), sponsor pays network gas & event storage rent
    const feePayerPubkey = sponsorKeypair ? sponsorKeypair.publicKey : ownerKeypair.publicKey;
    const eventRentPayerPubkey = sponsorKeypair ? sponsorKeypair.publicKey : ownerKeypair.publicKey;

    const keys = [
      { pubkey: ownerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: eventRentPayerPubkey, isSigner: Boolean(sponsorKeypair), isWritable: true },
      { pubkey: senderAuthorityPda, isSigner: false, isWritable: false },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: denylistPda, isSigner: false, isWritable: false },
      { pubkey: messageTransmitterPda, isSigner: false, isWritable: true },
      { pubkey: tokenMessengerPda, isSigner: false, isWritable: false },
      { pubkey: remoteTmPda, isSigner: false, isWritable: false },
      { pubkey: tokenMinterPda, isSigner: false, isWritable: false },
      { pubkey: localTokenPda, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: true },
      { pubkey: messageSentEventKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: MT_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TMM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tmmEventAuthority, isSigner: false, isWritable: false },
      { pubkey: TMM_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const burnIx = new TransactionInstruction({
      programId: TMM_PROGRAM_ID,
      keys,
      data: ixData,
    });

    const instructions: TransactionInstruction[] = [];
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 280000,
    });
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000,
    });
    instructions.push(modifyComputeUnits, addPriorityFee);

    // If gas abstraction is active and feeSubunits > 0, add atomic reimbursement from user to Jumpa fee collector
    if (sponsorKeypair && feeSubunits && feeSubunits > BigInt(0)) {
      const feeCollector = new PublicKey(
        process.env.FEE_WALLET_SOLANA || sponsorKeypair.publicKey.toBase58(),
      );
      const [feeCollectorAta] = await PublicKey.findProgramAddress(
        [feeCollector.toBytes(), TOKEN_PROGRAM_ID.toBytes(), USDC_MINT.toBytes()],
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // Check if feeCollectorAta exists; if not, create it
      const feeAtaInfo = await connection.getAccountInfo(feeCollectorAta);
      if (!feeAtaInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            sponsorKeypair.publicKey,
            feeCollectorAta,
            feeCollector,
            USDC_MINT,
          ),
        );
      }

      instructions.push(
        createTransferInstruction(
          userAta,
          feeCollectorAta,
          ownerKeypair.publicKey,
          feeSubunits,
        ),
      );
    }

    instructions.push(burnIx);

    const altRes = await connection.getAddressLookupTable(CIRCLE_SOLANA_MAINNET_ALT);
    const lookupTables = altRes.value ? [altRes.value] : [];

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: feePayerPubkey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message(lookupTables);

    const v0Tx = new VersionedTransaction(messageV0);
    const signers = [ownerKeypair, messageSentEventKeypair];
    if (sponsorKeypair) {
      signers.push(sponsorKeypair);
    }
    await v0Tx.sign(signers);

    console.log(
      `[Solana Burn] Broadcasting deposit_for_burn (v0 size: ${v0Tx.serialize().length} bytes)...`,
    );

    const sig = await sendAndConfirmVersionedTransactionPolling(
      connection,
      v0Tx.serialize(),
      latestBlockhash.lastValidBlockHeight,
      {
        commitment: "confirmed",
        skipPreflight: false,
        timeoutMs: 60000,
      },
    );

    console.log(`[Solana Burn] Successfully burned USDC on Solana! Sig: ${sig}`);
    return { ok: true, txHash: sig };
  } catch (err: any) {
    console.error("[Solana Burn Error]", err);
    return { ok: false, error: err?.message || "Failed to execute Solana depositForBurn" };
  }
}

/**
 * Submits receiveMessage on Solana MessageTransmitterV2 with Address Lookup Table support.
 * Uses sponsored fee keypair from environment to pay gas/rent.
 */
export async function submitSolanaReceiveMessage({
  messageHex,
  attestationHex,
  recipientWallet,
}: {
  messageHex: string;
  attestationHex: string;
  recipientWallet?: string;
}): Promise<{ ok: boolean; mintTxHash?: string; error?: string }> {
  try {
    const sponsoredKey = process.env.SPONSORED_FEE_SOLANA_KEY;
    if (!sponsoredKey) {
      return {
        ok: false,
        error: "Missing SPONSORED_FEE_SOLANA_KEY",
      };
    }

    const payerKeypair = await Keypair.fromSecretKey(bs58.decode(sponsoredKey));
    const rpcUrl = getSolanaRpcUrl();
    const connection = new Connection(rpcUrl, "confirmed");

    const cleanMsg = messageHex.replace(/^0x/, "");
    const cleanAtt = attestationHex.replace(/^0x/, "");
    const msgBytes = Buffer.from(cleanMsg, "hex");
    const attBytes = Buffer.from(cleanAtt, "hex");

    if (msgBytes.length < 180) {
      return { ok: false, error: "Malformed CCTP message bytes" };
    }

    const solanaCctp = CONTRACT_ADDRESSES.cctp.mainnet.solana;
    const MESSAGE_TRANSMITTER_PROGRAM_ID = new PublicKey(solanaCctp.messageTransmitter);
    const TOKEN_MESSENGER_MINTER_PROGRAM_ID = new PublicKey(solanaCctp.tokenMessengerMinter);
    const USDC_MINT = new PublicKey(solanaCctp.usdc);
    const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

    // Extract message fields
    const sourceDomain = msgBytes.readUInt32BE(4);
    const nonceBytes = msgBytes.slice(12, 44);
    const msgBody = msgBytes.slice(148);
    const burnTokenBytes = msgBody.slice(4, 36);
    const mintRecipientBytes = msgBody.slice(36, 68);
    const mintRecipient = new PublicKey(mintRecipientBytes);

    // Derive required PDAs
    const [usedNoncePda] = await PublicKey.findProgramAddress(
      [Buffer.from("used_nonce"), nonceBytes],
      MESSAGE_TRANSMITTER_PROGRAM_ID,
    );

    // Check if already claimed
    const usedNonceInfo = await connection.getAccountInfo(usedNoncePda);
    if (usedNonceInfo) {
      return {
        ok: true,
        mintTxHash: undefined,
        error: "Message has already been executed on Solana",
      };
    }

    const [authorityPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("message_transmitter_authority"),
        TOKEN_MESSENGER_MINTER_PROGRAM_ID.toBytes(),
      ],
      MESSAGE_TRANSMITTER_PROGRAM_ID,
    );
    const [messageTransmitterPda] = await PublicKey.findProgramAddress(
      [Buffer.from("message_transmitter")],
      MESSAGE_TRANSMITTER_PROGRAM_ID,
    );
    const [mtEventAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("__event_authority")],
      MESSAGE_TRANSMITTER_PROGRAM_ID,
    );

    const [tokenMessengerPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_messenger")],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );
    const [remoteTokenMessengerPda] = await PublicKey.findProgramAddress(
      [Buffer.from("remote_token_messenger"), Buffer.from(sourceDomain.toString())],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );
    const [tokenMinterPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_minter")],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );
    const [localTokenPda] = await PublicKey.findProgramAddress(
      [Buffer.from("local_token"), USDC_MINT.toBytes()],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );
    const [tokenPairPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_pair"), Buffer.from(sourceDomain.toString()), burnTokenBytes],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );
    const [custodyPda] = await PublicKey.findProgramAddress(
      [Buffer.from("custody"), USDC_MINT.toBytes()],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );
    const [tmmEventAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("__event_authority")],
      TOKEN_MESSENGER_MINTER_PROGRAM_ID,
    );

    // Fee recipient ATA: fee_recipient is 4BPnUzFDibVcWQ5zzixGodRUHwqDxHYpUPdPYus3Bn56
    const feeRecipient = new PublicKey("4BPnUzFDibVcWQ5zzixGodRUHwqDxHYpUPdPYus3Bn56");
    const [feeAta] = await PublicKey.findProgramAddress(
      [feeRecipient.toBytes(), TOKEN_PROGRAM_ID.toBytes(), USDC_MINT.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Anchor instruction format: 8-byte discriminator + Borsh Vec<u8> (msg) + Borsh Vec<u8> (att)
    const discriminator = Buffer.from("26907fe11fe1ee19", "hex");
    const msgLenBuf = Buffer.alloc(4);
    msgLenBuf.writeUInt32LE(msgBytes.length, 0);
    const attLenBuf = Buffer.alloc(4);
    attLenBuf.writeUInt32LE(attBytes.length, 0);

    const ixData = Buffer.concat([
      discriminator,
      msgLenBuf,
      msgBytes,
      attLenBuf,
      attBytes,
    ]);

    const keys = [
      { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: payerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: authorityPda, isSigner: false, isWritable: false },
      { pubkey: messageTransmitterPda, isSigner: false, isWritable: false },
      { pubkey: usedNoncePda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_MESSENGER_MINTER_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: mtEventAuthority, isSigner: false, isWritable: false },
      { pubkey: MESSAGE_TRANSMITTER_PROGRAM_ID, isSigner: false, isWritable: false },
      // Remaining accounts required by TokenMessengerMinterV2 CPI
      { pubkey: tokenMessengerPda, isSigner: false, isWritable: false },
      { pubkey: remoteTokenMessengerPda, isSigner: false, isWritable: false },
      { pubkey: tokenMinterPda, isSigner: false, isWritable: false },
      { pubkey: localTokenPda, isSigner: false, isWritable: true },
      { pubkey: tokenPairPda, isSigner: false, isWritable: false },
      { pubkey: feeAta, isSigner: false, isWritable: true },
      { pubkey: mintRecipient, isSigner: false, isWritable: true },
      { pubkey: custodyPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tmmEventAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_MESSENGER_MINTER_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const receiveIx = new TransactionInstruction({
      programId: MESSAGE_TRANSMITTER_PROGRAM_ID,
      keys,
      data: ixData,
    });

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 350000,
    });
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50000,
    });

    // Check if recipient ATA exists; if not, create it idempotently
    const instructions: TransactionInstruction[] = [modifyComputeUnits, addPriorityFee];
    const recipientAtaInfo = await connection.getAccountInfo(mintRecipient);
    if (!recipientAtaInfo) {
      const ownerWallet = recipientWallet
        ? new PublicKey(recipientWallet)
        : mintRecipient;
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          payerKeypair.publicKey,
          mintRecipient,
          ownerWallet,
          USDC_MINT,
        ),
      );
    }
    instructions.push(receiveIx);

    // Fetch Circle's Address Lookup Table to keep packet below MTU
    const altRes = await connection.getAddressLookupTable(CIRCLE_SOLANA_MAINNET_ALT);
    const lookupTables = altRes.value ? [altRes.value] : [];

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: payerKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message(lookupTables);

    const v0Tx = new VersionedTransaction(messageV0);
    await v0Tx.sign([payerKeypair]);

    const sig = await sendAndConfirmVersionedTransactionPolling(
      connection,
      v0Tx.serialize(),
      latestBlockhash.lastValidBlockHeight,
      {
        commitment: "confirmed",
        skipPreflight: false,
        timeoutMs: 60000,
      },
    );

    console.log(`[Solana Relayer] Successfully confirmed mint on Solana! Sig: ${sig}`);
    return { ok: true, mintTxHash: sig };
  } catch (err: any) {
    console.error("[Solana Relayer Error]", err);
    return { ok: false, error: err?.message || "Failed to submit Solana receiveMessage" };
  }
}

/**
 * Automated Background Relayer for CCTP v2 transfers to Solana.
 * Polls Circle Iris for attestation and broadcasts receiveMessage automatically.
 */
export function relayToSolana({
  txHash,
  userId,
  amount,
  sourceDomain = 27,
  recipientWallet,
}: {
  txHash: string;
  userId: string;
  amount: string;
  sourceDomain?: number;
  recipientWallet?: string;
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
        console.warn("[Solana Relayer] Iris attestation timeout for:", txHash);
        return;
      }

      if (msgObj.destinationMintTxHash) {
        console.log("[Solana Relayer] Already minted on destination:", msgObj.destinationMintTxHash);
        return;
      }

      console.log("[Solana Relayer] Attestation ready! Minting on Solana...");
      const result = await submitSolanaReceiveMessage({
        messageHex: msgObj.message,
        attestationHex: msgObj.attestation,
        recipientWallet,
      });

      if (!result.ok || !result.mintTxHash) {
        console.error("[Solana Relayer] Failed to mint on Solana:", result.error);
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
              "solana",
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
        body: `Your ${amount} USDC bridge transfer to Solana has been completed!`,
        type: "BRIDGE_COMPLETED",
      }).catch(() => null);
    } catch (err) {
      console.error("[Solana Relayer Background Error]", err);
    }
  })();
}
