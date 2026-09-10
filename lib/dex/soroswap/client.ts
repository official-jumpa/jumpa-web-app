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
  getSorobanRpcServer,
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
  return (num / DECIMALS_FACTOR).toFixed(7);
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
 * Queries Soroswap Router via Soroban RPC simulation (router_get_amounts_out).
 * Directly inspects real-time Soroban pool depth without relying on the external REST indexer.
 */
async function fetchSoroswapOnChainQuote(
  contractIn: string,
  contractOut: string,
  amountUnits: string,
  network: "testnet" | "mainnet",
): Promise<{ amountOutUnits: string; estimatedFee: string } | null> {
  try {
    const routerAddress =
      (CONTRACT_ADDRESSES.soroswap as any)[network]?.ROUTER;
    if (!routerAddress) return null;

    const rpc = getSorobanRpcServer(network);
    const contract = new StellarSdk.Contract(routerAddress);
    const dummyKey = StellarSdk.Keypair.random();

    const pathVec = StellarSdk.xdr.ScVal.scvVec([
      new StellarSdk.Address(contractIn).toScVal(),
      new StellarSdk.Address(contractOut).toScVal(),
    ]);

    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(dummyKey.publicKey(), "0"),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase:
          network === "mainnet"
            ? StellarSdk.Networks.PUBLIC
            : StellarSdk.Networks.TESTNET,
      },
    )
      .addOperation(
        contract.call(
          "router_get_amounts_out",
          StellarSdk.nativeToScVal(BigInt(amountUnits), { type: "i128" }),
          pathVec,
        ),
      )
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const amounts = StellarSdk.scValToNative(sim.result.retval);
      if (Array.isArray(amounts) && amounts.length >= 2) {
        // Calculate real on-chain fee from Soroban RPC simulation
        const minResourceFee = BigInt(sim.minResourceFee || "14000");
        const inclusionFee = BigInt(StellarSdk.BASE_FEE || "100");
        const totalFeeStroops = minResourceFee + inclusionFee;
        const estimatedFee = `${(Number(totalFeeStroops) / 10_000_000).toFixed(5)} XLM`;

        return {
          amountOutUnits: amounts[amounts.length - 1].toString(),
          estimatedFee,
        };
      }
    }
    return null;
  } catch (err) {
    console.warn("[Soroswap On-Chain Quote] RPC simulation error:", err);
    return null;
  }
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
 * Fetches an optimal swap quote strictly using on-chain Soroswap Router simulation or live SDEX.
 *  */
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
  const slippage = params.slippageTolerance ?? 0.5;

  // Direct On-Chain Soroswap Router Query
  const onChainQuote = await fetchSoroswapOnChainQuote(
    contractIn,
    contractOut,
    amountUnits,
    network,
  );

  if (onChainQuote) {
    const rawOutFormatted = fromSorobanUnits(onChainQuote.amountOutUnits);
    const inNum = Number.parseFloat(params.amount) || 1;
    const outNum = Number.parseFloat(rawOutFormatted) || 0;
    const rateVal = outNum / inNum;

    const rateStr = `1 ${symbolIn} = ${rateVal < 1 ? rateVal.toFixed(4) : rateVal.toFixed(2)} ${symbolOut}`;
    const minReceivedNum = outNum * (1 - slippage / 100);
    const minReceivedStr = minReceivedNum.toFixed(7);
    const minReceivedUnits = BigInt(Math.floor(Number(onChainQuote.amountOutUnits) * (1 - slippage / 100))).toString();

    const routerAddress = (CONTRACT_ADDRESSES.soroswap as any)[network]?.ROUTER;

    return {
      chain: "stellar",
      protocol: `Soroswap Router`,
      assetIn: symbolIn,
      assetOut: symbolOut,
      amountIn: params.amount,
      amountOut: Number.parseFloat(rawOutFormatted).toFixed(4),
      rate: rateStr,
      priceImpact: "< 0.05%",
      minimumReceived: minReceivedStr,
      slippage: `${slippage}%`,
      estimatedFee: onChainQuote.estimatedFee,
      path: [symbolIn, symbolOut],
      rawQuote: {
        _isSoroswapRouter: true,
        network,
        routerAddress,
        contractIn,
        contractOut,
        amountInUnits: amountUnits,
        amountOutUnits: onChainQuote.amountOutUnits,
        minimumReceivedUnits: minReceivedUnits,
        pathContracts: [contractIn, contractOut],
        pathSymbols: [symbolIn, symbolOut],
        amountIn: params.amount,
        amountOut: rawOutFormatted,
        minimumReceived: minReceivedStr,
        estimatedFee: onChainQuote.estimatedFee,
      },
    };
  }

  // Try Soroswap REST API if available (e.g., active on mainnet)
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
          tradeType: params.tradeType || "EXACT_IN",
          protocols: SOROSWAP_PROTOCOLS,
          slippageBps: Math.round(slippage * 100),
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
        const minReceived = (outNum * (1 - slippage / 100)).toFixed(7);

        return {
          chain: "stellar",
          protocol: data.platform ? `Soroswap (${data.platform})` : "Soroswap DEX",
          assetIn: symbolIn,
          assetOut: symbolOut,
          amountIn: amountInFormatted,
          amountOut: Number.parseFloat(amountOutFormatted).toFixed(4),
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
      console.warn("[Soroswap Quote] REST quote query error:", err);
    }
  }

  // Live Stellar SDEX Orderbook Query (via Horizon /paths/strict-send)
  const sendAsset = resolveStellarAsset(symbolIn, network);
  const destAsset = resolveStellarAsset(symbolOut, network);
  const inputAmount = Number.parseFloat(params.amount) || 1;

  const pathRecord = await fetchHorizonStrictSendPath(
    sendAsset,
    destAsset,
    inputAmount.toString(),
    network,
  );

  // If orderbook has no offers or route, throw an explicit error
  if (!pathRecord?.destination_amount) {
    throw new Error(
      `Insufficient liquidity: No trade path or orderbook offers found on Stellar ${network} for ${symbolIn} → ${symbolOut}. Try a smaller amount or a different pair.`,
    );
  }

  const rawDest = Number.parseFloat(pathRecord.destination_amount);
  const outputAmount = rawDest.toFixed(4);
  const rateVal = rawDest / inputAmount;
  const rawPath = pathRecord.path || [];

  const rateStr = `1 ${symbolIn} = ${rateVal < 1 ? rateVal.toFixed(4) : rateVal.toFixed(2)} ${symbolOut}`;
  const minReceived = (rawDest * (1 - slippage / 100)).toFixed(7);

  return {
    chain: "stellar",
    protocol: `Stellar SDEX (${network === "testnet" ? "Testnet" : "Mainnet"})`,
    assetIn: symbolIn,
    assetOut: symbolOut,
    amountIn: inputAmount.toString(),
    amountOut: outputAmount,
    rate: rateStr,
    priceImpact: "< 0.01%",
    minimumReceived: (rawDest * (1 - slippage / 100)).toFixed(4),
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
 * Builds an unsigned transaction XDR envelope using Soroswap Soroban Router, Soroswap REST API, or Horizon SDEX.
 */
export async function buildSoroswapTransaction(
  req: SwapBuildRequest,
): Promise<SwapBuildResult> {
  const network = req.network || "testnet";
  const { quote, fromAddress, toAddress } = req;
  const recipient = toAddress || fromAddress;

  const raw = (quote as any)?.rawQuote || quote || {};
  const isRouter = raw?._isSoroswapRouter === true;
  const isNativeSdex = raw?._isNativeSdex === true;

  const assetIn =
    quote?.assetIn ||
    raw?.assetIn ||
    (Array.isArray(raw?.pathSymbols) ? raw.pathSymbols[0] : "") ||
    "XLM";
  const assetOut =
    quote?.assetOut ||
    raw?.assetOut ||
    (Array.isArray(raw?.pathSymbols) ? raw.pathSymbols[1] : "") ||
    "USDC";
  const amountIn = quote?.amountIn || raw?.amountIn || "0";
  const amountOut = quote?.amountOut || raw?.amountOut || "0";
  const protocol =
    quote?.protocol || (isRouter ? "Soroswap Router" : "Stellar DEX");

  const transactionDetails = {
    from: fromAddress,
    to: recipient,
    assetIn,
    assetOut,
    amountIn,
    amountOut,
    protocol,
  };

  // On-Chain Soroswap Soroban Router Transaction (invoke_host_function)
  if (isRouter) {
    const routerAddress =
      raw.routerAddress ||
      (CONTRACT_ADDRESSES.soroswap as any)[network]?.ROUTER;
    if (!routerAddress) {
      throw new Error(`Soroswap Router contract address not configured for ${network}`);
    }

    const rpc = getSorobanRpcServer(network);
    const horizonServer = getHorizonServer(network);
    const account = await horizonServer.loadAccount(fromAddress);
    const passphrase =
      network === "mainnet"
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    const contract = new StellarSdk.Contract(routerAddress);
    const pathContracts = raw.pathContracts || [
      resolveSoroswapContract(assetIn, network),
      resolveSoroswapContract(assetOut, network),
    ];
    const pathVec = StellarSdk.xdr.ScVal.scvVec(
      pathContracts.map((c: string) => new StellarSdk.Address(c).toScVal()),
    );

    const amountInBig = BigInt(
      raw.amountInUnits || toSorobanUnits(amountIn),
    );
    const minReceivedStr = quote?.minimumReceived || raw.minimumReceived || amountOut;
    const amountOutMinBig = BigInt(
      raw.minimumReceivedUnits ||
      toSorobanUnits(minReceivedStr),
    );
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

    const swapOp = contract.call(
      "swap_exact_tokens_for_tokens",
      StellarSdk.nativeToScVal(amountInBig, { type: "i128" }),
      StellarSdk.nativeToScVal(amountOutMinBig, { type: "i128" }),
      pathVec,
      new StellarSdk.Address(recipient).toScVal(),
      StellarSdk.nativeToScVal(deadline, { type: "u64" }),
    );

    const baseTx = new StellarSdk.TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: passphrase,
    })
      .addOperation(swapOp)
      .setTimeout(60)
      .build();

    const sim = await rpc.simulateTransaction(baseTx);
    if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
      const simStr = JSON.stringify(sim);
      console.error("[Soroswap Build] Simulation failed details:", simStr);

      if (
        simStr.includes("resulting balance is not within the allowed range") ||
        simStr.includes("Error(Contract, #10)") ||
        simStr.includes("Contract, #10")
      ) {
        throw new Error(
          `Insufficient ${assetIn} balance: your account does not have enough ${assetIn} to execute this swap.`,
        );
      }
      if (
        simStr.includes("trustline entry is missing") ||
        simStr.includes("Error(Contract, #13)") ||
        simStr.includes("Contract, #13")
      ) {
        throw new Error(
          `Missing trustline for ${assetOut}. Please establish a trustline before swapping.`,
        );
      }
      if (simStr.includes("expired") || simStr.includes("deadline")) {
        throw new Error(
          "Swap quote expired. Please request a fresh quote and try again.",
        );
      }

      throw new Error(
        `Soroban simulation failed: ${(sim as any).error || "Contract execution trapped"}`,
      );
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(baseTx, sim).build();
    return {
      chain: "stellar",
      network,
      xdr: preparedTx.toXDR(),
      transactionDetails,
    };
  }

  // Soroswap REST API build (e.g. on mainnet if quote came from REST)
  const apiKey = environment.SOROSWAP_API_KEY;
  const baseUrl = environment.SOROSWAP_API_URL;
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
            // Keep original XDR
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
      console.warn("[Soroswap Build] REST build failed, evaluating fallback:", e);
    }
  }

  // Fallback to Native SDEX PathPaymentStrictSend only if quote was derived from live SDEX
  if (!isNativeSdex) {
    throw new Error(
      `Unable to build transaction: no valid Soroswap router or orderbook path was found for ${assetIn} → ${assetOut}.`,
    );
  }

  const server = getHorizonServer(network);
  const account = await server.loadAccount(fromAddress);
  const passphrase =
    network === "mainnet"
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

  const sendAsset = resolveStellarAsset(assetIn, network);
  const destAsset = resolveStellarAsset(assetOut, network);

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
        `Jumpa: Swap ${assetIn}->${assetOut}`.slice(0, 28),
      ),
    )
    .setTimeout(120);

  if (!hasTrustline && destNeedsTrustline) {
    txBuilder.addOperation(
      StellarSdk.Operation.changeTrust({
        asset: destAsset,
      }),
    );
  }

  const rawPath = raw?.path || [];
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

  const sendAmount = Number.parseFloat(amountIn).toFixed(7);
  const destMin = (
    raw?.minimumReceived
      ? Number.parseFloat(raw.minimumReceived)
      : quote?.minimumReceived
        ? Number.parseFloat(quote.minimumReceived)
        : Number.parseFloat(amountOut)
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
  return {
    chain: "stellar",
    network,
    xdr: tx.toXDR(),
    transactionDetails,
  };
}
