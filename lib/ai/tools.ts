/**
 * Jumpa AI — DeepSeek Tool Schemas
 *
 * Tools are strictly network-scoped. Mainnet and testnet tools are separate
 * to prevent cross-network contract contamination.
 *
 * The AI picks the appropriate tool based on user context and conversation.
 * It MUST ask the user to clarify missing parameters (network, amount, tokens)
 * instead of defaulting or guessing.
 */

export interface DeepSeekToolFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export interface DeepSeekTool {
  type: "function";
  function: DeepSeekToolFunction;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// ─── Stellar Testnet Tools 

const stellarTestnetSwapQuote: DeepSeekTool = {
  type: "function",
  function: {
    name: "stellar_testnet_swap_quote",
    description:
      "Fetch a live Soroswap DEX quote for a token swap on the Stellar TESTNET network. " +
      "Only call this when the user has explicitly confirmed they want to swap on Stellar Testnet. " +
      "Available Stellar Testnet assets: XLM, USDC. " +
      "If the user requests USDT, inform them it is not available on Stellar and offer XLM↔USDC swaps. " +
      "Do NOT call this if fromToken or toToken or fromAmount are not yet known — ask the user first.",
    parameters: {
      type: "object",
      properties: {
        fromToken: {
          type: "string",
          enum: ["XLM", "USDC"],
          description: "Token symbol to swap FROM. Must be one of: XLM, USDC.",
        },
        toToken: {
          type: "string",
          enum: ["XLM", "USDC"],
          description: "Token symbol to swap TO. Must be one of: XLM, USDC.",
        },
        fromAmount: {
          type: "string",
          description:
            "Amount to swap as a decimal string (e.g. '30', '13.5'). Must be provided by the user, never assumed.",
        },
      },
      required: ["fromToken", "toToken", "fromAmount"],
    },
  },
};

const stellarTestnetBalance: DeepSeekTool = {
  type: "function",
  function: {
    name: "stellar_testnet_balance",
    description:
      "Fetch live token balances on the Stellar TESTNET network (XLM, USDC). " +
      "Provide an address if querying a specific public key (G...), or leave empty for the user's own address.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Optional Stellar public key address (G...) to query balance for.",
        },
      },
      required: [],
    },
  },
};

// ─── Stellar Mainnet Tools 

const stellarMainnetSwapQuote: DeepSeekTool = {
  type: "function",
  function: {
    name: "stellar_mainnet_swap_quote",
    description:
      "Fetch a live Soroswap DEX quote for a token swap on the Stellar MAINNET network. " +
      "Only call this when the user has explicitly confirmed they want to swap on Stellar Mainnet. " +
      "Available Stellar Mainnet assets: XLM, USDC. " +
      "Do NOT call this if fromToken, toToken, or fromAmount are not yet known — ask the user first.",
    parameters: {
      type: "object",
      properties: {
        fromToken: {
          type: "string",
          enum: ["XLM", "USDC"],
          description: "Token symbol to swap FROM. Must be one of: XLM, USDC.",
        },
        toToken: {
          type: "string",
          enum: ["XLM", "USDC"],
          description: "Token symbol to swap TO. Must be one of: XLM, USDC.",
        },
        fromAmount: {
          type: "string",
          description:
            "Amount to swap as a decimal string. Must be provided by the user, never assumed.",
        },
      },
      required: ["fromToken", "toToken", "fromAmount"],
    },
  },
};

const stellarMainnetBalance: DeepSeekTool = {
  type: "function",
  function: {
    name: "stellar_mainnet_balance",
    description:
      "Fetch live token balances on the Stellar MAINNET network (XLM, USDC). " +
      "Provide an address if querying a specific public key (G...), or leave empty for the user's own address.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Optional Stellar public key address (G...) to query balance for.",
        },
      },
      required: [],
    },
  },
};

// ─── Cross-Chain / Portfolio Tools 

