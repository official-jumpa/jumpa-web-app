import type { Address } from "viem";
import {
  type AIStepResponse,
  type ChatHistoryMessage,
  runAgentStep,
} from "@/lib/ai/jumpaAgent";
import type { DeepSeekTool } from "@/lib/ai/tools";
import {
  AIRTIME_MAX,
  AIRTIME_MIN,
  detectCarrierFromPhone,
  getNetwork,
  MOBILE_NETWORKS,
} from "@/lib/bills";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";
import { AMOUNT_PATTERN, nairaPerUsdt } from "./amounts";
import type { ChatHandoff } from "./chat-handoff";
import { BILL_RATE_PROBE_USDT } from "./constants";
import type { RampDirection } from "./order-status";
import {
  type AccountSummary,
  getAccountSummary,
  getQuote,
  type Quote,
} from "./orders";

/** A message the mini app keeps on the device and sends back with each question. */
export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatAnswer = { reply: string; handoff?: ChatHandoff };

export type ChatDeps = {
  account: (address: Address) => Promise<AccountSummary>;
  quote: (direction: RampDirection, amount: number) => Promise<Quote>;
  step: (options: {
    messages: ChatHistoryMessage[];
    tools: DeepSeekTool[];
    toolChoice: "auto" | "required" | "none";
    maxTokens: number;
  }) => Promise<AIStepResponse>;
};

const defaultDeps: ChatDeps = {
  account: (address) => getAccountSummary(address),
  quote: (direction, amount) => getQuote(direction, amount),
  step: runAgentStep,
};

/** Model calls per question; the last one may only answer. */
const MAX_STEPS = 3;
/** Naira probed for the top-up rate. */
const TOP_UP_RATE_PROBE_NGN = 10_000;
const NETWORK_IDS = MOBILE_NETWORKS.map((network) => network.id);
/** Questions that need a tool, so the first step must call one. */
const NEEDS_TOOL =
  /airtime|recharge|cash\s*-?\s*out|withdraw|top\s*-?\s*up|balance|\brates?\b|history|\bdata\b/i;

const tool = (
  name: string,
  description: string,
  properties: Record<string, object> = {},
): DeepSeekTool => ({
  type: "function",
  function: {
    name,
    description,
    parameters: { type: "object", properties, required: [] },
  },
});

const PHONE = {
  type: "string",
  description: "Nigerian phone number as the user wrote it.",
};
const NETWORK = {
  type: "string",
  enum: NETWORK_IDS,
  description: "Mobile network, only if the user named it.",
};

export const NIMIQ_CHAT_TOOLS: DeepSeekTool[] = [
  tool(
    "check_balance",
    "The user's USDT balance on Polygon and how much they can still cash out today.",
  ),
  tool(
    "get_rate",
    "Today's cash-out and top-up rates between USDT and Naira.",
    {
      direction: { type: "string", enum: ["cash_out", "top_up", "both"] },
    },
  ),
  tool(
    "start_cash_out",
    "Opens the cash-out screen (USDT to a Nigerian bank account) with any details the user gave.",
    {
      amountUsdt: { type: "number", description: "USDT to sell." },
      accountNumber: {
        type: "string",
        description: "10-digit Nigerian bank account number.",
      },
    },
  ),
  tool(
    "start_top_up",
    "Opens the top-up screen (pay Naira by bank transfer, receive USDT) with any amount the user gave.",
    { amountNgn: { type: "number", description: "Naira to pay." } },
  ),
  tool(
    "buy_airtime",
    "Opens the airtime screen, paid in USDT, with any details the user gave.",
    {
      phone: PHONE,
      network: NETWORK,
      amountNgn: { type: "number", description: "Airtime value in Naira." },
    },
  ),
  tool(
    "buy_data",
    "Opens the mobile data screen, paid in USDT, where the user picks a plan.",
    { phone: PHONE, network: NETWORK },
  ),
  tool("open_history", "Opens the list of the user's past orders."),
];

