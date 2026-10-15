import { sanitizeDSML } from "@/lib/ai/jumpaAgent";
import { environment } from "@/lib/environment";

export interface SupportChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SupportAgentContext {
  userName?: string | null;
  jumpaTag?: string | null;
  email?: string | null;
}

/**
 * Builds the comprehensive Jumpa Support Specialist system prompt.
 * Contains the complete service catalog and strict guardrails to decline
 * anything outside of Jumpa's offerings.
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
   - Do NOT mention any third-party backend partners, APIs, or infrastructure providers (e.g., Switch, Centiiv, Bellmonie, YellowCard, Strowallet, etc.) to the user under any circumstance.
   - Always refer to services as Jumpa services (e.g., "Jumpa Naira account", "Jumpa virtual card", "bank transfer").
4. **SECURITY & PRIVACY (MANDATORY)**:
   - NEVER ask for, accept, or store the user's 12/24-word recovery phrase (mnemonic), private keys, or PINs.
   - If a user shares a recovery phrase or PIN, IMMEDIATELY warn them:
     "Please never share your recovery phrase or PIN with anyone, including Jumpa support. Jumpa will never ask for your recovery phrase."
5. **NO FINANCIAL / SPECULATION ADVICE**:
   - Never advise on buying, selling, or holding any token, and do not speculate on prices.
6. **NO EMOJIS**:
   - Do NOT use emojis anywhere in your responses. Keep the tone clean, modern, and professional.
7. **VISUAL INTELLIGENCE & ATTACHED SCREENSHOTS / RECEIPTS**:
   - When users attach screenshots, payment receipts, or error screens, visual intelligence analysis is provided. Use the extracted details (bank name, account number, session ID, transaction hash, error text, amount, status) directly to resolve their issue.

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

11. **ESCALATION & SUPPORT CONTACTS**:
   - **Jumpa WhatsApp Community**: For unresolved issues or direct escalation with our team: [Jumpa WhatsApp Community](https://chat.whatsapp.com/KExp42DN6gr9yPkSUpIa6L?mode=gi_t).
   - **Email Support**: support@usejumpa.com.
   - **FAQs**: Accessible under Help & Support > Jumpa FAQs (/support?view=faqs).`;
}

/**
 * Executes a completion call against DeepSeek with toolChoice: "none"
 * specifically for support inquiries.
 */
export async function runSupportAgentCompletion(
  messages: SupportChatMessage[],
  context?: SupportAgentContext,
): Promise<string> {
  const deepseekApiKey = process.env.DEEPSEEK_API;
  const openRouterKey =
    process.env.OPENROUTER_API_KEY || environment.OPENROUTER_API_KEY;

  if (!deepseekApiKey && !openRouterKey) {
    console.warn("[SupportAgent] API key missing");
    return "Our support assistant is temporarily unavailable. Please email us at support@usejumpa.com and our team will assist you immediately.";
  }

  const systemPrompt = buildSupportSystemPrompt(context);
  const fullMessages: SupportChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  // 1. Direct DeepSeek Primary
  const callDirectDeepSeek = async (): Promise<string | null> => {
    if (!deepseekApiKey) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages: fullMessages,
          temperature: 0.2,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn("[SupportAgent] Primary DeepSeek returned status:", res.status, errText);
        return null;
      }

      const data = await res.json();
      const rawReply = data.choices?.[0]?.message?.content || "";
      const cleanReply = sanitizeDSML(rawReply).trim();
      return cleanReply || null;
    } catch (err: any) {
      console.warn("[SupportAgent] Primary DeepSeek failed or timed out (10s):", err.message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // 2. OpenRouter Fallback
  const callOpenRouter = async (): Promise<string | null> => {
    if (!openRouterKey) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://usejumpa.com",
          "X-Title": "Jumpa",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_CHAT_MODEL || "deepseek/deepseek-chat",
          messages: fullMessages,
          temperature: 0.2,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[SupportAgent] OpenRouter fallback returned status:", res.status, errText);
        return null;
      }

      const data = await res.json();
      const rawReply = data.choices?.[0]?.message?.content || "";
      const cleanReply = sanitizeDSML(rawReply).trim();
      return cleanReply || null;
    } catch (err: any) {
      console.error("[SupportAgent] OpenRouter fallback error:", err.message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    if (deepseekApiKey) {
      const primaryRes = await callDirectDeepSeek();
      if (primaryRes) {
        return primaryRes;
      }
    }

    if (openRouterKey) {
      console.log("[SupportAgent] Falling back to OpenRouter...");
      const fallbackRes = await callOpenRouter();
      if (fallbackRes) {
        return fallbackRes;
      }
    }

    return "I'm having a little trouble connecting to our support network right now. Please try again in a moment, or reach out to us at support@usejumpa.com.";
  } catch (err) {
    console.error("[SupportAgent Network Error]", err);
    return "I couldn't complete your request due to a connection issue. Please check your network and try again, or write to support@usejumpa.com.";
  }
}
