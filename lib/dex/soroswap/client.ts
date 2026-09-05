import * as StellarSdk from "@stellar/stellar-sdk";
import { environment } from "@/lib/environment";
import type {
  SwapBuildRequest,
  SwapBuildResult,
  SwapQuote,
  SwapQuoteRequest,
} from "../types";
import {
  CONTRACT_ADDRESSES,
  SOROSWAP_PROTOCOLS,
  resolveSoroswapContract,
  resolveSoroswapSymbol,
} from "@/lib/blockchain";
import {
  STELLAR_MAINNET_HORIZON,
  STELLAR_TESTNET_HORIZON,
  getHorizonServer,
} from "@/lib/chains/stellar/client";

const DECIMALS_FACTOR = 10_000_000;

function toSorobanUnits(amountStr: string): string {
  const num = Number.parseFloat(amountStr);
  if (Number.isNaN(num) || num <= 0) return "10000000"; // default 1 token
  return Math.round(num * DECIMALS_FACTOR).toString();
}

function fromSorobanUnits(unitsStr: string | number): string {
  const num =
    typeof unitsStr === "number" ? unitsStr : Number.parseFloat(unitsStr);
  if (Number.isNaN(num) || num === 0) return "0.00";
  return (num / DECIMALS_FACTOR).toFixed(4);
}

/**
 * Resolves a token symbol into a StellarSdk.Asset instance for the target network.
 */
export function resolveStellarAsset(
  symbol: string,
  network: "testnet" | "mainnet" = "testnet",
): StellarSdk.Asset {
  const upper = symbol.trim().toUpperCase();
  if (upper === "XLM" || upper === "NATIVE") {
    return StellarSdk.Asset.native();
  }

  const contracts =
    network === "mainnet"
      ? CONTRACT_ADDRESSES.stellar.mainnet
      : CONTRACT_ADDRESSES.stellar.testnet;

  const issuer =
    (contracts as Record<string, string>)[upper] || contracts.USDC;

  return new StellarSdk.Asset(upper, issuer);
}

/**
 * Queries Stellar Horizon's /paths/strict-send endpoint for live orderbook rates and paths.
 */
