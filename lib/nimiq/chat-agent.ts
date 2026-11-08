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
  type DataPlan,
  detectCarrierFromPhone,
  MOBILE_NETWORKS,
} from "@/lib/bills";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";
import { AMOUNT_PATTERN, nairaPerUsdt } from "./amounts";
import {
  BankLookupError,
  type ResolvedAccount,
  resolveNigerianAccount,
} from "./bank";
import { listDataPlans } from "./bill-provider";
import {
  type ChatCard,
  type ChatDataPlan,
  type ChatProposal,
  usdtFor,
} from "./chat-cards";
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

export type ChatAnswer = { reply: string; card?: ChatCard };

export type ChatDeps = {
  account: (address: Address) => Promise<AccountSummary>;
  quote: (direction: RampDirection, amount: number) => Promise<Quote>;
  plans: (phone: string) => Promise<{ plans: DataPlan[] }>;
  resolveAccount: (
    accountNumber: string,
    bank: string,
  ) => Promise<ResolvedAccount>;
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
  plans: (phone) => listDataPlans(phone),
  resolveAccount: resolveNigerianAccount,
  step: runAgentStep,
};

/** Model calls per question; the last one may only answer. */
const MAX_STEPS = 3;
/** Naira probed for the top-up rate. */
const TOP_UP_RATE_PROBE_NGN = 10_000;
/** Bundles offered at once; asking for a size narrows them. */
const MAX_PLANS = 10;
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
    "buy_airtime",
    "Prices airtime for a Nigerian number, paid in USDT, and shows a card the user confirms in this chat. Call it with whatever the user gave.",
    {
      phone: PHONE,
      network: NETWORK,
      amountNgn: { type: "number", description: "Airtime value in Naira." },
    },
  ),
  tool(
    "buy_data",
    "Lists mobile data plans for a Nigerian number, paid in USDT; the user picks one in this chat and confirms it. Call it with whatever the user gave.",
    {
      phone: PHONE,
      network: NETWORK,
      size: {
        type: "string",
        description: "Bundle size the user asked for, e.g. 1GB.",
      },
    },
  ),
  tool(
    "cash_out",
    "Prices a cash-out of USDT to a Nigerian bank account and shows a card the user confirms in this chat. Call it with whatever the user gave.",
    {
      amountUsdt: { type: "number", description: "USDT to sell." },
      accountNumber: {
        type: "string",
        description: "10-digit Nigerian bank account number.",
      },
      bank: { type: "string", description: "Bank name as the user wrote it." },
    },
  ),
  tool(
    "top_up",
    "Prices a top-up (the user pays Naira by bank transfer and receives USDT) and shows a card the user confirms in this chat.",
    { amountNgn: { type: "number", description: "Naira to pay." } },
  ),
  tool("show_history", "Shows the user's recent orders in this chat."),
];

export function buildNimiqPrompt(now = new Date()): string {
  return `You are Jumpa, a friendly money assistant inside the Jumpa mini app in Nimiq Pay.
The user's wallet holds USDT on Polygon. Right here in this chat they can:
- cash out USDT to a Nigerian bank account (cash_out)
- top up USDT by paying Naira with a bank transfer (top_up)
- buy airtime (buy_airtime) or mobile data (buy_data) for Nigerian numbers, paid in USDT
- check their balance and today's limit (check_balance) and today's rates (get_rate)
- see their recent orders (show_history)
Savings, investing, swaps, cards, referrals and other coins or chains are not in the mini app yet: say they are coming soon, and that the full Jumpa app at usejumpa.com has more.

Rules:
- You never move money yourself. A payment tool puts a card under your reply; the user checks it, taps Confirm and approves in Nimiq Pay, all in this chat.
- As soon as the user asks for a payment, call its tool with whatever they gave, using earlier messages too. If the tool says details are missing, ask for all of them in one short question.
- Never state a balance, rate, fee or Naira figure that a tool did not give you.
- Jumpa pays the Polygon network fee.
- Reply in one to three short sentences of plain text, in the user's language. No tables, no markdown headings.
- Never name the companies behind payments, or any internal detail.
Current time: ${now.toISOString()}`;
}

type ToolResult = { summary: string; card?: ChatCard };

const numberArg = (value: unknown): number | undefined => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : undefined;
};

const stringArg = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const SHOWN =
  "A card with these details is under your reply. Tell the user to check it, tap Confirm and approve in Nimiq Pay. Do not ask for anything else.";

