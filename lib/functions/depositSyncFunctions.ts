import { connectDB } from "@/lib/db";
import { type IWallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { stellarMainnetServer, stellarTestnetServer } from "@/lib/chains/stellar";
import {
  EVM_CLIENTS,
  CONTRACT_ADDRESSES,
  getSolanaRpcUrl,
  EVM_CHAINS,
} from "@/lib/blockchain";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { formatUnits, parseAbiItem } from "viem";

export interface DetectedDeposit {
  chain: "stellar" | "solana" | "base" | "ethereum" | "tron";
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: string;
  timestamp?: Date;
}

/**
 * Detects inbound payments on Stellar (Mainnet & Testnet fallback)
 */
async function detectStellarInbound(xlmAddress: string): Promise<DetectedDeposit[]> {
  if (!xlmAddress) return [];
  const results: DetectedDeposit[] = [];

  const checkServer = async (server: typeof stellarMainnetServer) => {
    try {
      const payments = await server
        .payments()
        .forAccount(xlmAddress)
        .order("desc")
        .limit(10)
        .call();

      for (const record of payments.records) {
        const rec = record as any;
        if (
          (rec.type === "payment" || rec.type === "path_payment_strict_receive") &&
          rec.to === xlmAddress
        ) {
          const numAmount = Number.parseFloat(rec.amount || "0");
          // Ignore micro-dust amounts (< 0.01 XLM) or gas subsidies
          if (rec.asset_type === "native" && numAmount < 0.01) {
            continue;
          }

          results.push({
            chain: "stellar",
            txHash: rec.transaction_hash,
            fromAddress: rec.from || "unknown",
            toAddress: rec.to,
            amount: rec.amount,
            token:
              rec.asset_type === "native"
                ? "XLM"
                : (rec.asset_code || "USDC").toUpperCase(),
            timestamp: rec.created_at ? new Date(rec.created_at) : new Date(),
          });
        }
      }
    } catch {
      // Ignore if account doesn't exist yet on this horizon server
    }
  };

  await Promise.allSettled([
    checkServer(stellarMainnetServer),
    checkServer(stellarTestnetServer),
  ]);

  return results;
}

/**
 * Detects inbound payments on Solana (Mainnet / Devnet)
 */
async function detectSolanaInbound(solAddress: string): Promise<DetectedDeposit[]> {
  if (!solAddress) return [];
  const results: DetectedDeposit[] = [];

  try {
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");
    const pubkey = new PublicKey(solAddress);
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 10,
    });

    for (const sigInfo of signatures) {
      if (sigInfo.err) continue;

      const parsedTx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!parsedTx || !parsedTx.meta) continue;

      // 1. Check Native SOL delta for the account
      const accountKeys = parsedTx.transaction.message.accountKeys;
      const accountIndex = accountKeys.findIndex(
        (k) => (typeof k === "string" ? k : k.pubkey.toBase58()) === solAddress,
      );

      if (accountIndex >= 0) {
        const pre = parsedTx.meta.preBalances[accountIndex] || 0;
        const post = parsedTx.meta.postBalances[accountIndex] || 0;
        const diffLamports = post - pre;

        // If net received SOL (accounting for rent / gas dust)
        if (diffLamports > 1000) {
          const signerKey = accountKeys[0];
          const sender =
            typeof signerKey === "string"
              ? signerKey
              : signerKey.pubkey.toBase58();

          // Don't flag as deposit if the account itself was the fee-paying sender
          if (sender !== solAddress) {
            results.push({
              chain: "solana",
              txHash: sigInfo.signature,
              fromAddress: sender || "unknown",
              toAddress: solAddress,
              amount: (diffLamports / LAMPORTS_PER_SOL).toString(),
              token: "SOL",
              timestamp: sigInfo.blockTime
                ? new Date(sigInfo.blockTime * 1000)
                : new Date(),
            });
          }
        }
      }

      // 2. Check SPL Token Transfers (e.g. USDC)
      const preToken = parsedTx.meta.preTokenBalances || [];
      const postToken = parsedTx.meta.postTokenBalances || [];

      for (const post of postToken) {
        if (post.owner === solAddress) {
          const pre = preToken.find(
            (p) => p.accountIndex === post.accountIndex && p.mint === post.mint,
          );
          const preAmount = Number(pre?.uiTokenAmount.uiAmount || 0);
          const postAmount = Number(post.uiTokenAmount.uiAmount || 0);
          const diff = postAmount - preAmount;

          if (diff > 0) {
            const isUsdc =
              post.mint === CONTRACT_ADDRESSES.solana.mainnet.USDC.mint;
            const isUsdt =
              post.mint === CONTRACT_ADDRESSES.solana.mainnet.USDT.mint;
            const tokenSymbol = isUsdc ? "USDC" : isUsdt ? "USDT" : "SPL";

            results.push({
              chain: "solana",
              txHash: sigInfo.signature,
              fromAddress: "unknown",
              toAddress: solAddress,
              amount: diff.toString(),
              token: tokenSymbol,
              timestamp: sigInfo.blockTime
                ? new Date(sigInfo.blockTime * 1000)
                : new Date(),
            });
          }
        }
      }
    }
  } catch {
    // Non-fatal if Solana RPC is unreachable or throttled
  }

  return results;
}

