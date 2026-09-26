import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { CIRCLE_IRIS_API, CONTRACT_ADDRESSES, getRpcUrl, getExplorerTxUrl } from "@/lib/blockchain";
import { decryptMnemonic } from "@/lib/crypto";
import { mnemonicToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { Wallet } from "@/models/Wallet";
import { connectDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "low", action: "bridge_claim" },
    });
    if (!authResult.ok) return authResult.response;
    const { user } = authResult;

    const { txHash, domain, pin, destChain } = await req.json();

    if (!txHash || !domain) {
      return NextResponse.json(
        { error: "txHash and domain are required" },
        { status: 400 },
      );
    }

    // 1. Fetch attestation from Iris
    const irisRes = await fetch(
      `${CIRCLE_IRIS_API.testnet}/v2/messages/${domain}?transactionHash=${txHash}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );

    if (!irisRes.ok) {
      return NextResponse.json(
        { error: "Unable to reach attestation service." },
        { status: 502 },
      );
    }

    const irisData = await irisRes.json();
    const msgObj = irisData.messages?.[0];

    if (!msgObj || msgObj.status !== "complete") {
      return NextResponse.json(
        {
          error:
            "Attestation is still pending verification. Please wait a minute and retry.",
          status: msgObj?.status || "pending",
        },
        { status: 400 },
      );
    }

    const { message, attestation, destinationMintTxHash } = msgObj;

    // Detect target chain from param or CCTP message payload
    let targetChain = destChain;
    if (!targetChain && message && typeof message === "string") {
      try {
        const cleanMsg = message.replace(/^0x/, "");
        // Destination domain is bytes 8..12 (hex index 16..24)
        const destDomainHex = cleanMsg.slice(16, 24);
        const destDomainNum = parseInt(destDomainHex, 16);
        if (destDomainNum === 0) targetChain = "ethereum";
        else if (destDomainNum === 6) targetChain = "base";
      } catch {}
    }
    const isEth = targetChain === "ethereum";
    const chainName = isEth ? "Ethereum Sepolia" : "Base Sepolia";
    const chainKey = isEth ? "ethereum" : "base";

    // If already minted by Iris or relayer
    if (destinationMintTxHash) {
      return NextResponse.json({
        ok: true,
        alreadyMinted: true,
        mintTxHash: destinationMintTxHash,
        explorerUrl: getExplorerTxUrl(chainKey, destinationMintTxHash, true),
        message: "USDC has already been minted on destination chain.",
      });
    }

    // 2. Need PIN to decrypt mnemonic and submit receiveMessage
    if (!pin) {
      return NextResponse.json(
        {
          ok: true,
          needsPin: true,
          status: "complete",
          attestation,
          message: "Attestation ready! Enter your PIN to claim USDC on the destination chain.",
        },
        { status: 200 },
      );
    }

    await connectDB();
    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    // 3. Submit receiveMessage on destination EVM chain
    const evmAccount = mnemonicToAccount(phrase);
    const targetViemChain = isEth ? sepolia : baseSepolia;
    const rpcUrl = getRpcUrl(isEth ? "ethereum-sepolia" : "base-sepolia");

    const publicClient = createPublicClient({
      chain: targetViemChain,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account: evmAccount,
      chain: targetViemChain,
      transport: http(rpcUrl),
    });

    const ethBalance = await publicClient.getBalance({
      address: evmAccount.address,
    });

    if (ethBalance === BigInt(0)) {
      return NextResponse.json(
        {
          error:
            `Your ${chainName} address needs a tiny amount of testnet ETH to pay the gas fee to mint. Please get free testnet ETH at faucets.chain.link or use Fast Transfer for zero-gas automatic minting.`,
          needsGas: true,
          address: evmAccount.address,
        },
        { status: 400 },
      );
    }

    const messageTransmitterAbi = [
      {
        type: "function",
        name: "receiveMessage",
        inputs: [
          { name: "message", type: "bytes" },
          { name: "attestation", type: "bytes" },
        ],
        outputs: [{ name: "success", type: "bool" }],
        stateMutability: "nonpayable",
      },
    ] as const;

    const messageTransmitter = isEth
      ? CONTRACT_ADDRESSES.cctp.testnet.ethereum.messageTransmitter
      : CONTRACT_ADDRESSES.cctp.testnet.base.messageTransmitter;

    const mintTxHash = await walletClient.writeContract({
      address: messageTransmitter,
      abi: messageTransmitterAbi,
      functionName: "receiveMessage",
      args: [message as `0x${string}`, attestation as `0x${string}`],
    });

    return NextResponse.json({
      ok: true,
      mintTxHash,
      explorerUrl: getExplorerTxUrl(chainKey, mintTxHash, true),
      message: `Successfully submitted receiveMessage! USDC minted on ${chainName}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to claim cross-chain USDC" },
      { status: 500 },
    );
  }
}