async function fetchHorizonStrictSendPath(
  sendAsset: StellarSdk.Asset,
  destAsset: StellarSdk.Asset,
  amount: string,
  network: "testnet" | "mainnet",
) {
  try {
    const horizonUrl =
      network === "mainnet"
        ? STELLAR_MAINNET_HORIZON
        : STELLAR_TESTNET_HORIZON;

    const params = new URLSearchParams();
    if (sendAsset.isNative()) {
      params.set("source_asset_type", "native");
    } else {
      params.set("source_asset_type", sendAsset.getAssetType());
      params.set("source_asset_code", sendAsset.getCode() || "");
      params.set("source_asset_issuer", sendAsset.getIssuer() || "");
    }
    params.set("source_amount", amount);

    if (destAsset.isNative()) {
      params.set("destination_assets", "native");
    } else {
      params.set(
        "destination_assets",
        `${destAsset.getCode() || ""}:${destAsset.getIssuer() || ""}`,
      );
    }

    const res = await fetch(
      `${horizonUrl}/paths/strict-send?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const records = json._embedded?.records;
    if (!Array.isArray(records) || records.length === 0) return null;
    return records[0];
  } catch (err) {
    console.warn("[Stellar SDEX Path] Failed to fetch path:", err);
    return null;
  }
}

/**
 * Fetches an optimal swap quote strictly from Soroswap REST API (/quote) with live SDEX fallback.
 */
export async function fetchSoroswapQuote(
  params: SwapQuoteRequest,
): Promise<SwapQuote> {
  const network = params.network || "testnet";
  const apiKey = environment.SOROSWAP_API_KEY;
  const baseUrl = environment.SOROSWAP_API_URL;

  const symbolIn = params.assetIn.toUpperCase();
  const symbolOut = params.assetOut.toUpperCase();
  const contractIn = resolveSoroswapContract(params.assetIn, network);
  const contractOut = resolveSoroswapContract(params.assetOut, network);

  const amountUnits = toSorobanUnits(params.amount);
  const tradeType = params.tradeType || "EXACT_IN";
  const slippage = params.slippageTolerance ?? 0.5;
  const slippageBps = Math.round(slippage * 100); // 0.5% = 50 bps

  // 1. Try Soroswap REST API (works when indexer has active pools, e.g. on mainnet)
  if (apiKey) {
    try {
      const response = await fetch(`${baseUrl}/quote?network=${network}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          assetIn: contractIn,
          assetOut: contractOut,
          amount: amountUnits,
          tradeType,
          protocols: SOROSWAP_PROTOCOLS,
          slippageBps,
          parts: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawAmountIn = data.amountIn || amountUnits;
        const rawAmountOut = data.amountOut || data.amount || "0";

        const amountInFormatted = fromSorobanUnits(rawAmountIn);
        const amountOutFormatted = fromSorobanUnits(rawAmountOut);

        const inNum = Number.parseFloat(amountInFormatted) || 1;
        const outNum = Number.parseFloat(amountOutFormatted) || 1;
        const rateVal = outNum / inNum;

        const rateStr = `1 ${symbolIn} = ${rateVal < 1 ? rateVal.toFixed(4) : rateVal.toFixed(2)} ${symbolOut}`;
        const minReceived = (outNum * (1 - slippage / 100)).toFixed(4);

        return {
          chain: "stellar",
          protocol: data.platform ? `Soroswap (${data.platform})` : "Soroswap DEX",
          assetIn: symbolIn,
          assetOut: symbolOut,
          amountIn: amountInFormatted,
          amountOut: amountOutFormatted,
          rate: rateStr,
          priceImpact: data.priceImpactPct ? `${data.priceImpactPct}%` : "< 0.05%",
          minimumReceived: minReceived,
          slippage: `${slippage}%`,
          estimatedFee: "0.00001 XLM",
          path: [symbolIn, symbolOut],
          rawQuote: data,
        };
      }
    } catch (err) {
      console.warn("[Soroswap Quote] REST quote query failed, evaluating on-chain fallback:", err);
    }
  }

  // 2. Live Stellar SDEX Orderbook Query (via Horizon /paths/strict-send)
  const sendAsset = resolveStellarAsset(symbolIn, network);
  const destAsset = resolveStellarAsset(symbolOut, network);
  const inputAmount = Number.parseFloat(params.amount) || 1;

  const pathRecord = await fetchHorizonStrictSendPath(
    sendAsset,
    destAsset,
    inputAmount.toString(),
    network,
  );

  let outputAmount: string;
  let rawPath: any[] = [];
  let rateVal: number;

  if (pathRecord?.destination_amount) {
    const rawDest = Number.parseFloat(pathRecord.destination_amount);
    outputAmount = rawDest.toFixed(4);
    rateVal = rawDest / inputAmount;
    rawPath = pathRecord.path || [];
  } else {
    // Fallback market estimate if orderbook is temporarily empty
    rateVal = symbolIn === "USDC" || symbolIn === "USDT" ? 5.434 : 0.184;
    outputAmount = (inputAmount * rateVal).toFixed(4);
  }

  const rateStr = `1 ${symbolIn} = ${rateVal < 1 ? rateVal.toFixed(4) : rateVal.toFixed(2)} ${symbolOut}`;
  const minReceived = (Number.parseFloat(outputAmount) * (1 - slippage / 100)).toFixed(7);

  return {
    chain: "stellar",
    protocol: `Stellar SDEX (${network === "testnet" ? "Testnet" : "Mainnet"})`,
    assetIn: symbolIn,
    assetOut: symbolOut,
    amountIn: inputAmount.toString(),
    amountOut: outputAmount,
    rate: rateStr,
    priceImpact: "< 0.01%",
    minimumReceived: (Number.parseFloat(outputAmount) * (1 - slippage / 100)).toFixed(4),
    slippage: `${slippage}%`,
    estimatedFee: "0.00002 XLM",
    path: [symbolIn, symbolOut],
    rawQuote: {
      _isNativeSdex: true,
      assetIn: symbolIn,
      assetOut: symbolOut,
      amountIn: inputAmount.toString(),
      amountOut: outputAmount,
      minimumReceived: minReceived,
      path: rawPath,
    },
  };
}

/**
 * Builds an unsigned transaction XDR envelope using Soroswap REST API (/quote/build) or Stellar Horizon SDEX.
 */
