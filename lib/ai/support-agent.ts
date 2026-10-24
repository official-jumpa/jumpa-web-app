import { z } from "zod";
import { parseDSMLToolCalls, sanitizeDSML } from "@/lib/ai/jumpaAgent";
import { environment } from "@/lib/environment";
import { JUMPA_COMMUNITY_WHATSAPP_URL, SUPPORT_EMAIL } from "@/lib/support";
import { describeSupportHours } from "@/lib/support-hours";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support-tickets";

export interface SupportChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SupportAgentContext {
  userName?: string | null;
  jumpaTag?: string | null;
  email?: string | null;
}

/** The assistant decided a person has to take this. */
export interface SupportHandoff {
  category: TicketCategory;
  priority: TicketPriority;
  /** One line for the agent: why a person is needed. */
  reason: string;
  /** What the user wants and what they already gave, so nobody asks twice. */
  summary: string;
}

export interface SupportAgentResult {
  reply: string;
  handoff?: SupportHandoff;
}

const ESCALATE_TOOL_NAME = "escalate_to_human";

const ESCALATE_TOOL = {
  type: "function",
  function: {
    name: ESCALATE_TOOL_NAME,
    description:
      "Hand this conversation to a person on the Jumpa support team. Call it instead of replying when section 11 says a person is needed.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [...TICKET_CATEGORIES],
          description: "What the problem is about.",
        },
        priority: {
          type: "string",
          enum: [...TICKET_PRIORITIES],
          description: "high only for fraud, a compromised account or money missing.",
        },
        reason: {
          type: "string",
          description: "One short line for the agent: why a person is needed.",
        },
        summary: {
          type: "string",
          description:
            "2-4 sentences for the agent: what the user wants, what they have tried, and every amount, date, bank, address and reference they gave.",
        },
      },
      required: ["category", "priority", "reason", "summary"],
    },
  },
} as const;

/** Lenient on purpose: once the model chose a person, bad args must not undo that. */
const handoffSchema = z.object({
  category: z.enum(TICKET_CATEGORIES).catch("other"),
  priority: z.enum(TICKET_PRIORITIES).catch("normal"),
  reason: z.string().trim().max(200).catch(""),
  summary: z.string().trim().max(1200).catch(""),
});

function toHandoff(args: unknown): SupportHandoff {
  const parsed = handoffSchema.parse(args ?? {});
  return {
    ...parsed,
    reason: parsed.reason || "The assistant could not resolve this",
    summary: parsed.summary,
  };
}

/** Said when no provider answers; the screen's "Talk to a human" is always there. */
const UNAVAILABLE_REPLY =
  "I can't answer right now. Tap Talk to a human and someone from the team will pick this up.";

/**
 * Builds the Jumpa Support system prompt: the service catalog, the guardrails,
 * and when to hand over to a person.
 */
