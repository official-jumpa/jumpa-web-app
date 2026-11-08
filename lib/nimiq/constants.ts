import { type Address, pad, toHex } from "viem";

/** Polygon PoS, the chain Nimiq Pay holds USDT on. */
export const POLYGON_CHAIN_ID = 137;
export const POLYGON_CHAIN_ID_HEX = "0x89";
export const POLYGON_EXPLORER_TX = "https://polygonscan.com/tx/";

export const POLYGON_USDT = {
  address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as Address,
  decimals: 6,
  symbol: "USDT",
} as const;

/** The one Switch asset the mini app moves. */
export const SWITCH_ASSET = "polygon:usdt";

/**
 * Polygon USDT0 signs permits under a salted domain with no chainId field;
 * a chainId domain reverts on-chain with "USDT0: INVALID-PERMIT".
 */
export const USDT0_PERMIT_DOMAIN = {
  name: "USDT0",
  version: "1",
  verifyingContract: POLYGON_USDT.address,
  salt: pad(toHex(POLYGON_CHAIN_ID), { size: 32 }),
} as const;

/** `DOMAIN_SEPARATOR()` read from the token; the domain above must hash to it. */
export const USDT0_DOMAIN_SEPARATOR =
  "0x7b43b7deae87806d0ace67d6c8e9e347fc85db8ad198e756e5c17d126fef9a05";

export const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/** Permit lifetime; well inside Switch's 30-minute deposit window. */
export const PERMIT_TTL_SECONDS = 900;
/** A signature with less than this left on its deadline is not relayed. */
export const SIGN_MARGIN_SECONDS = 60;
/** Switch deposit addresses expire after 30 minutes; stop relaying at 25. */
export const SWITCH_DEPOSIT_SAFE_SECONDS = 1500;

/** How long Switch holds a top-up's bank details open; unpaid ones stop counting after it. */
export const TOP_UP_WINDOW_SECONDS = 1800;

/** What people type into Nimiq Pay's browser / Mini Apps to open Jumpa. */
export const NIMIQ_MINI_APP_ADDRESS = "usejumpa.com/nimiq";

/** Deeplink that opens Jumpa inside Nimiq Pay; works once the directory lists it. */
export const NIMIQ_OPEN_URL = `https://nimpay.app/miniapps/open/${NIMIQ_MINI_APP_ADDRESS}`;

/** Nimiq Pay's official store listings, as linked from nimiq.com/nimiq-pay. */
export const NIMIQ_PAY_STORES = [
  {
    label: "App Store",
    href: "https://apps.apple.com/app/nimiq-pay/id6471844738",
  },
  {
    label: "Google Play",
    href: "https://play.google.com/store/apps/details?id=com.nimiq.pay",
  },
] as const;

/** A 64- or 65-byte hex signature, as wallets return from `eth_signTypedData_v4`. */
export const SIGNATURE_PATTERN = /^0x([0-9a-fA-F]{128}|[0-9a-fA-F]{130})$/;

/** Most orders a device remembers per wallet, and one history request may ask about. */
export const MAX_LISTED_ORDERS = 50;

/** Shape of a mini-app order id (`generateId("nimq")`). */
export const ORDER_ID_PATTERN = /^nimq_[0-9a-z]{20}$/;