/** The card to confirm, and what the model tells the user about it. */
function proposed(proposal: ChatProposal, details: string): ToolResult {
  return {
    summary: `${details} ${SHOWN}`,
    card: { type: "confirm", proposal },
  };
}

/** Tells the model what to ask for, plus anything it should explain first. */
function missing(details: string[], notes: string[]): ToolResult {
  return {
    summary: [
      ...notes,
      `Ask the user for ${details.join(" and ")} in one short question.`,
    ].join(" "),
  };
}

/** A network id from an id or a label, any case. */
function networkOf(value: unknown): string | undefined {
  const named = stringArg(value).toLowerCase();
  return MOBILE_NETWORKS.find(
    (network) => network.id === named || network.label.toLowerCase() === named,
  )?.id;
}

/** A valid number with its network, or what to ask for. */
function recipientOf(
  args: Record<string, unknown>,
  notes: string[],
): { phone?: string; network?: string } {
  const raw = stringArg(args.phone);
  const phone = raw ? normalizeNigerianPhone(raw) : "";
  const valid = Boolean(phone) && isValidNigerianPhone(phone);
  if (raw && !valid) notes.push(`"${raw}" isn't a valid Nigerian number.`);
  const network =
    networkOf(args.network) ??
    (valid ? (detectCarrierFromPhone(phone) ?? undefined) : undefined);
  return { ...(valid ? { phone } : {}), ...(network ? { network } : {}) };
}

const NETWORK_CHOICES: ChatCard = {
  type: "choices",
  options: MOBILE_NETWORKS.map((network) => ({
    label: network.label,
    reply: network.label,
  })),
};

async function cashOutRate(deps: ChatDeps) {
  return nairaPerUsdt(await deps.quote("cash_out", BILL_RATE_PROBE_USDT));
}

const UNAVAILABLE =
  "Rates are unavailable right now; ask the user to try again shortly.";