/**
 * Detects inbound ERC-20 transfers (USDC/USDT) on Base and Ethereum
 */
async function detectEvmInbound(
  ethAddress: string,
  baseAddress: string,
): Promise<DetectedDeposit[]> {
  const results: DetectedDeposit[] = [];

  const targets = [
    {
      chain: "base" as const,
      client: EVM_CLIENTS.base,
      address: baseAddress as `0x${string}`,
      tokens: [
        {
          symbol: "USDC",
          address: CONTRACT_ADDRESSES.base.mainnet.USDC.address,
          decimals: CONTRACT_ADDRESSES.base.mainnet.USDC.decimals,
        },
        {
          symbol: "USDT",
          address: CONTRACT_ADDRESSES.base.mainnet.USDT.address,
          decimals: CONTRACT_ADDRESSES.base.mainnet.USDT.decimals,
        },
      ],
    },
    {
      chain: "ethereum" as const,
      client: EVM_CLIENTS.ethereum,
      address: ethAddress as `0x${string}`,
      tokens: [
        {
          symbol: "USDC",
          address: CONTRACT_ADDRESSES.ethereum.mainnet.USDC.address,
          decimals: CONTRACT_ADDRESSES.ethereum.mainnet.USDC.decimals,
        },
        {
          symbol: "USDT",
          address: CONTRACT_ADDRESSES.ethereum.mainnet.USDT.address,
          decimals: CONTRACT_ADDRESSES.ethereum.mainnet.USDT.decimals,
        },
      ],
    },
  ];

  for (const target of targets) {
    if (!target.client || !target.address) continue;

    try {
      const currentBlock = await target.client.getBlockNumber();
      // Inspect recent ~2,000 blocks to stay within free RPC getLogs limits
      const fromBlock =
        currentBlock > BigInt(2000) ? currentBlock - BigInt(2000) : BigInt(0);

      for (const token of target.tokens) {
        if (!token.address) continue;
        try {
          const logs = await target.client.getLogs({
            address: token.address,
            event: parseAbiItem(
              "event Transfer(address indexed from, address indexed to, uint256 value)",
            ),
            args: { to: target.address },
            fromBlock,
            toBlock: "latest",
          });

          for (const log of logs) {
            results.push({
              chain: target.chain,
              txHash: log.transactionHash,
              fromAddress: (log.args as any).from || "unknown",
              toAddress: target.address,
              amount: formatUnits(
                (log.args as any).value || BigInt(0),
                token.decimals,
              ),
              token: token.symbol,
            });
          }
        } catch {
          // If RPC blocks getLogs with range error, ignore single token check
        }
      }
    } catch {
      // Non-fatal if specific EVM client fails
    }
  }

  return results;
}

/**
 * Detects inbound payments on Tron (TRC-20 USDT, TRC-20 USDC, and native TRX)
 */