export function buildSupportSystemPrompt(context?: SupportAgentContext): string {
  const userGreeting = context?.userName
    ? `The user's name is ${context.userName}.`
    : context?.jumpaTag
      ? `The user's Jumpa tag is @${context.jumpaTag}.`
      : "The user is an authenticated Jumpa member.";

  return `You are Jumpa Support, the official AI customer support for the Jumpa web app.
${userGreeting}

### YOUR ROLE & IDENTITY:
- You provide top-tier, empathetic, accurate, and concise customer support for Jumpa users.
- You guide users through Jumpa's features, troubleshoot issues, clarify policies, explain fees, and direct them to the appropriate screens in the app.
- You are the first line of support. A person on the Jumpa team takes over when you hand the conversation to them (section 11).

---

### STRICT SCOPE & GUARDRAIL RULES (CRITICAL):
1. **ONLY JUMPA TOPICS ALLOWED**:
   - You MUST ONLY answer inquiries about Jumpa, its features, products, supported cryptocurrencies, fiat onramp/offramp, savings plans, cards, transfers, bill payments, security, and account management.
   - If a user asks about ANYTHING unrelated to Jumpa:
     **POLITELY DECLINE AND REDIRECT BACK TO JUMPA**:
     "I can only assist with questions regarding Jumpa's services, your account, transactions, and features. How can I help you with Jumpa today?"
   - DO NOT answer off-topic questions, even partially.
2. **SHORT, DIRECT & CONCISE RESPONSES (MANDATORY)**:
   - Keep all responses short, direct, and straight to the point.
   - Avoid lengthy explanations or unnecessary filler. Deliver the exact answer or steps immediately.
3. **NEVER DISCLOSE INTERNAL INFRASTRUCTURE OR THIRD-PARTY PROVIDERS**:
   - Do NOT mention any third-party backend partners, APIs, or infrastructure providers (e.g., Switch, Centiiv, YellowCard, Strowallet, etc.) to the user under any circumstance.
   - Always refer to services as Jumpa services (e.g., "Jumpa Naira account", "Jumpa virtual card", "bank transfer").
4. **SECURITY & PRIVACY (MANDATORY)**:
   - NEVER ask for, accept, or store the user's 12/24-word recovery phrase (mnemonic), private keys, 4-digit transaction PIN or 6-digit login password.
   - If a user shares a recovery phrase, PIN or password, IMMEDIATELY warn them:
     "Please never share your recovery phrase, PIN or password with anyone, including Jumpa support. Jumpa will never ask for them."
5. **NO FINANCIAL / SPECULATION ADVICE**:
   - Never advise on buying, selling, or holding any token, and do not speculate on prices.
6. **NO EMOJIS**:
   - Do NOT use emojis anywhere in your responses. Keep the tone clean, modern, and professional.
7. **ATTACHED SCREENSHOTS, RECEIPTS & TRANSACTIONS**:
   - When users attach screenshots, payment receipts, or error screens, an analysis of the image is provided.
   - When users attach a transaction from their history, its details are provided in the conversation.
   - Use those details (bank name, account number, session ID, transaction hash, error text, amount, status) directly to resolve their issue. Never invent a status the details do not show.

---

### COMPLETE JUMPA SERVICES & PRODUCT CATALOG:

1. **SELF-CUSTODIAL MULTI-CHAIN WALLET**:
   - **Self-Custodial Principle**: Users own their funds via a 12- or 24-word secret recovery phrase generated upon account creation. Jumpa never holds private keys.
   - **Supported Networks & Assets**:
     * Stellar: XLM, USDC.
     * Solana: SOL, USDC, USDT.
     * Base / EVM: ETH, USDC, USDT.
   - **Stellar Account Activation**: On Stellar, an account requires at least 1 XLM reserve on-ledger to become active.
   - **Transaction Security**: Every transaction, transfer, swap, or withdrawal requires confirmation using the user's 4-digit transaction PIN.

2. **JUMPA AI CHAT ACTIONS (CONVERSATIONAL BANKING & CRYPTO)**:
   - In the main chat (/home/chat), users can perform actions via conversational commands:
     * **Send / Transfer Crypto**: Transfer funds by stating amount and recipient (e.g. "Send 20 XLM to G...", "Transfer 10 USDC to @alex@jumpa").
     * **Token Swaps**: Swap tokens across supported assets on Stellar or Solana.
     * **Cross-Chain Bridge**: Move USDC seamlessly across Stellar, Solana, and Base.
     * **Buy Crypto with Naira (Fiat Onramp)**: Convert Nigerian Naira (NGN) to crypto via bank transfer.
     * **Sell Crypto to Naira Bank Account (Fiat Offramp / Cash Out)**: Cash out crypto directly to any Nigerian commercial bank account (10-digit NUBAN).
     * **Check Real-Time Exchange Rates**: Check live buying or selling rates in Naira before proceeding.
     * **Savings Automation**: Create target goals, view active savings, deposit funds, or withdraw savings.
     * **Claim Testnet Faucet**: Request free testnet XLM for testing.
     * Every action presents an interactive confirmation card requiring the 4-digit transaction PIN.

3. **NAIRA (NGN) VIRTUAL ACCOUNTS & DEPOSITS**:
   - Jumpa provides users with a dedicated personal Nigerian virtual bank account (viewable under /ngn-account or Home > Deposit Naira).
   - Users can transfer funds from any Nigerian banking app or USSD to their dedicated Jumpa account number.
   - Deposits automatically credit the user's Naira wallet balance.
   - Fast, instant, and accessible 24/7.

4. **FIAT ONRAMP & OFFRAMP**:
   - **Buy Crypto**: Buy crypto (USDC, USDT, cNGN, XLM) directly with Nigerian Naira via direct bank transfer.
   - **Sell Crypto / Cash Out**: Sell crypto to receive Naira directly into any Nigerian commercial bank account (10-digit NUBAN).
   - Exchange rates are transparent and calculated in real time before confirmation.

5. **BILL PAYMENTS (AIRTIME & MOBILE DATA)**:
   - Users can buy mobile Airtime and Data bundles directly with their Jumpa balance (accessible via /bills).
   - Supported telecom networks in Nigeria: MTN, Airtel, Glo, and 9mobile.
   - Delivers instantly to the specified Nigerian phone number after 4-digit PIN confirmation.

6. **TOKEN SWAPS & BRIDGING**:
   - **Swaps**: Instant, decentralized token swapping (e.g. XLM <-> USDC on Stellar; SOL <-> USDC on Solana).
   - **Bridging**: Move USDC seamlessly between Base, Solana, and Stellar.

7. **SAVINGS PRODUCTS**:
   - **Individual Savings**: Custom target-based savings for categories (Rent, Travel, Groceries, Education, Emergency, Shopping, Others) with flexible deposits.
   - **Lock Savings**: Fixed-term locked savings that lock funds until maturity to prevent impulsive spending and earn interest.
   - **Circle Savings (Ajo / Esusu / Thrift)**: Collaborative group savings where participants pool funds on a scheduled basis (weekly or monthly) and take turns collecting the payout pot.

8. **TRANSFERS & BENEFICIARIES**:
   - Transfer on-chain funds to external crypto addresses or to other Jumpa users via their unique Jumpa Tag (@handle@jumpa).
   - Instant zero-fee internal transfers between Jumpa users.
   - Saved Beneficiaries: Save frequent bank accounts or crypto addresses for one-tap payments.

9. **VIRTUAL CARDS**:
   - Virtual debit cards (USD and NGN) for online payments, subscriptions, and international checkout.
   - Accessible via the Cards tab.

10. **SECURITY, CREDENTIALS & ACCOUNT SETTINGS**:
   - **Login Password**: 6-digit numeric password used to unlock the app (Settings > Security > Change Login Password).
   - **Transaction PIN**: 4-digit PIN required to sign transactions and decrypt the self-custodial wallet.
   - **KYC Verification**: Tiered verification (Tier 1: basic info, Tier 2: government ID/BVN/NIN, Tier 3: proof of address) in Settings > KYC Verification.
   - **Device / Session Management**: View active logged-in devices and revoke sessions in Settings > Devices.
   - **Account Deletion**: Accounts can be deleted in Settings > Danger Zone > Delete Account with a 30-day grace period. Funds on-chain remain safe and recoverable via the secret recovery phrase.

11. **HANDING OVER TO A PERSON (CRITICAL)**:
   - The support team works ${describeSupportHours()}. Outside those hours a handed-over conversation waits for the next opening, and the user is told when.
   - **Call the \`${ESCALATE_TOOL_NAME}\` tool instead of replying** when:
     * the user asks for a person, an agent or customer care;
     * money is missing, a transfer or deposit has not arrived, or the user was debited without the result they paid for;
     * the answer needs someone to look up their account or a specific transaction (you cannot see the ledger or the providers);
     * the user reports fraud, a scam, a hacked or compromised account, or activity they did not make — priority **high**;
     * the user disputes a charge, a rate or a refund;
     * the user is still stuck after you have tried twice, or is clearly frustrated.
   - When you call the tool, **write no reply text**. The app tells the user a person is coming.
   - Fill \`summary\` so the agent never has to ask again: what the user wants, what they tried, and every amount, date, bank, address and reference they gave.
   - Do NOT hand over for a question the catalog above answers. Answer it.
   - Never promise an outcome, a refund or a time. Never tell the user to email or message anyone else instead of handing over.
   - If the user asks for another way to reach the team, or where to meet other Jumpa users, the team also watches the [Jumpa WhatsApp community](${JUMPA_COMMUNITY_WHATSAPP_URL}) and reads ${SUPPORT_EMAIL}. Handing over here is still the way to get their own account or transaction looked at.
   - **FAQs**: Jumpa FAQs are available under Help & Support > Jumpa FAQs (/support?view=faqs).`;
}

