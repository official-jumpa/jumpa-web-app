import { type Address, getAddress, type Hex } from "viem";
import {
  POLYGON_CHAIN_ID,
  POLYGON_CHAIN_ID_HEX,
  SIGNATURE_PATTERN,
} from "./constants";

/** The EIP-1193 surface Nimiq Pay injects as `window.ethereum`. */
export type Eip1193 = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

type HostWindow = Window & { ethereum?: Eip1193; nimiqPay?: unknown };

const UNKNOWN_CHAIN = 4902;
const USER_REJECTED = 4001;
const PROVIDER_POLL_MS = 100;

const POLYGON_CHAIN_PARAMS = {
  chainId: POLYGON_CHAIN_ID_HEX,
  chainName: "Polygon",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: ["https://polygon-rpc.com"],
  blockExplorerUrls: ["https://polygonscan.com"],
};

const hostWindow = () =>
  typeof window === "undefined" ? null : (window as HostWindow);

export function getInjectedProvider(): Eip1193 | null {
  return hostWindow()?.ethereum ?? null;
}

/** Nimiq Pay sets `window.nimiqPay` before the page's scripts run. */
export function isInsideNimiqPay(): boolean {
  const host = hostWindow();
  return Boolean(host && "nimiqPay" in host);
}

/** Resolves once Nimiq Pay's provider is injected, or null after `timeoutMs`. */
export async function waitForInjectedProvider(
  timeoutMs = 1500,
): Promise<Eip1193 | null> {
  const giveUpAt = Date.now() + timeoutMs;
  for (;;) {
    const provider = isInsideNimiqPay() ? getInjectedProvider() : null;
    if (provider || Date.now() >= giveUpAt) return provider;
    await new Promise((resolve) => setTimeout(resolve, PROVIDER_POLL_MS));
  }
}

const errorCode = (error: unknown) =>
  (error as { code?: unknown } | null)?.code;

/** True when the person declined the request in their wallet. */
export function isUserRejection(error: unknown): boolean {
  if (errorCode(error) === USER_REJECTED) return true;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && /reject|denied|cancel/i.test(message);
}

const firstAccount = (accounts: unknown): Address | null => {
  const first = Array.isArray(accounts) ? accounts[0] : undefined;
  return typeof first === "string" ? getAddress(first) : null;
};

/** Asks the person to share their address. */
export async function requestAccount(provider: Eip1193): Promise<Address> {
  const account = firstAccount(
    await provider.request({ method: "eth_requestAccounts" }),
  );
  if (!account) throw new Error("Nimiq Pay didn't share a wallet address.");
  return account;
}

/** The address already shared with this page, without prompting. */
export async function getConnectedAccount(
  provider: Eip1193,
): Promise<Address | null> {
  return firstAccount(await provider.request({ method: "eth_accounts" }));
}

/** Moves the wallet to Polygon, adding the network first if it's missing. */
export async function ensurePolygon(provider: Eip1193): Promise<void> {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (Number(chainId) === POLYGON_CHAIN_ID) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
    });
  } catch (error) {
    if (errorCode(error) !== UNKNOWN_CHAIN) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [POLYGON_CHAIN_PARAMS],
    });
  }
}

/** Asks the wallet to sign EIP-712 data; `json` is the serialized typed data. */
export async function signTypedData(
  provider: Eip1193,
  address: Address,
  json: string,
): Promise<Hex> {
  const signature = await provider.request({
    method: "eth_signTypedData_v4",
    params: [address, json],
  });
  if (typeof signature !== "string" || !SIGNATURE_PATTERN.test(signature)) {
    throw new Error("Nimiq Pay returned an unexpected signature.");
  }
  return signature as Hex;
}
