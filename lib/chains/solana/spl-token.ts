import {
  PublicKey,
  TransactionInstruction,
  Connection,
  Keypair,
  Transaction,
  Commitment,
} from "@solana/web3.js";
import { sendAndConfirmTransactionPolling } from "./send-and-confirm";

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

export const SYSTEM_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111",
);

/**
 * Derives the Associated Token Account (ATA) address for a given wallet and mint.
 */
export async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = true,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): Promise<PublicKey> {
  const [address] = await PublicKey.findProgramAddress(
    [owner.toBytes(), programId.toBytes(), mint.toBytes()],
    associatedTokenProgramId,
  );
  return address;
}

/**
 * Creates an instruction to initialize an Associated Token Account.
 */
export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: associatedTokenProgramId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

/**
 * Creates an idempotent instruction to initialize an Associated Token Account if it does not already exist.
 */
export function createAssociatedTokenAccountIdempotentInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: associatedTokenProgramId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

/**
 * Creates an instruction to transfer SPL tokens between token accounts.
 */
export function createTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint | number,
  multiSigners: PublicKey[] = [],
  programId = TOKEN_PROGRAM_ID,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // Instruction 3 = Transfer
  data.writeBigUInt64LE(BigInt(amount), 1);

  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: multiSigners.length === 0, isWritable: false },
  ];
  for (const signer of multiSigners) {
    keys.push({ pubkey: signer, isSigner: true, isWritable: false });
  }

  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

/**
 * Retrieves the Associated Token Account or creates it on-chain if it does not yet exist.
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = true,
  commitment: Commitment = "confirmed",
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): Promise<{ address: PublicKey }> {
  const associatedToken = await getAssociatedTokenAddress(
    mint,
    owner,
    allowOwnerOffCurve,
    programId,
    associatedTokenProgramId,
  );

  const info = await connection.getAccountInfo(associatedToken, commitment);
  if (info) {
    return { address: associatedToken };
  }

  const transaction = new Transaction();
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedToken,
      owner,
      mint,
      programId,
      associatedTokenProgramId,
    ),
  );

  await sendAndConfirmTransactionPolling(connection, transaction, [payer], {
    commitment,
  });
  return { address: associatedToken };
}