const sizeKey = (size: string) => size.replace(/\s+/g, "").toLowerCase();

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
        const rate = await cashOutRate(deps);
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
          : UNAVAILABLE,
      };
    }
    case "buy_airtime": {
      const { phone, network } = recipientOf(args, notes);
      const amount = numberArg(args.amountNgn);
      const amountNgn =
        amount !== undefined &&
        Number.isInteger(amount) &&
        amount >= AIRTIME_MIN &&
        amount <= AIRTIME_MAX
          ? amount
          : undefined;
      if (amount !== undefined && amountNgn === undefined) {
        notes.push(
          `Airtime must be a whole amount from ${formatWhole(AIRTIME_MIN)} to ${formatWhole(AIRTIME_MAX)}.`,
        );
      }
      if (!phone || amountNgn === undefined) {
        return missing(
          [
            ...(phone ? [] : ["the phone number"]),
            ...(amountNgn === undefined ? ["the amount in Naira"] : []),
          ],
          notes,
        );
      }
      if (!network) {
        return {
          summary:
            "Ask which network the number is on; the choices are under your reply.",
          card: NETWORK_CHOICES,
        };
      }
      const rate = await cashOutRate(deps);
      if (!rate) return { summary: UNAVAILABLE };
      const usdt = usdtFor(amountNgn, rate);
      const short = await shortOf(address, usdt, deps);
      if (short) return { summary: short };
      return proposed(
        { kind: "airtime", phone, network, amountNgn, usdt },
        `${formatNaira(amountNgn)} airtime for ${phone} costs about ${formatStable(usdt)} USDT.`,
      );
    }
    case "buy_data": {
      const { phone, network } = recipientOf(args, notes);
      if (!phone) return missing(["the phone number"], notes);
      const [rate, listed] = await Promise.all([
        cashOutRate(deps),
        deps.plans(phone),
      ]);
      if (!rate) return { summary: UNAVAILABLE };
      const plans = listed.plans
        .flatMap((plan): ChatDataPlan[] =>
          plan.productName && plan.numericPrice
            ? [
                {
                  productName: plan.productName,
                  size: plan.size,
                  validity: plan.validity,
                  price: plan.price,
                  amountNgn: plan.numericPrice,
                },
              ]
            : [],
        )
        .sort((a, b) => a.amountNgn - b.amountNgn);
      if (!plans.length) {
        return {
          summary: `No data plans are available for ${phone} right now; ask the user to try again later.`,
        };
      }
      const asked = stringArg(args.size);
      const sized = asked
        ? plans.filter((plan) => sizeKey(plan.size) === sizeKey(asked))
        : [];
      if (asked && !sized.length)
        notes.push(`There is no ${asked} plan; say so.`);
      const offered = (sized.length ? sized : plans).slice(0, MAX_PLANS);
      return {
        summary: [
          ...notes,
          `${offered.length} plans for ${phone} are listed under your reply. Ask the user to pick one; if theirs isn't listed, they can tell you the size.`,
        ].join(" "),
        card: {
          type: "plans",
          phone,
          network: network ?? MOBILE_NETWORKS[0].id,
          perUsdt: rate,
          plans: offered,
        },
      };
    }
    case "cash_out": {
      const amount = numberArg(args.amountUsdt);
      const amountUsdt =
        amount && amount > 0 && AMOUNT_PATTERN.test(String(amount))
          ? String(amount)
          : undefined;
      const accountNumber = stringArg(args.accountNumber).replace(/\D/g, "");
      if (accountNumber && accountNumber.length !== 10) {
        notes.push("The account number must be 10 digits.");
      }
      const bank = stringArg(args.bank);
      if (!amountUsdt || accountNumber.length !== 10 || !bank) {
        return missing(
          [
            ...(amountUsdt ? [] : ["the USDT amount"]),
            ...(accountNumber.length === 10 ? [] : ["the account number"]),
            ...(bank ? [] : ["the bank"]),
          ],
          notes,
        );
      }

      const account = await deps.account(address);
      const usd = Number(amountUsdt);
      const ceiling = Math.min(
        account.limits.maxTxUsd,
        account.remainingTodayUsd,
      );
      if (usd < account.limits.minUsd || usd > ceiling) {
        return {
          summary: `A cash-out must be from ${account.limits.minUsd} to ${ceiling} USDT right now, within the daily limit. Ask for another amount.`,
        };
      }
      if (usd > Number(account.usdtBalance)) {
        return {
          summary: `The balance is ${formatStable(account.usdtBalance)} USDT, less than ${amountUsdt}. Ask for a smaller amount.`,
        };
      }

      let resolved: ResolvedAccount;
      try {
        resolved = await deps.resolveAccount(accountNumber, bank);
      } catch (error) {
        const said =
          error instanceof BankLookupError
            ? error.message
            : "The account couldn't be checked just now.";
        return {
          summary: `${said} Ask the user to check the account number and bank.`,
        };
      }
      const amountNgn = (await deps.quote("cash_out", usd)).receive.amount;
      return proposed(
        {
          kind: "cash-out",
          amountUsdt,
          bank: resolved.bankName,
          accountNumber,
          accountName: resolved.accountName,
          amountNgn,
        },
        `${amountUsdt} USDT pays about ${formatNaira(amountNgn)} to ${resolved.accountName} at ${resolved.bankName}.`,
      );
    }
    case "top_up": {
      const amount = numberArg(args.amountNgn);
      const amountNgn = amount && amount > 0 ? Math.round(amount) : undefined;
      if (!amountNgn) return missing(["the amount in Naira"], notes);
      const quote = await deps.quote("top_up", amountNgn);
      const usdt = Math.floor(quote.receive.amount * 100) / 100;
      return proposed(
        { kind: "top-up", amountNgn, usdt },
        `Paying ${formatNaira(amountNgn)} gets about ${formatStable(usdt)} USDT. After Confirm, the card shows the account to transfer to.`,
      );
    }
    case "show_history":
      return {
        summary:
          "The user's recent orders are listed under your reply. Say so in one sentence.",
        card: { type: "history" },
      };
    default:
      return {
        summary: `${name} is not available in the mini app. Say it's coming soon.`,
      };
  }
}

const formatWhole = (naira: number) => `₦${naira.toLocaleString("en-NG")}`;

/** Why the balance can't cover a payment, or nothing when it can. */
async function shortOf(address: Address, usdt: number, deps: ChatDeps) {
  const { usdtBalance } = await deps.account(address);
  return usdt > Number(usdtBalance)
    ? `That costs about ${formatStable(usdt)} USDT but the balance is ${formatStable(usdtBalance)} USDT. Tell the user and suggest a top-up.`
    : undefined;
}

/** Runs the model over the conversation, with tools that read the wallet and price payments. */
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
  let card: ChatCard | undefined;
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
    if (response.mode === "chat") return { reply: response.message, card };

    messages.push(response.rawAssistantMessage);
    for (const call of response.toolCalls) {
      const result: ToolResult = await runNimiqTool(
        call.toolName,
        call.toolArgs,
        address,
        deps,
      ).catch(() => ({
        summary: "That didn't work just now; ask the user to try again.",
      }));
      summaries.push(result.summary);
      if (result.card) card = result.card;
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
    card,
  };
}