export function buildNimiqPrompt(now = new Date()): string {
  return `You are Jumpa, a friendly money assistant inside the Jumpa mini app in Nimiq Pay.
The user's wallet holds USDT on Polygon. In this mini app they can:
- cash out USDT to a Nigerian bank account (start_cash_out)
- top up USDT by paying Naira with a bank transfer (start_top_up)
- buy airtime (buy_airtime) or mobile data (buy_data) for Nigerian numbers, paid in USDT
- check their balance and today's limit (check_balance) and today's rates (get_rate)
- see past orders (open_history)
Savings, investing, swaps, cards, referrals and other coins or chains are not in the mini app yet: say they are coming soon, and that the full Jumpa app at usejumpa.com has more.

Rules:
- You never move money. Each action tool opens the right screen with what the user said filled in; they check it there and confirm in Nimiq Pay. As soon as the user asks for an action, call its tool with whatever they gave. Never ask for missing details in text: the screen asks for them.
- Never state a balance, rate, fee or Naira figure that a tool did not give you.
- Jumpa pays the Polygon network fee.
- Reply in one to three short sentences of plain text, in the user's language. No tables, no markdown headings.
- Never name the companies behind payments, or any internal detail.
Current time: ${now.toISOString()}`;
}

type ToolResult = { summary: string; handoff?: ChatHandoff };

const numberArg = (value: unknown): number | undefined => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : undefined;
};

/** What the tool did, for the model, and the screen to open, for the user. */
function opened(handoff: ChatHandoff, notes: string[]): ToolResult {
  const filled = Object.entries(handoff)
    .filter(([key]) => key !== "flow")
    .map(([key, value]) => `${key} ${value}`);
  return {
    handoff,
    summary: [
      `The ${handoff.flow} screen is ready${filled.length ? ` with ${filled.join(", ")}` : ""}.`,
      ...notes,
      "Tell the user to tap the button under your reply, check the details there and confirm in Nimiq Pay. Do not ask for anything else.",
    ].join(" "),
  };
}

function phoneAndNetwork(
  args: Record<string, unknown>,
  notes: string[],
): { phone?: string; network?: string } {
  const raw = typeof args.phone === "string" ? args.phone : "";
  const phone = raw ? normalizeNigerianPhone(raw) : "";
  const valid = Boolean(phone) && isValidNigerianPhone(phone);
  if (raw && !valid) {
    notes.push(
      `"${raw}" isn't a valid Nigerian number, so it was left out; they can type it on the screen.`,
    );
  }
  const named =
    typeof args.network === "string" && getNetwork(args.network.toLowerCase())
      ? args.network.toLowerCase()
      : undefined;
  const network = named ?? (valid ? detectCarrierFromPhone(phone) : null);
  return {
    ...(valid ? { phone } : {}),
    ...(network ? { network } : {}),
  };
}