async function detectTronInbound(trxAddress?: string): Promise<DetectedDeposit[]> {
  if (!trxAddress) return [];
  const results: DetectedDeposit[] = [];
  const seenTxHashes = new Set<string>();

  const usdtContract = CONTRACT_ADDRESSES.tron.mainnet.USDT.address;
  const usdcContract = CONTRACT_ADDRESSES.tron.mainnet.USDC.address;

  // 1. TRC-20 transfers (USDT & USDC) via TronGrid with TronScan fallback
  try {
    let trc20Loaded = false;
    try {
      const res = await fetch(
        `https://api.trongrid.io/v1/accounts/${trxAddress}/transactions/trc20?limit=25`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          for (const item of json.data) {
            if (
              item.to &&
              item.to.toLowerCase() === trxAddress.toLowerCase() &&
              item.transaction_id
            ) {
              const contractAddr = item.token_info?.address;
              const isUsdt = contractAddr === usdtContract || item.token_info?.symbol === "USDT";
              const isUsdc = contractAddr === usdcContract || item.token_info?.symbol === "USDC";

              if (isUsdt || isUsdc) {
                const decimals = Number(item.token_info?.decimals) || 6;
                const rawVal = Number(item.value) || 0;
                const amount = (rawVal / 10 ** decimals).toString();

                if (!seenTxHashes.has(item.transaction_id)) {
                  seenTxHashes.add(item.transaction_id);
                  results.push({
                    chain: "tron",
                    txHash: item.transaction_id,
                    fromAddress: item.from || "unknown",
                    toAddress: item.to,
                    amount,
                    token: isUsdt ? "USDT" : "USDC",
                    timestamp: item.block_timestamp ? new Date(item.block_timestamp) : new Date(),
                  });
                }
              }
            }
          }
          trc20Loaded = true;
        }
      }
    } catch {
      // TronGrid failed, try TronScan fallback below
    }

    if (!trc20Loaded) {
      const res = await fetch(
        `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=25&relatedAddress=${trxAddress}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.token_transfers)) {
          for (const item of json.token_transfers) {
            if (
              item.to_address &&
              item.to_address.toLowerCase() === trxAddress.toLowerCase() &&
              item.transaction_id
            ) {
              const contractAddr = item.contract_address;
              const isUsdt = contractAddr === usdtContract || item.tokenInfo?.tokenAbbr?.toUpperCase() === "USDT";
              const isUsdc = contractAddr === usdcContract || item.tokenInfo?.tokenAbbr?.toUpperCase() === "USDC";

              if (isUsdt || isUsdc) {
                const decimals = Number(item.tokenInfo?.tokenDecimal) || 6;
                const rawVal = Number(item.quant) || 0;
                const amount = (rawVal / 10 ** decimals).toString();

                if (!seenTxHashes.has(item.transaction_id)) {
                  seenTxHashes.add(item.transaction_id);
                  results.push({
                    chain: "tron",
                    txHash: item.transaction_id,
                    fromAddress: item.from_address || "unknown",
                    toAddress: item.to_address,
                    amount,
                    token: isUsdt ? "USDT" : "USDC",
                    timestamp: item.block_ts ? new Date(item.block_ts) : new Date(),
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal if TRC-20 checks fail
  }

  // 2. Native TRX transfers via TronScan API
  try {
    const res = await fetch(
      `https://apilist.tronscanapi.com/api/transaction?sort=-timestamp&count=true&limit=25&start=0&address=${trxAddress}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        for (const item of json.data) {
          // contractType 1 is standard TRX TransferContract
          const isTransfer = item.contractType === 1;
          const isTargetTo =
            (item.toAddress && item.toAddress.toLowerCase() === trxAddress.toLowerCase()) ||
            (Array.isArray(item.toAddressList) &&
              item.toAddressList.some((a: string) => a.toLowerCase() === trxAddress.toLowerCase()));
          const isSuccess = item.confirmed && !item.revert && item.contractRet === "SUCCESS";

          if (isTransfer && isTargetTo && isSuccess && item.hash) {
            if (!seenTxHashes.has(item.hash)) {
              seenTxHashes.add(item.hash);
              const rawAmount = Number(item.amount || item.contractData?.amount) || 0;
              const amount = (rawAmount / 1_000_000).toString();

              // Ignore micro-dust (< 0.01 TRX)
              if (Number(amount) >= 0.01) {
                results.push({
                  chain: "tron",
                  txHash: item.hash,
                  fromAddress: item.ownerAddress || item.contractData?.owner_address || "unknown",
                  toAddress: trxAddress,
                  amount,
                  token: "TRX",
                  timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
                });
              }
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal if native TRX transfers check fails
  }

  return results;
}

/**
 * Syncs inbound deposits for a given wallet across Stellar, Solana, Base, Ethereum, and Tron.
 * Idempotently saves new transactions, triggers notifications, and logs user activity.
 */
export async function syncWalletInboundDeposits(
  wallet: IWallet,
): Promise<DetectedDeposit[]> {
  if (!wallet || !wallet.addresses) return [];
  await connectDB();

  const newlyDetected: DetectedDeposit[] = [];

  const [stellarDeposits, solanaDeposits, evmDeposits, tronDeposits] =
    await Promise.allSettled([
      detectStellarInbound(wallet.addresses.xlm),
      detectSolanaInbound(wallet.addresses.sol),
      detectEvmInbound(wallet.addresses.eth, wallet.addresses.base),
      detectTronInbound(wallet.addresses.trx),
    ]);

  const allDeposits: DetectedDeposit[] = [
    ...(stellarDeposits.status === "fulfilled" ? stellarDeposits.value : []),
    ...(solanaDeposits.status === "fulfilled" ? solanaDeposits.value : []),
    ...(evmDeposits.status === "fulfilled" ? evmDeposits.value : []),
    ...(tronDeposits.status === "fulfilled" ? tronDeposits.value : []),
  ];

  for (const dep of allDeposits) {
    if (!dep.txHash) continue;

    // 1. Idempotency Check: Already recorded in DB?
    const existing = await Transaction.findOne({
      $or: [
        { txHash: dep.txHash },
        { "rampDetails.inboundConfirmedTxHash": dep.txHash },
        { "rampDetails.relayTxHash": dep.txHash },
      ],
    });

    if (existing) continue;

    // Skip if wallet has no associated user
    if (!wallet.userId) continue;

    // 2. Insert new confirmed DEPOSIT transaction
    const newTx = await Transaction.create({
      userId: wallet.userId,
      walletId: wallet._id,
      type: "DEPOSIT",
      status: "CONFIRMED",
      chain: dep.chain,
      fromAddress: dep.fromAddress,
      toAddress: dep.toAddress,
      amount: dep.amount,
      token: dep.token,
      txHash: dep.txHash,
      createdAt: dep.timestamp || new Date(),
    });

    // 3. Trigger Notification
    if (wallet.userId) {
      const shortSender =
        dep.fromAddress && dep.fromAddress.length > 10
          ? `${dep.fromAddress.slice(0, 6)}...${dep.fromAddress.slice(-4)}`
          : dep.fromAddress || "external wallet";

      await createNotification({
        userId: wallet.userId,
        tab: "transactions",
        type: "FUNDS_RECEIVED",
        title: "Funds Received",
        body: `You received ${dep.amount} ${dep.token} on ${dep.chain.toUpperCase()} from ${shortSender}`,
        metadata: {
          txHash: dep.txHash,
          chain: dep.chain,
          amount: dep.amount,
          token: dep.token,
          transactionId: newTx._id,
        },
      });

      // 4. Log User Activity
      await logUserActivity({
        userId: wallet.userId,
        action: "TRANSFER_RECEIVED",
        details: {
          txHash: dep.txHash,
          chain: dep.chain,
          amount: dep.amount,
          token: dep.token,
        },
      });
    }

    newlyDetected.push(dep);
  }

  // 5. Invalidate balance cache if any new funds arrived
  if (newlyDetected.length > 0 && wallet.userId) {
    invalidateBalanceCache(wallet.userId);
    if (wallet.address) {
      invalidateBalanceCache(wallet.address);
    }
  }

  return newlyDetected;
}
