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
          description:
            "Optional Stellar public key address (G...) to query balance for.",
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
          description:
            "Optional Stellar public key address (G...) to query balance for.",
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
      "Fetch the user's balances across ALL supported chains and networks (Stellar mainnet and testnet, Solana, Base/EVM). " +
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
      "Draft an on-chain crypto transfer to a recipient Stellar public key (56-character string starting with 'G') or a Jumpa handle (e.g. '@alice'). " +
      "MANDATORY RULES: " +
      "1. A 10-digit number (e.g. '9169419535') is a Nigerian bank account number, NOT a Stellar address. DO NOT use send_funds for 10-digit numbers! Instead, ask the user for their bank name to initiate an offramp. " +
      "2. For transfers to 'my wallet' or 'myself', set recipient to the user's Stellar address from context. " +
      "3. Default chain to 'stellar' for XLM. Network defaults to 'testnet' unless mainnet is specified.",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "Amount to send as a decimal string (e.g. '50', '100').",
        },
        token: {
          type: "string",
          description:
            "Token symbol to send (e.g. 'XLM', 'USDC', 'SOL'). Default to 'XLM'.",
        },
        chain: {
          type: "string",
          description:
            "Chain to send on ('stellar', 'solana', 'base'). Default to 'stellar'.",
        },
        network: {
          type: "string",
          enum: ["testnet", "mainnet"],
          description:
            "Network to use ('testnet' or 'mainnet'). Default to 'testnet'.",
        },
        recipient: {
          type: "string",
          description:
            "Recipient Stellar public key (G...) or Jumpa @handle (e.g. '@alice'). Never a 10-digit bank account number.",
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
      "Generate bank transfer details to deposit Nigerian Naira (NGN) and receive crypto via Switch. " +
      "Supported Switch asset pairs: " +
      "USDC: 'base:usdc', 'solana:usdc', 'avalanche:usdc', 'ethereum:usdc', 'bsc:usdc'. " +
      "USDT: 'solana:usdt', 'tron:usdt', 'ethereum:usdt', 'bsc:usdt'. " +
      "cNGN: 'base:cngn', 'bsc:cngn'. " +
      "(USDT on Base and all assets on Stellar are NOT supported for NGN onramp). " +
      "MANDATORY: Do NOT call this tool if fiatAmount or target network/chain has not been explicitly provided by the user — ask them in chat first.",
    parameters: {
      type: "object",
      properties: {
        fiatAmount: {
          type: "string",
          description:
            "Exact amount of NGN to deposit provided by user (e.g. '10000', '50000'). Never assume.",
        },
        cryptoToken: {
          type: "string",
          description: "Crypto token to receive ('USDC', 'USDT', 'cNGN').",
        },
        asset: {
          type: "string",
          description:
            "Switch asset identifier (e.g. 'base:usdc', 'solana:usdt', 'tron:usdt').",
        },
        walletAddress: {
          type: "string",
          description:
            "User's wallet address on the target chain to receive the crypto.",
        },
      },
      required: ["fiatAmount", "cryptoToken", "asset", "walletAddress"],
    },
  },
};

const offrampNgn: DeepSeekTool = {
  type: "function",
  function: {
    name: "offramp_ngn",
    description:
      "Initiate a withdrawal via Switch to sell crypto for Nigerian Naira (NGN) to a user's bank account. " +
      "The system automatically verifies the account number and bank with Paystack to ensure accuracy. " +
      "Supported Switch asset pairs: " +
      "USDC: 'base:usdc', 'solana:usdc', 'ethereum:usdc', 'bsc:usdc'. " +
      "USDT: 'solana:usdt', 'tron:usdt', 'ethereum:usdt', 'bsc:usdt'. " +
      "Call this as soon as the user says they want to cash out, with WHATEVER they have given so far — " +
      "omit anything they have not said. The tool returns the chooser for the next missing detail " +
      "(which balance to sell, which account to pay, which bank holds that account), so the user taps " +
      "instead of being asked in prose. Never invent an amount, token, network, account number or bank.",
    parameters: {
      type: "object",
      properties: {
        cryptoAmount: {
          type: "string",
          description:
            "Amount of crypto to sell provided by user (e.g. '50'). Never assume.",
        },
        cryptoToken: {
          type: "string",
          description: "Token to sell ('USDC', 'USDT').",
        },
        asset: {
          type: "string",
          description:
            "Switch asset string (e.g. 'base:usdc', 'solana:usdt').",
        },
        bankName: {
          type: "string",
          description:
            "User's bank name or alias (e.g. 'GTBank', 'Access Bank', 'Kuda', 'OPay', 'Zenith').",
        },
        accountNumber: {
          type: "string",
          description: "User's 10-digit Nigerian bank account number.",
        },
        holderName: {
          type: "string",
          description:
            "Optional account holder name. The system verifies and fetches the official registered name via Paystack automatically.",
        },
      },
      required: ["cryptoAmount"],
    },
  },
};