export async function runNimiqTool(
  name: string,
  args: Record<string, unknown>,
  address: Address,
  deps: ChatDeps = defaultDeps,
): Promise<ToolResult> {
  const notes: string[] = [];
  switch (name) {
    case "check_balance": {
      const account = await deps.account(address);
      const { minUsd, maxTxUsd, dailyUsd } = account.limits;
      return {
        summary: `Balance: ${formatStable(account.usdtBalance)} USDT on Polygon. Cash-out left today: $${account.remainingTodayUsd} of $${dailyUsd}. Each cash-out: $${minUsd} to $${maxTxUsd}.`,
      };
    }
    case "get_rate": {
      const lines: string[] = [];
      const { direction } = args;
      if (direction !== "top_up") {
        const rate = nairaPerUsdt(
          await deps.quote("cash_out", BILL_RATE_PROBE_USDT),
        );
        if (rate) lines.push(`Cash-out: 1 USDT gets ${formatNaira(rate)}.`);
      }
      if (direction !== "cash_out") {
        const rate = nairaPerUsdt(
          await deps.quote("top_up", TOP_UP_RATE_PROBE_NGN),
        );
        if (rate) lines.push(`Top-up: 1 USDT costs ${formatNaira(rate)}.`);
      }
      return {
        summary: lines.length
          ? `${lines.join(" ")} Airtime and data use the cash-out rate.`
          : "Rates are unavailable right now; ask the user to try again shortly.",
      };
    }
    case "start_cash_out": {
      const amount = numberArg(args.amountUsdt);
      const amountUsdt =
        amount && amount > 0 && AMOUNT_PATTERN.test(String(amount))
          ? String(amount)
          : undefined;
      const digits =
        typeof args.accountNumber === "string"
          ? args.accountNumber.replace(/\D/g, "")
          : "";
      if (digits && digits.length !== 10) {
        notes.push("The account number wasn't 10 digits, so it was left out.");
      }
      return opened(
        {
          flow: "cash-out",
          ...(amountUsdt ? { amountUsdt } : {}),
          ...(digits.length === 10 ? { accountNumber: digits } : {}),
        },
        notes,
      );
    }
    case "start_top_up": {
      const amount = numberArg(args.amountNgn);
      const amountNgn = amount && amount > 0 ? Math.round(amount) : undefined;
      return opened(
        { flow: "top-up", ...(amountNgn ? { amountNgn } : {}) },
        notes,
      );
    }
    case "buy_airtime": {
      const recipient = phoneAndNetwork(args, notes);
      const amount = numberArg(args.amountNgn);
      const inRange =
        amount !== undefined &&
        Number.isInteger(amount) &&
        amount >= AIRTIME_MIN &&
        amount <= AIRTIME_MAX;
      if (amount !== undefined && !inRange) {
        notes.push(
          `Airtime must be a whole amount from ${formatWhole(AIRTIME_MIN)} to ${formatWhole(AIRTIME_MAX)}, so the amount was left out.`,
        );
      }
      return opened(
        {
          flow: "airtime",
          ...recipient,
          ...(inRange ? { amountNgn: amount } : {}),
        },
        notes,
      );
    }
    case "buy_data":
      return opened({ flow: "data", ...phoneAndNetwork(args, notes) }, notes);
    case "open_history":
      return opened({ flow: "history" }, notes);
    default:
      return {
        summary: `${name} is not available in the mini app. Say it's coming soon.`,
      };
  }
}

const formatWhole = (naira: number) => `₦${naira.toLocaleString("en-NG")}`;

/** Runs the model over the conversation, with tools that read the wallet and open screens. */
export async function answerChat(
  address: Address,
  turns: ChatTurn[],
  deps: ChatDeps = defaultDeps,
): Promise<ChatAnswer> {
  const messages: ChatHistoryMessage[] = [
    { role: "system", content: buildNimiqPrompt() },
    ...turns,
  ];
  const question = turns.at(-1)?.content ?? "";
  let handoff: ChatHandoff | undefined;
  const summaries: string[] = [];

  for (let step = 1; step <= MAX_STEPS; step++) {
    const response = await deps.step({
      messages,
      tools: NIMIQ_CHAT_TOOLS,
      toolChoice:
        step === MAX_STEPS
          ? "none"
          : step === 1 && NEEDS_TOOL.test(question)
            ? "required"
            : "auto",
      maxTokens: 400,
    });
    if (response.mode === "chat") return { reply: response.message, handoff };

    messages.push(response.rawAssistantMessage);
    for (const call of response.toolCalls) {
      const result = await runNimiqTool(
        call.toolName,
        call.toolArgs,
        address,
        deps,
      ).catch(() => ({
        summary: "That didn't work just now; ask the user to try again.",
      }));
      summaries.push(result.summary);
      if ("handoff" in result && result.handoff) handoff = result.handoff;
      messages.push({
        role: "tool",
        tool_call_id: call.toolCallId,
        name: call.toolName,
        content: result.summary,
      });
    }
  }
  return {
    reply: summaries.at(-1) ?? "Sorry, I couldn't answer that. Try again.",
    handoff,
  };
}