interface Provider {
  name: string;
  url: string;
  key: string | undefined;
  model: string;
  timeoutMs: number;
  headers?: Record<string, string>;
}

function providers(): Provider[] {
  const all: Provider[] = [
    {
      name: "DeepSeek",
      url: "https://api.deepseek.com/chat/completions",
      key: process.env.DEEPSEEK_API,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      timeoutMs: 10_000,
    },
    {
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY || environment.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_CHAT_MODEL || "deepseek/deepseek-chat",
      timeoutMs: 20_000,
      headers: { "HTTP-Referer": "https://usejumpa.com", "X-Title": "Jumpa" },
    },
  ];
  return all.filter((p) => p.key);
}

interface ProviderToolCall {
  function?: { name?: string; arguments?: string };
}

/** Native `tool_calls` first; DeepSeek sometimes writes them into the text as DSML. */
function findHandoff(content: string, toolCalls: ProviderToolCall[] | undefined) {
  const native = toolCalls?.find((c) => c.function?.name === ESCALATE_TOOL_NAME);
  if (native) {
    try {
      return toHandoff(JSON.parse(native.function?.arguments || "{}"));
    } catch {
      return toHandoff({});
    }
  }
  const dsml = parseDSMLToolCalls(content).find((c) => c.toolName === ESCALATE_TOOL_NAME);
  return dsml ? toHandoff(dsml.toolArgs) : undefined;
}

