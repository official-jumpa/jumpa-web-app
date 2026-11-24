/**
 * lib/execution/bridge-execute.ts
 *
 * Full cross-chain USDC bridging pipeline via Circle CCTP v2:
 * 1. Mnemonic decryption via PIN.
 * 2. Key derivation (Stellar ed25519 or EVM account).
 * 3. Pre-flight source balance check.
 * 4. Submission of depositForBurn / burn transaction on source chain.
 * 5. DB persistence in Transaction model with type: "BRIDGE".
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  createWalletClient,
  createPublicClient,
  http,
  fallback,
  parseUnits,
  parseEther,
  erc20Abi,
  maxUint256,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { base, mainnet } from "viem/chains";
import { BRIDGE_MINIMUM_MESSAGE, isBelowBridgeMinimum } from "@/lib/bridge";
import { decryptMnemonic } from "@/lib/crypto";
import {
  deriveStellarKeypairFromMnemonic,
  getHorizonServer,
  getSorobanRpcServer,
} from "@/lib/chains/stellar";
import { deriveAddresses } from "@/lib/derive-addresses";
import {
  CONTRACT_ADDRESSES,
  CCTP_DOMAINS,
  evmAddressToBytes32,
  stellarAddressToBytes32,
  buildStellarForwarderHookData,
  solanaAddressToBytes32,
  solanaRecipientToCctpBytes32,
  getSolanaUsdcAta,
  getExplorerTxUrl,
  getRpcUrl,
  getSolanaRpcUrl,
} from "@/lib/blockchain";
import { relayToSolana, submitSolanaDepositForBurn } from "@/lib/chains/solana/cctp-bridge";
import { relayToStellar } from "@/lib/chains/stellar/cctp-bridge";
import { relayCctpTransferToEvm } from "@/lib/chains/evm/cctp-relay";
import { confirmEthereumDeliveryFee } from "@/lib/chains/evm/ethereum-delivery-fee";
import { getEvmFeeCollectorAddress } from "@/lib/chains/evm/sponsor";
import { getSolanaSponsorKeypair } from "@/lib/chains/solana/sponsor";
import {
  collectStellarGasFeeUsdc,
  ensureStellarAccountActiveAndTrustlined,
  getStellarFeeCollectorPubkey,
} from "@/lib/chains/stellar/sponsor";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { Connection, PublicKey, Keypair as SolanaKeypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import type { IWallet } from "@/models/Wallet";
import {
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";

export type BridgeChain = "stellar" | "base" | "ethereum" | "solana";

export interface BridgeExecuteParams {
  wallet: IWallet;
  pin: string;
  fromChain: BridgeChain;
  toChain: BridgeChain;
  amount: string;
  toAmount: string;
  recipientAddress: string;
  transferType?: "standard" | "fast";
  fee: string;
  networkFee?: string;
  userId: string;
}

export type BridgeExecuteResult =
  | {
      ok: true;
      txHash: string;
      explorerUrl: string;
      fromChain: string;
      toChain: string;
      sentAmount: string;
      receivedAmount: string;
      recipientAddress: string;
      status: "pending" | "confirmed";
    }
  | { ok: false; error: string; status: number };

/** Circle's fast-transfer fee ceiling where the quote doesn't set one. */
const CIRCLE_FAST_FEE_FLOOR_USDC = 0.15;
/** 13 bps sits well above Circle's published fast fee into Ethereum; Circle only deducts its fee, never the cap. */
const CIRCLE_FAST_FEE_CAP_RATE = 0.0013;
/** Gas for the ERC-20 transfer that pays the Ethereum delivery fee. */
const USDC_TRANSFER_GAS_UNITS = BigInt(65000);
const ETHEREUM_DELIVERY_MEMO = "Jumpa: Ethereum delivery";

function usdcToSubunits(usdc: number, decimals: number): bigint {
  return BigInt(Math.round(usdc * 10 ** decimals));
}

/**
 * The maxFee Circle may deduct from the burn, in USDC. Into Ethereum the quoted fee is Jumpa's
 * delivery fee, so Circle gets its own ceiling; every other route keeps the quoted fee.
 */
function circleMaxFeeUsdc(params: {
  quotedFee: string;
  toChain: BridgeChain;
  burnUsdc: number;
  fastTransfer: boolean;
}): number {
  const { quotedFee, toChain, burnUsdc, fastTransfer } = params;
  if (toChain === "ethereum") {
    return fastTransfer
      ? Math.max(CIRCLE_FAST_FEE_FLOOR_USDC, burnUsdc * CIRCLE_FAST_FEE_CAP_RATE)
      : 0;
  }
  const quoted = Number.parseFloat(quotedFee || "0");
  if (quoted > 0) return quoted;
  return fastTransfer ? CIRCLE_FAST_FEE_FLOOR_USDC : 0;
}