const claimFaucet: DeepSeekTool = {
  type: "function",
  function: {
    name: "claim_faucet",
    description:
      "Claim 10,000 free testnet tokens (XLM) from the Stellar testnet faucet (Friendbot) to activate or fund a testnet wallet. " +
      "Call this whenever the user asks for test tokens, faucet funds, testnet XLM, or asks to fund/activate their testnet wallet. " +
      "If walletAddress is omitted, the system defaults to the user's active Stellar wallet address.",
    parameters: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description:
            "Optional Stellar public key (G...). If omitted, defaults to the user's connected Stellar address.",
        },
      },
      required: [],
    },
  },
};

const stellarSep24Sandbox: DeepSeekTool = {
  type: "function",
  function: {
    name: "stellar_sep24_sandbox",
    description:
      "Initialize and launch an interactive sandboxed SEP-24 hosted on-ramp / off-ramp window (Stellar TestAnchor, MoneyGram Access, or Mercuryo) in Jumpa's UI Sheet. " +
      "Call this whenever the user wants to test or demo SEP-24 anchor deposit/withdrawals, sandbox on-ramps, MoneyGram testnet, or Stellar anchor ramps.",
    parameters: {
      type: "object",
      properties: {
        assetCode: {
          type: "string",
          enum: ["USDC", "XLM", "EURC"],
          description:
            "Asset code to deposit or withdraw (e.g. 'USDC', 'XLM'). Defaults to 'USDC'.",
        },
        type: {
          type: "string",
          enum: ["deposit", "withdraw"],
          description:
            "Ramp direction: 'deposit' (onramp) or 'withdraw' (offramp). Defaults to 'deposit'.",
        },
        amount: {
          type: "string",
          description: "Optional testnet amount (e.g. '50').",
        },
        anchorName: {
          type: "string",
          description: "Anchor provider name (e.g. 'MoneyGram / TestAnchor').",
        },
      },
      required: [],
    },
  },
};

const createSavingsGoal: DeepSeekTool = {
  type: "function",
  function: {
    name: "create_savings_goal",
    description:
      "Set up a savings goal. Call this whenever the user wants to save towards something, " +
      "create a savings target or plan, or asks about saving money (e.g. 'I want to save for a trip', " +
      "'help me save', 'create a savings goal'). " +
      "Call it with whatever the user has given so far and OMIT the rest — the tool returns the " +
      "chooser the user needs next. Never invent a name, an amount or a duration.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "What the user is saving for, in their own words, e.g. 'December trip'. Omit if not yet given.",
        },
        amount: {
          type: "string",
          description:
            "Target amount in USD as the user expressed it, e.g. '10000' or '$10,000'. Omit if not yet given.",
        },
        durationDays: {
          type: "number",
          description:
            "How many days until the goal date, e.g. 60. Omit if not yet given.",
        },
      },
      required: [],
    },
  },
};

// ─── Exported Tool Registry

export const JUMPA_TOOLS: DeepSeekTool[] = [
  stellarTestnetSwapQuote,
  stellarTestnetBalance,
  stellarMainnetSwapQuote,
  stellarMainnetBalance,
  stellarSep24Sandbox,
  checkPortfolio,
  sendFunds,
  onrampNgn,
  offrampNgn,
  claimFaucet,
  createSavingsGoal,
];

export type JumpaToolName =
  | "stellar_testnet_swap_quote"
  | "stellar_testnet_balance"
  | "stellar_mainnet_swap_quote"
  | "stellar_mainnet_balance"
  | "stellar_sep24_sandbox"
  | "check_portfolio"
  | "send_funds"
  | "onramp_ngn"
  | "offramp_ngn"
  | "claim_faucet"
  | "create_savings_goal";

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