const checkPortfolio: DeepSeekTool = {
  type: "function",
  function: {
    name: "check_portfolio",
    description:
      "Fetch the user's balances across ALL supported chains and networks (Stellar mainnet and testnet, Solana, Base/EVM, Bitcoin). " +
      "Call this when the user asks about their overall portfolio, net worth, or balances without specifying a chain.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

const sendFunds: DeepSeekTool = {
  type: "function",
  function: {
    name: "send_funds",
    description:
      "Draft a crypto transfer to a recipient address or Jumpa handle. " +
      "Call this IMMEDIATELY whenever the user asks to send or transfer crypto (e.g. 'send 100 XLM to GB25H...', 'send 50 XLM to GAB...', 'send 53 XLM to my wallet'). " +
      "If recipient is 'my wallet' or 'myself', use the user's Stellar address from context. Always set chain to 'stellar' for XLM.",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "Amount to send as a decimal string (e.g. '50', '100').",
        },
        token: {
          type: "string",
          description: "Token symbol to send (e.g. 'XLM', 'USDC', 'SOL'). Default to 'XLM'.",
        },
        chain: {
          type: "string",
          description: "Chain to send on ('stellar', 'solana', 'base'). Default to 'stellar'.",
        },
        network: {
          type: "string",
          enum: ["testnet", "mainnet"],
          description: "Network to use ('testnet' or 'mainnet'). Default to 'testnet'.",
        },
        recipient: {
          type: "string",
          description:
            "Recipient address or @handle (e.g. '@alice', 'GB25H...').",
        },
      },
      required: ["amount", "token", "recipient"],
    },
  },
};

const onrampNgn: DeepSeekTool = {
  type: "function",
  function: {
    name: "onramp_ngn",
    description:
      "Generate bank transfer details to deposit Nigerian Naira (NGN) and receive crypto. " +
      "Call this when the user wants to add money via bank transfer, buy crypto with NGN, or deposit NGN.",
    parameters: {
      type: "object",
      properties: {
        fiatAmount: {
          type: "string",
          description: "Amount of NGN to deposit (e.g. '50000').",
        },
        cryptoToken: {
          type: "string",
          description: "Crypto token to receive (e.g. 'USDC', 'XLM').",
        },
      },
      required: ["fiatAmount", "cryptoToken"],
    },
  },
};

const offrampNgn: DeepSeekTool = {
  type: "function",
  function: {
    name: "offramp_ngn",
    description:
      "Generate a withdrawal request to sell crypto for Nigerian Naira (NGN) to a bank account. " +
      "Call this when the user wants to cash out, withdraw, or receive NGN from their crypto.",
    parameters: {
      type: "object",
      properties: {
        cryptoAmount: {
          type: "string",
          description: "Amount of crypto to sell (e.g. '50').",
        },
        cryptoToken: {
          type: "string",
          description: "Token to sell (e.g. 'USDC', 'XLM').",
        },
        bankName: {
          type: "string",
          description: "User's bank name (e.g. 'Access Bank').",
        },
        accountNumber: {
          type: "string",
          description: "User's bank account number.",
        },
        accountName: {
          type: "string",
          description: "User's bank account name.",
        },
      },
      required: [
        "cryptoAmount",
        "cryptoToken",
        "bankName",
        "accountNumber",
        "accountName",
      ],
    },
  },
};

// ─── Exported Tool Registry 

export const JUMPA_TOOLS: DeepSeekTool[] = [
  stellarTestnetSwapQuote,
  stellarTestnetBalance,
  stellarMainnetSwapQuote,
  stellarMainnetBalance,
  checkPortfolio,
  sendFunds,
  onrampNgn,
  offrampNgn,
];

export type JumpaToolName =
  | "stellar_testnet_swap_quote"
  | "stellar_testnet_balance"
  | "stellar_mainnet_swap_quote"
  | "stellar_mainnet_balance"
  | "check_portfolio"
  | "send_funds"
  | "onramp_ngn"
  | "offramp_ngn";

/** Infer network from tool name — single source of truth */
export function getNetworkFromToolName(
  toolName: JumpaToolName,
): "testnet" | "mainnet" {
  if (toolName.includes("testnet")) return "testnet";
  return "mainnet";
}

/** Infer chain from tool name */
export function getChainFromToolName(toolName: JumpaToolName): string {
  if (toolName.startsWith("stellar")) return "stellar";
  return "stellar";
}