async function submitSorobanTx({
  rpc,
  sourceAccount,
  keypair,
  operation,
  networkPassphrase,
}: {
  rpc: StellarSdk.rpc.Server;
  sourceAccount: StellarSdk.Account;
  keypair: StellarSdk.Keypair;
  operation: any;
  networkPassphrase: string;
}): Promise<{ hash: string; confirmed: boolean }> {
  const rawTx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const sim = await rpc.simulateTransaction(rawTx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(`Soroban simulation failed: ${sim.error}`);
  }

  const preparedTx = StellarSdk.rpc.assembleTransaction(rawTx, sim).build();
  preparedTx.sign(keypair);

  const sendRes = await rpc.sendTransaction(preparedTx);
  if (sendRes.status === "ERROR") {
    throw new Error(
      `Soroban transaction send error: ${JSON.stringify(sendRes.errorResult || sendRes)}`,
    );
  }

  if (sendRes.status === "TRY_AGAIN_LATER") {
    throw new Error(
      "The Stellar network is busy right now. Nothing was sent. Please try again in a minute.",
    );
  }

  const hash = sendRes.hash;
  const { GetTransactionStatus } = StellarSdk.rpc.Api;
  // No ledger closing after maxTime can include the tx, so NOT_FOUND past it means it never landed.
  const maxTime = Number(preparedTx.timeBounds?.maxTime ?? 0);
  const giveUpAt = maxTime > 0 ? (maxTime + 30) * 1000 : Date.now() + 45_000;

  while (Date.now() < giveUpAt) {
    await new Promise((r) => setTimeout(r, 1500));
    let txRes: StellarSdk.rpc.Api.GetTransactionResponse;
    try {
      txRes = await rpc.getTransaction(hash);
    } catch {
      continue;
    }
    if (txRes.status === GetTransactionStatus.SUCCESS) {
      return { hash, confirmed: true };
    }
    if (txRes.status === GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction failed on Stellar Soroban: ${JSON.stringify(txRes.resultMetaXdr || txRes)}`,
      );
    }
    if (maxTime > 0 && Number(txRes.latestLedgerCloseTime) > maxTime) {
      throw new Error(
        "Stellar didn't accept this transfer in time. Nothing was sent. Please try again.",
      );
    }
  }

  // Status unreadable: return the hash so it is saved as pending for the resolve job.
  return { hash, confirmed: false };
}

export async function executeBridge(
  params: BridgeExecuteParams,
): Promise<BridgeExecuteResult> {
  const {
    wallet,
    pin,
    fromChain,
    toChain,
    amount,
    toAmount,
    recipientAddress,
    transferType = "fast",
    fee,
    networkFee,
    userId,
  } = params;

  if (isBelowBridgeMinimum(Number(amount))) {
    return { ok: false, error: BRIDGE_MINIMUM_MESSAGE, status: 400 };
  }

  // 1. Decrypt mnemonic
  let phrase: string;
  try {
    phrase = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch {
    return {
      ok: false,
      error: "Incorrect PIN",
      status: 401,
    };
  }

  // Enforce security transaction limits (discreetly)
  try {
    await assertDailyTransactionLimit({
      userId,
      amount,
      tokenOrCurrency: "USDC",
    });
  } catch (limitErr: any) {
    if (isLimitError(limitErr)) {
      return {
        ok: false,
        error: limitErr.message,
        status: 400,
      };
    }
    throw limitErr;
  }

  // Into Ethereum the quoted fee is Jumpa's delivery fee: it comes out of the amount burned
  let ethereumDeliveryFeeUsdc = 0;
  if (toChain === "ethereum") {
    const deliveryFee = await confirmEthereumDeliveryFee({
      quotedFee: fee,
      amountUsdc: Number(amount),
    });
    if (!deliveryFee.ok) {
      return { ok: false, error: deliveryFee.error, status: 400 };
    }
    ethereumDeliveryFeeUsdc = deliveryFee.feeUsdc;
  }
  const burnUsdc = Number(amount) - ethereumDeliveryFeeUsdc;
  const maxFeeUsdc = circleMaxFeeUsdc({
    quotedFee: fee,
    toChain,
    burnUsdc,
    fastTransfer: transferType === "fast",
  });

  const derived = await deriveAddresses(phrase);
  let txHash = "";
  let explorerUrl = "";

  try {
    if (fromChain === "stellar") {
      // ── Stellar Mainnet -> Base / Ethereum Mainnet via Circle CCTP Soroban ──
      const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
      const sourceKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);
      const sourceAddress = sourceKeypair.publicKey();

      const horizon = getHorizonServer("mainnet");
      const rpc = getSorobanRpcServer("mainnet");

      let account: any;
      try {
        account = await horizon.loadAccount(sourceAddress);
      } catch (loadErr: any) {
        console.log("Failed to bridge", loadErr);
        if (loadErr?.response?.status === 404) {
          return {
            ok: false,
            error: "Stellar account not activated. Please fund your wallet with at least 1 XLM.",
            status: 400,
          };
        }
        return {
          ok: false,
          error: loadErr?.message?.includes("fetch failed")
            ? "Node unreachable. Please check connection and try again."
            : loadErr?.message || "Failed to load Stellar account.",
          status: 502,
        };
      }

      // Verify Stellar XLM balance for gas
      const xlmBal = account.balances.find((b: any) => b.asset_type === "native");
      const xlmAmount = xlmBal ? parseFloat(xlmBal.balance) : 0;
      if (xlmAmount < 1) {
        return {
          ok: false,
          error: `Insufficient XLM balance for network fees (available: ${xlmAmount.toFixed(2)} XLM, need at least 1 XLM)`,
          status: 400,
        };
      }

      // Verify Stellar USDC mainnet balance
      const mainnetUsdcIssuer = CONTRACT_ADDRESSES.stellar.mainnet.USDC;
      const usdcBalObj = account.balances.find(
        (b: any) =>
          b.asset_code === "USDC" &&
          (b.asset_issuer === mainnetUsdcIssuer || !mainnetUsdcIssuer),
      ) || account.balances.find((b: any) => b.asset_code === "USDC");

      const currentBalance = usdcBalObj ? parseFloat(usdcBalObj.balance) : 0;
      const sendAmount = parseFloat(amount);

      if (currentBalance < sendAmount) {
        return {
          ok: false,
          error: `Insufficient USDC balance on Stellar (available: ${currentBalance.toFixed(2)} USDC)`,
          status: 400,
        };
      }

      const stellarCctp = CONTRACT_ADDRESSES.cctp.mainnet.stellar;
      const destCctp =
        toChain === "ethereum"
          ? CONTRACT_ADDRESSES.cctp.mainnet.ethereum
          : CONTRACT_ADDRESSES.cctp.mainnet.base;
      const stellarUsdcContract = stellarCctp.usdc;
      const tokenMessengerContract = stellarCctp.tokenMessenger;

      if (ethereumDeliveryFeeUsdc > 0 && !getStellarFeeCollectorPubkey()) {
        return {
          ok: false,
          error: "Bridging to Ethereum is unavailable right now. Please try again later.",
          status: 503,
        };
      }

      // Stellar USDC uses 7 decimals
      const amountInSubunits =
        usdcToSubunits(sendAmount, 7) - usdcToSubunits(ethereumDeliveryFeeUsdc, 7);

      // 1. Check current allowance for TokenMessengerMinter on Soroban USDC
      const usdcContract = new StellarSdk.Contract(stellarUsdcContract);
      const allowanceOp = usdcContract.call(
        "allowance",
        new StellarSdk.Address(sourceAddress).toScVal(),
        new StellarSdk.Address(tokenMessengerContract).toScVal(),
      );

      const simAccount = new StellarSdk.Account(sourceAddress, "0");
      const simTx = new StellarSdk.TransactionBuilder(simAccount, {
        fee: "100000",
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      })
        .addOperation(allowanceOp)
        .setTimeout(30)
        .build();

      let currentAllowance = BigInt(0);
      try {
        const simRes = await rpc.simulateTransaction(simTx);
        if (StellarSdk.rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
          currentAllowance = BigInt(StellarSdk.scValToNative(simRes.result.retval));
        }
      } catch (e) {
        console.warn("[Bridge] Allowance simulation check note:", e);
      }

      // 2. Submit approve if current allowance is insufficient
      if (currentAllowance < amountInSubunits) {
        const latestLedger = await rpc.getLatestLedger();
        const expirationLedger = latestLedger.sequence + 50000;
        const approvalAmount =
          amountInSubunits * BigInt(100) > BigInt("100000000000")
            ? amountInSubunits * BigInt(100)
            : BigInt("100000000000");

        const approveOp = usdcContract.call(
          "approve",
          new StellarSdk.Address(sourceAddress).toScVal(),
          new StellarSdk.Address(tokenMessengerContract).toScVal(),
          StellarSdk.nativeToScVal(approvalAmount, { type: "i128" }),
          StellarSdk.nativeToScVal(expirationLedger, { type: "u32" }),
        );

        const accForApprove = await rpc.getAccount(sourceAddress);
        await submitSorobanTx({
          rpc,
          sourceAccount: accForApprove,
          keypair: sourceKeypair,
          operation: approveOp,
          networkPassphrase: StellarSdk.Networks.PUBLIC,
        });
      }

      // 3. Submit deposit_for_burn to TokenMessengerMinter
      const accForBurn = await rpc.getAccount(sourceAddress);
      const messengerContract = new StellarSdk.Contract(tokenMessengerContract);

      const destDomain =
        toChain === "solana"
          ? CONTRACT_ADDRESSES.cctp.mainnet.solana.domain
          : toChain === "ethereum"
            ? CONTRACT_ADDRESSES.cctp.mainnet.ethereum.domain
            : CONTRACT_ADDRESSES.cctp.mainnet.base.domain;

      // Convert destination address to 32-byte hex for CCTP mint recipient.
      // Guardrail: On Solana, CCTP strictly requires the recipient's USDC ATA,
      // never the raw wallet address. solanaRecipientToCctpBytes32 enforces this automatically.
      const destBytes32 =
        toChain === "solana"
          ? await solanaRecipientToCctpBytes32(recipientAddress)
          : evmAddressToBytes32(recipientAddress);
      const destBytesBuffer = Buffer.from(destBytes32.replace(/^0x/, ""), "hex");

      const fastTransfer = transferType === "fast";
      const maxFeeSubunits = usdcToSubunits(maxFeeUsdc, 7);
      const finalityThreshold = fastTransfer ? 1000 : 2000;

      const burnOp = messengerContract.call(
        "deposit_for_burn",
        new StellarSdk.Address(sourceAddress).toScVal(),
        StellarSdk.nativeToScVal(amountInSubunits, { type: "i128" }),
        StellarSdk.nativeToScVal(destDomain, { type: "u32" }),
        StellarSdk.xdr.ScVal.scvBytes(destBytesBuffer),
        new StellarSdk.Address(stellarUsdcContract).toScVal(),
        StellarSdk.xdr.ScVal.scvBytes(Buffer.alloc(32)),
        StellarSdk.nativeToScVal(maxFeeSubunits, { type: "i128" }),
        StellarSdk.nativeToScVal(finalityThreshold, { type: "u32" }),
      );

      const burn = await submitSorobanTx({
        rpc,
        sourceAccount: accForBurn,
        keypair: sourceKeypair,
        operation: burnOp,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      });
      txHash = burn.hash;

      // Soroban can't pay and burn in one transaction, so the fee follows a confirmed burn
      if (ethereumDeliveryFeeUsdc > 0) {
        const feeTxHash = burn.confirmed
          ? await collectStellarGasFeeUsdc({
              userKeypair: sourceKeypair,
              amountUsdc: ethereumDeliveryFeeUsdc,
              network: "mainnet",
              memo: ETHEREUM_DELIVERY_MEMO,
            })
          : null;
        if (feeTxHash) {
          console.log(`[Bridge] Collected ${ethereumDeliveryFeeUsdc} USDC Ethereum delivery fee: ${feeTxHash}`);
        } else {
          console.error(`[Bridge] Ethereum delivery fee not collected for Stellar burn ${txHash}`);
        }
      }

      explorerUrl = getExplorerTxUrl("stellar", txHash, false);
    } else if (fromChain === "ethereum" || fromChain === "base") {
      // ── EVM (Base or Ethereum Mainnet) -> Destination Chain ──
      const isEth = fromChain === "ethereum";
      const evmChain = isEth ? mainnet : base;
      const evmRpcUrl = getRpcUrl(isEth ? "ethereum" : "base");
      const evmCctp = isEth
        ? CONTRACT_ADDRESSES.cctp.mainnet.ethereum
        : CONTRACT_ADDRESSES.cctp.mainnet.base;
      const chainLabel = isEth ? "Ethereum" : "Base";

      const evmAccount = mnemonicToAccount(phrase);
      const fallbackUrl = isEth ? "https://eth.drpc.org" : "https://mainnet.base.org";
      const evmTransport = fallback([http(evmRpcUrl), http(fallbackUrl)]);
      const publicClient = createPublicClient({
        chain: evmChain,
        transport: evmTransport,
      });
      const walletClient = createWalletClient({
        account: evmAccount,
        chain: evmChain,
        transport: evmTransport,
      });

      const ethereumDeliveryFeeSubunits = usdcToSubunits(ethereumDeliveryFeeUsdc, evmCctp.decimals);
      const evmFeeCollector = ethereumDeliveryFeeUsdc > 0 ? getEvmFeeCollectorAddress() : null;
      if (ethereumDeliveryFeeUsdc > 0 && !evmFeeCollector) {
        return {
          ok: false,
          error: "Bridging to Ethereum is unavailable right now. Please try again later.",
          status: 503,
        };
      }

      let sendAmount = parseUnits(amount, evmCctp.decimals) - ethereumDeliveryFeeSubunits;
      const fastTransfer = transferType === "fast";
      const maxFeeSubunits = usdcToSubunits(maxFeeUsdc, evmCctp.decimals);
      const finalityThreshold = fastTransfer ? 1000 : 2000;

      // ── Destination Stellar Pre-flight Check & Auto-Activation ──
      let needsStellarActivation = false;
      const activationFeeUsdc = 0.30;
      const activationFeeSubunits = parseUnits(activationFeeUsdc.toString(), evmCctp.decimals);

      if (toChain === "stellar") {
        if (!recipientAddress.startsWith("G") && !recipientAddress.startsWith("C")) {
          return {
            ok: false,
            error: "Invalid Stellar recipient address. Must start with G (account) or C (contract).",
            status: 400,
          };
        }

        const userStellarAddress =
          derived.addresses?.xlm || deriveStellarKeypairFromMnemonic(phrase).publicKey;
        const isOwnStellarWallet =
          recipientAddress.trim().toLowerCase() === userStellarAddress.trim().toLowerCase();

        if (recipientAddress.startsWith("G")) {
          const horizon = getHorizonServer("mainnet");
          try {
            const destAcc = await horizon.loadAccount(recipientAddress);
            const usdcIssuer = CONTRACT_ADDRESSES.stellar.mainnet.USDC;
            const hasTrustline = (destAcc.balances || []).some(
              (b: any) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer,
            );
            if (!hasTrustline) {
              if (isOwnStellarWallet) {
                needsStellarActivation = true;
              } else {
                return {
                  ok: false,
                  error:
                    "Destination external Stellar account is missing the USDC trustline. External wallets must establish a USDC trustline before receiving bridged USDC.",
                  status: 400,
                };
              }
            }
          } catch (err: any) {
            if (err?.response?.status === 404 || err?.status === 404) {
              if (isOwnStellarWallet) {
                needsStellarActivation = true;
              } else {
                return {
                  ok: false,
                  error:
                    "Destination external Stellar account is not activated. On Stellar, external wallets must be funded with at least 1 XLM before they can receive USDC.",
                  status: 400,
                };
              }
            } else {
              throw err;
            }
          }
        }
      }

      // Check EVM ETH balance for gas dynamically based on current gas price and required operations
      const ethBalance = await publicClient.getBalance({
        address: evmAccount.address,
      });

      // Check EVM USDC balance against bridge amount + relayer fee + activation fee
      const usdcBalance = await publicClient.readContract({
        address: evmCctp.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [evmAccount.address],
      });

      const requiredExtraSubunits =
        (needsStellarActivation ? activationFeeSubunits : BigInt(0)) + ethereumDeliveryFeeSubunits;
      const minBridgeSubunits = parseUnits("1.0", evmCctp.decimals);

      if (usdcBalance < sendAmount + maxFeeSubunits + requiredExtraSubunits) {
        if (
          needsStellarActivation &&
          usdcBalance >= minBridgeSubunits + maxFeeSubunits + requiredExtraSubunits
        ) {
          sendAmount = usdcBalance - maxFeeSubunits - requiredExtraSubunits;
          console.log(
            `[Bridge] Adjusted bridge amount to ${(Number(sendAmount) / 10 ** evmCctp.decimals).toFixed(2)} USDC to cover Stellar wallet activation fee (${activationFeeUsdc} USDC).`,
          );
        } else {
          const totalNeededFormatted = (
            Number(sendAmount + maxFeeSubunits + requiredExtraSubunits) /
            10 ** evmCctp.decimals
          ).toFixed(2);
          const availableFormatted = (
            Number(usdcBalance) /
            10 ** evmCctp.decimals
          ).toFixed(2);
          return {
            ok: false,
            error: `Insufficient ${chainLabel} USDC balance (available: ${availableFormatted} USDC, required: ${totalNeededFormatted} USDC${needsStellarActivation ? ` including ${activationFeeUsdc} USDC wallet activation fee` : ""})`,
            status: 400,
          };
        }
      }

      const totalRequiredUsdc = sendAmount + maxFeeSubunits;

      // Check USDC allowance for TokenMessenger on EVM
      const currentAllowance = await publicClient.readContract({
        address: evmCctp.usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: [evmAccount.address, evmCctp.tokenMessenger],
      });

      const needsApprove = currentAllowance < totalRequiredUsdc;
      // depositForBurn on TokenMessengerV2 uses ~110,000 gas; approve uses ~46,000 gas.
      const burnGasUnits = isEth
        ? (needsApprove ? BigInt(200000) : BigInt(150000))
        : (needsApprove ? BigInt(150000) : BigInt(100000));
      const estimatedGasUnits = evmFeeCollector ? burnGasUnits + USDC_TRANSFER_GAS_UNITS : burnGasUnits;
      const gasPrice = await publicClient.getGasPrice();
      const estimatedFeeWei = (gasPrice * estimatedGasUnits * BigInt(12)) / BigInt(10); // 20% safety margin
      const minThresholdWei = isEth ? parseEther("0.0003") : parseEther("0.00001");
      const requiredGasWei = estimatedFeeWei > minThresholdWei ? estimatedFeeWei : minThresholdWei;

      if (ethBalance < requiredGasWei) {
        const requiredEthFormatted = (Number(requiredGasWei) / 1e18).toFixed(6);
        const currentEthFormatted = (Number(ethBalance) / 1e18).toFixed(6);
        return {
          ok: false,
          error: `Insufficient ${chainLabel} ETH for network fees. Required: ~${requiredEthFormatted} ETH, but your balance is ${currentEthFormatted} ETH.`,
          status: 400,
        };
      }

      if (needsApprove) {
        const approveHash = await walletClient.writeContract({
          address: evmCctp.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [evmCctp.tokenMessenger, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // If user's own Stellar account needs activation, transfer the 0.30 USDC activation fee to platform sponsor
      // and invoke ensureStellarAccountActiveAndTrustlined before initiating the burn.
      if (needsStellarActivation) {
        const platformEvmSponsor = "0xA27A9D31635bD73A5DD9fafB6c821769EF022C50";
        try {
          const feeTxHash = await walletClient.writeContract({
            address: evmCctp.usdc,
            abi: erc20Abi,
            functionName: "transfer",
            args: [platformEvmSponsor, activationFeeSubunits],
          });
          await publicClient.waitForTransactionReceipt({ hash: feeTxHash });
          console.log(`[Bridge] Collected ${activationFeeUsdc} USDC Stellar activation fee: ${feeTxHash}`);
        } catch (feeErr: any) {
          console.error("[Bridge] Failed to transfer activation fee:", feeErr);
          return {
            ok: false,
            error: "Failed to process Stellar wallet activation fee payment.",
            status: 500,
          };
        }

        const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
        const stellarKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);
        const actRes = await ensureStellarAccountActiveAndTrustlined(stellarKeypair, "mainnet");
        if (!actRes.ok) {
          return {
            ok: false,
            error: actRes.error || "Failed to activate Stellar account and establish USDC trustline.",
            status: 500,
          };
        }
        console.log(`[Bridge] Successfully activated Stellar account & established USDC trustline for ${recipientAddress}`);
      }

      // Resolve destination CCTP domain and 32-byte recipient address
      let targetDomain: number;
      let targetRecipientBytes32: `0x${string}`;
      let destinationCallerBytes32: `0x${string}` =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      let hookData: `0x${string}` | null = null;

      if (toChain === "stellar") {
        const stellarCctp = CONTRACT_ADDRESSES.cctp.mainnet.stellar;
        targetDomain = stellarCctp.domain;
        // On Stellar, CCTP routes through Circle's CctpForwarder contract
        targetRecipientBytes32 = stellarAddressToBytes32(stellarCctp.cctpForwarder);
        destinationCallerBytes32 = stellarAddressToBytes32(stellarCctp.cctpForwarder);
        hookData = buildStellarForwarderHookData(recipientAddress);
      } else if (toChain === "solana") {
        targetDomain = CONTRACT_ADDRESSES.cctp.mainnet.solana.domain;
        // Guardrail: On Solana, CCTP strictly requires the recipient's USDC ATA,
        // never the raw wallet address.
        targetRecipientBytes32 = await solanaRecipientToCctpBytes32(recipientAddress);
      } else {
        const destCctp =
          toChain === "ethereum"
            ? CONTRACT_ADDRESSES.cctp.mainnet.ethereum
            : CONTRACT_ADDRESSES.cctp.mainnet.base;
        targetDomain = destCctp.domain;
        targetRecipientBytes32 = evmAddressToBytes32(recipientAddress);
      }

      // Circle CCTP V2 TokenMessenger ABI supporting both standard and hook-based deposits
      const tokenMessengerV2Abi = [
        {
          type: "function",
          name: "depositForBurn",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "maxFee", type: "uint256" },
            { name: "minFinalityThreshold", type: "uint32" },
          ],
          outputs: [{ name: "_nonce", type: "uint64" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "depositForBurnWithHook",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "destinationCaller", type: "bytes32" },
            { name: "maxFee", type: "uint256" },
            { name: "minFinalityThreshold", type: "uint32" },
            { name: "hookData", type: "bytes" },
          ],
          outputs: [{ name: "_nonce", type: "uint64" }],
          stateMutability: "nonpayable",
        },
      ] as const;

      if (hookData) {
        txHash = await walletClient.writeContract({
          address: evmCctp.tokenMessenger,
          abi: tokenMessengerV2Abi,
          functionName: "depositForBurnWithHook",
          args: [
            sendAmount,
            targetDomain,
            targetRecipientBytes32,
            evmCctp.usdc,
            destinationCallerBytes32,
            maxFeeSubunits,
            finalityThreshold,
            hookData,
          ],
        });
      } else {
        txHash = await walletClient.writeContract({
          address: evmCctp.tokenMessenger,
          abi: tokenMessengerV2Abi,
          functionName: "depositForBurn",
          args: [
            sendAmount,
            targetDomain,
            targetRecipientBytes32,
            evmCctp.usdc,
            destinationCallerBytes32,
            maxFeeSubunits,
            finalityThreshold,
          ],
        });
      }

      // Paid only once the burn lands, so a reverted burn never costs the user the fee
      if (evmFeeCollector) {
        try {
          const burnReceipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          if (burnReceipt.status === "success") {
            const feeTxHash = await walletClient.writeContract({
              address: evmCctp.usdc,
              abi: erc20Abi,
              functionName: "transfer",
              args: [evmFeeCollector, ethereumDeliveryFeeSubunits],
            });
            console.log(`[Bridge] Collected ${ethereumDeliveryFeeUsdc} USDC Ethereum delivery fee: ${feeTxHash}`);
          } else {
            console.error(`[Bridge] Burn ${txHash} reverted; Ethereum delivery fee not collected`);
          }
        } catch (feeErr) {
          console.error(
            `[Bridge] Ethereum delivery fee not collected for burn ${txHash}: ${formatOneLineError(feeErr)}`,
          );
        }
      }

      explorerUrl = getExplorerTxUrl(isEth ? "ethereum" : "base", txHash, false);
    } else {
      // ── Solana Mainnet Source ──
      const seed = bip39.mnemonicToSeedSync(phrase);
      const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
      const ownerKeypair = await SolanaKeypair.fromSeed(solDerived);

      const solanaCctp = CONTRACT_ADDRESSES.cctp.mainnet.solana;
      const ethereumDeliveryFeeSubunits = usdcToSubunits(ethereumDeliveryFeeUsdc, solanaCctp.decimals);
      let sendAmountSubunits =
        usdcToSubunits(parseFloat(amount), solanaCctp.decimals) - ethereumDeliveryFeeSubunits;

      // ── Destination Stellar Pre-flight Check & Auto-Activation ──
      let needsStellarActivation = false;
      const activationFeeUsdc = 0.30;
      const activationFeeSubunits = BigInt(Math.round(activationFeeUsdc * 10 ** solanaCctp.decimals));

      if (toChain === "stellar") {
        if (!recipientAddress.startsWith("G") && !recipientAddress.startsWith("C")) {
          return {
            ok: false,
            error: "Invalid Stellar recipient address. Must start with G (account) or C (contract).",
            status: 400,
          };
        }

        const userStellarAddress =
          derived.addresses?.xlm || deriveStellarKeypairFromMnemonic(phrase).publicKey;
        const isOwnStellarWallet =
          recipientAddress.trim().toLowerCase() === userStellarAddress.trim().toLowerCase();

        if (recipientAddress.startsWith("G")) {
          const horizon = getHorizonServer("mainnet");
          try {
            const destAcc = await horizon.loadAccount(recipientAddress);
            const usdcIssuer = CONTRACT_ADDRESSES.stellar.mainnet.USDC;
            const hasTrustline = (destAcc.balances || []).some(
              (b: any) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer,
            );
            if (!hasTrustline) {
              if (isOwnStellarWallet) {
                needsStellarActivation = true;
              } else {
                return {
                  ok: false,
                  error:
                    "Destination external Stellar account is missing the USDC trustline. External wallets must establish a USDC trustline before receiving bridged USDC.",
                  status: 400,
                };
              }
            }
          } catch (err: any) {
            if (err?.response?.status === 404 || err?.status === 404) {
              if (isOwnStellarWallet) {
                needsStellarActivation = true;
              } else {
                return {
                  ok: false,
                  error:
                    "Destination external Stellar account is not activated. On Stellar, external wallets must be funded with at least 1 XLM before they can receive USDC.",
                  status: 400,
                };
              }
            } else {
              throw err;
            }
          }
        }
      }

      // Pre-flight check: determine if user has enough SOL or if gas abstraction should be activated
      const solConnection = new Connection(getSolanaRpcUrl(), "confirmed");
      const solLamports = await solConnection.getBalance(ownerKeypair.publicKey);
      const MIN_REQUIRED_LAMPORTS = BigInt(2850000); // ~0.00285 SOL for CCTP event rent + gas

      let sponsorKeypair: SolanaKeypair | undefined = undefined;
      // Paid to Jumpa in the same transaction as the burn
      let feeSubunits = ethereumDeliveryFeeSubunits;

      const userAta = await getSolanaUsdcAta(ownerKeypair.publicKey.toBase58());
      const ataBalanceRes = await solConnection
        .getTokenAccountBalance(new PublicKey(userAta))
        .catch(() => null);
      const availableUsdc = ataBalanceRes?.value?.uiAmount ?? 0;

      if (solLamports < MIN_REQUIRED_LAMPORTS) {
        // User does not have enough SOL: activate Gas Abstraction
        const platformSponsor = await getSolanaSponsorKeypair();
        if (!platformSponsor) {
          return {
            ok: false,
            error: "Solana gas sponsorship is currently unavailable on the server.",
            status: 500,
          };
        }
        sponsorKeypair = platformSponsor;

        const numNetworkFee = parseFloat(networkFee || "0.32");
        const extraActivationFee = needsStellarActivation ? activationFeeUsdc : 0;
        const totalExtraFee = numNetworkFee + extraActivationFee;
        feeSubunits += usdcToSubunits(totalExtraFee, solanaCctp.decimals);

        const minBridgeSubunits = BigInt(1_000_000); // 1.0 USDC
        const requiredSubunits = sendAmountSubunits + feeSubunits;
        const availableSubunits = BigInt(Math.round(availableUsdc * 10 ** solanaCctp.decimals));

        if (availableSubunits < requiredSubunits) {
          if (
            needsStellarActivation &&
            availableSubunits >= minBridgeSubunits + feeSubunits
          ) {
            sendAmountSubunits = availableSubunits - feeSubunits;
            console.log(
              `[Bridge] Adjusted Solana bridge amount to ${Number(sendAmountSubunits) / 1e6} USDC to cover activation fee.`,
            );
          } else {
            return {
              ok: false,
              error: `Insufficient USDC balance for bridge amount and network/activation fees (available: ${availableUsdc.toFixed(2)} USDC, need ${(Number(requiredSubunits) / 1e6).toFixed(2)} USDC)`,
              status: 400,
            };
          }
        }
      }

      // Activate Stellar account & trustline if needed before burning on Solana
      if (needsStellarActivation) {
        const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
        const stellarKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);
        const actRes = await ensureStellarAccountActiveAndTrustlined(stellarKeypair, "mainnet");
        if (!actRes.ok) {
          return {
            ok: false,
            error: actRes.error || "Failed to activate destination Stellar account and USDC trustline.",
            status: 500,
          };
        }
        console.log(`[Bridge] Successfully activated Stellar account & established USDC trustline for ${recipientAddress}`);
      }

      // Resolve destination CCTP domain and 32-byte recipient
      let destDomain: number;
      let targetRecipientBytes32: `0x${string}`;

      let destCallerBytes32: `0x${string}` | undefined = undefined;
      let hookHex: `0x${string}` | undefined = undefined;

      if (toChain === "stellar") {
        const stellarCctp = CONTRACT_ADDRESSES.cctp.mainnet.stellar;
        destDomain = stellarCctp.domain;
        targetRecipientBytes32 = stellarAddressToBytes32(stellarCctp.cctpForwarder);
        destCallerBytes32 = stellarAddressToBytes32(stellarCctp.cctpForwarder);
        hookHex = buildStellarForwarderHookData(recipientAddress);
      } else if (toChain === "ethereum") {
        destDomain = CONTRACT_ADDRESSES.cctp.mainnet.ethereum.domain;
        targetRecipientBytes32 = evmAddressToBytes32(recipientAddress);
      } else {
        destDomain = CONTRACT_ADDRESSES.cctp.mainnet.base.domain;
        targetRecipientBytes32 = evmAddressToBytes32(recipientAddress);
      }

      const burnResult = await submitSolanaDepositForBurn({
        ownerKeypair,
        amountSubunits: sendAmountSubunits,
        destinationDomain: destDomain,
        mintRecipientBytes32: targetRecipientBytes32,
        destinationCallerBytes32: destCallerBytes32,
        hookDataHex: hookHex,
        sponsorKeypair,
        feeSubunits,
      });

      if (!burnResult.ok || !burnResult.txHash) {
        return {
          ok: false,
          error: burnResult.error || "Failed to burn USDC on Solana",
          status: 500,
        };
      }

      txHash = burnResult.txHash;
      explorerUrl = getExplorerTxUrl("solana", txHash, false);
    }

    const CHAIN_DISPLAY_NAMES: Record<BridgeChain, string> = {
      stellar: "Stellar",
      base: "Base",
      ethereum: "Ethereum",
      solana: "Solana",
    };
    const fromDisplayName = CHAIN_DISPLAY_NAMES[fromChain];
    const toDisplayName = CHAIN_DISPLAY_NAMES[toChain];

    // 2. Persist in database
    await connectDB();
    await Transaction.create({
      userId,
      walletId: wallet._id,
      type: "BRIDGE",
      status: "PENDING",
      chain: fromChain,
      network: "mainnet",
      fromAddress:
        fromChain === "stellar"
          ? derived.addresses.xlm
          : derived.addresses.eth || derived.addresses.base,
      toAddress: recipientAddress,
      amount,
      amountInUsd: parseFloat(amount) || 0,
      token: "USDC",
      txHash,
      explorerUrl,
      bridgeDetails: {
        provider: "circle_cctp_v2",
        fromChain: fromDisplayName,
        toChain: toDisplayName,
        fromToken: "USDC",
        toToken: "USDC",
        fromAmount: amount,
        toAmount,
        fee,
        relayerFee: transferType === "fast" ? fee : "0.00",
      },
    });

    // 3. Mint on the destination chain once Circle attests the burn
    const sourceDomain = CCTP_DOMAINS[fromChain];
    if (toChain === "ethereum" || toChain === "base") {
      relayCctpTransferToEvm({
        burnTxHash: txHash,
        sourceDomain,
        destination: toChain,
        userId,
        amount: toAmount,
      });
    } else if (toChain === "solana") {
      relayToSolana({
        txHash,
        userId,
        amount: toAmount,
        sourceDomain,
        recipientWallet: recipientAddress,
      });
    } else if (toChain === "stellar") {
      relayToStellar({
        txHash,
        userId,
        amount: toAmount,
        sourceDomain,
      });
    }

    return {
      ok: true,
      txHash,
      explorerUrl,
      fromChain: fromDisplayName,
      toChain: toDisplayName,
      sentAmount: amount,
      receivedAmount: toAmount,
      recipientAddress,
      status: "pending",
    };
  } catch (err: any) {
    console.error("[Bridge Execute Error]", err);
    return {
      ok: false,
      error: err?.message || "Failed to execute bridge transfer",
      status: 500,
    };
  }
}