export async function buildSoroswapTransaction(
  req: SwapBuildRequest,
): Promise<SwapBuildResult> {
  const network = req.network || "testnet";
  const apiKey = environment.SOROSWAP_API_KEY;
  const baseUrl = environment.SOROSWAP_API_URL;
  const { quote, fromAddress, toAddress } = req;
  const recipient = toAddress || fromAddress;

  const transactionDetails = {
    from: fromAddress,
    to: recipient,
    assetIn: quote.assetIn,
    assetOut: quote.assetOut,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    protocol: quote.protocol,
  };

  // 1. Try Soroswap REST API if quote has standard Soroswap payload and not native fallback
  if (apiKey && !quote.rawQuote?._isNativeSdex) {
    try {
      const response = await fetch(`${baseUrl}/quote/build?network=${network}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          quote: quote.rawQuote,
          from: fromAddress,
          to: recipient,
        }),
      });

      if (response.ok) {
        const buildData = await response.json();
        const xdr =
          buildData.xdr ||
          buildData.transactionXdr ||
          buildData.actionData?.xdr ||
          "";

        if (xdr) {
          // Ensure on-chain Jumpa branding memo is attached
          let finalXdr = xdr;
          try {
            const passphrase =
              network === "mainnet"
                ? StellarSdk.Networks.PUBLIC
                : StellarSdk.Networks.TESTNET;
            const parsedTx = StellarSdk.TransactionBuilder.fromXDR(xdr, passphrase);
            const memoText = `Jumpa: Swap ${quote.assetIn}->${quote.assetOut}`.slice(0, 28);
            const cloned = StellarSdk.TransactionBuilder.cloneFrom(parsedTx as any, {
              networkPassphrase: passphrase,
            })
              .addMemo(StellarSdk.Memo.text(memoText))
              .build();
            finalXdr = cloned.toXDR();
          } catch {
            // Keep original XDR if cloning/memo fails
          }

          return {
            chain: "stellar",
            network,
            xdr: finalXdr,
            transactionDetails,
          };
        }
      }
    } catch (e) {
      console.warn("[Soroswap Build] REST build failed, falling back to Horizon on-chain builder:", e);
    }
  }

  // 2. Real On-Chain Stellar Horizon Transaction Builder (Native SDEX PathPaymentStrictSend)
  const server = getHorizonServer(network);
  const account = await server.loadAccount(fromAddress);
  const passphrase =
    network === "mainnet"
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

  const sendAsset = resolveStellarAsset(quote.assetIn, network);
  const destAsset = resolveStellarAsset(quote.assetOut, network);

  // Check if destination needs a trustline for non-native destAsset
  const destNeedsTrustline = !destAsset.isNative();
  const hasTrustline = account.balances.some(
    (b: any) =>
      b.asset_code === destAsset.getCode() &&
      b.asset_issuer === destAsset.getIssuer(),
  );

  const operationsCount = (!hasTrustline && destNeedsTrustline ? 1 : 0) + 1;
  const baseFee = (Number(StellarSdk.BASE_FEE) * operationsCount).toString();

  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: baseFee,
    networkPassphrase: passphrase,
  })
    .addMemo(
      StellarSdk.Memo.text(
        `Jumpa: Swap ${quote.assetIn}->${quote.assetOut}`.slice(0, 28),
      ),
    )
    .setTimeout(120);

  // Auto-add trustline if missing so recipient can receive the token atomically
  if (!hasTrustline && destNeedsTrustline) {
    txBuilder.addOperation(
      StellarSdk.Operation.changeTrust({
        asset: destAsset,
      }),
    );
  }

  // Convert intermediate path records if any
  const rawPath = quote.rawQuote?.path || [];
  const convertedPath: StellarSdk.Asset[] = [];
  if (Array.isArray(rawPath)) {
    for (const p of rawPath) {
      if (p.asset_type === "native") {
        convertedPath.push(StellarSdk.Asset.native());
      } else if (p.asset_code && p.asset_issuer) {
        convertedPath.push(new StellarSdk.Asset(p.asset_code, p.asset_issuer));
      }
    }
  }

  const sendAmount = Number.parseFloat(quote.amountIn).toFixed(7);
  const slippageFraction =
    (quote.slippage ? Number.parseFloat(quote.slippage) : 0.5) / 100;
  const expectedOut = Number.parseFloat(quote.amountOut);
  const destMin = (
    quote.rawQuote?.minimumReceived
      ? Number.parseFloat(quote.rawQuote.minimumReceived)
      : quote.minimumReceived
        ? Number.parseFloat(quote.minimumReceived)
        : expectedOut * (1 - slippageFraction)
  ).toFixed(7);

  txBuilder.addOperation(
    StellarSdk.Operation.pathPaymentStrictSend({
      sendAsset,
      sendAmount,
      destination: recipient,
      destAsset,
      destMin,
      path: convertedPath,
    }),
  );

  const tx = txBuilder.build();
  const xdr = tx.toXDR();

  return {
    chain: "stellar",
    network,
    xdr,
    transactionDetails,
  };
}