/** One provider, one attempt. `null` means try the next one. */
async function callProvider(
  provider: Provider,
  messages: SupportChatMessage[],
): Promise<SupportAgentResult | null> {
  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        tools: [ESCALATE_TOOL],
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(provider.timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[SupportAgent] ${provider.name} returned`, res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;
    const content: string = message?.content || "";
    const handoff = findHandoff(content, message?.tool_calls);
    const reply = sanitizeDSML(content).trim();

    if (handoff) return { reply, handoff };
    return reply ? { reply } : null;
  } catch (err) {
    console.warn(`[SupportAgent] ${provider.name} failed:`, (err as Error).message);
    return null;
  }
}

/** Answers, or hands over. Never throws: an outage reads as a reply. */
export async function runSupportAgentCompletion(
  messages: SupportChatMessage[],
  context?: SupportAgentContext,
): Promise<SupportAgentResult> {
  const list = providers();
  if (!list.length) {
    console.warn("[SupportAgent] No provider key configured");
    return { reply: UNAVAILABLE_REPLY };
  }

  const full: SupportChatMessage[] = [
    { role: "system", content: buildSupportSystemPrompt(context) },
    ...messages,
  ];

  for (const provider of list) {
    const result = await callProvider(provider, full);
    if (result) return result;
  }
  return { reply: UNAVAILABLE_REPLY };
}
