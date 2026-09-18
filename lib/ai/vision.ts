import { environment } from "@/lib/environment";

const SYSTEM_VISION_PROMPT = `You are a specialized financial vision intelligence engine for Jumpa, a Web3 + fiat neo-banking app.
Analyze the user-submitted image, screenshot, document, or payment proof in detail.

EXTRACT AND HIGHLIGHT:
1. Bank Transfer Receipts / Payment Proofs:
   - Bank Name (e.g., GTBank, Kuda, Zenith, Access, Moniepoint, OPay, Palmpay, First Bank, etc.)
   - Amount (in NGN or relevant currency)
   - Beneficiary / Recipient Account Number (10-digit NUBAN)
   - Beneficiary Name
   - Sender Name
   - Transaction Reference / Session ID / Narration
   - Transaction Status (Successful, Pending, Failed)
   - Date & Time

2. Crypto Transactions, Addresses & QR Codes:
   - Destination / Sender Address (Stellar G..., Solana base58, EVM 0x...)
   - Network / Blockchain (Stellar, Solana, Base, Ethereum)
   - Token & Amount (USDC, USDT, XLM, SOL, ETH)
   - Transaction Hash / Tx ID

3. General Charts / Invoices / Screenshots:
   - Concise summary of key numbers, text, or query details shown.

Output a clean, concise, structured summary. Do not make up information that is not clearly visible.`;

export interface VisionAnalysisResult {
  success: boolean;
  analysis: string;
  error?: string;
}

/**
 * Analyzes an image URL using Google Gemini 2.5 Flash via OpenRouter.
 */
export async function analyzeImageWithGemini(
  imageUrl: string,
  userPrompt?: string,
): Promise<VisionAnalysisResult> {
  const apiKey = environment.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[Vision] API key is missing");
    return {
      success: false,
      analysis: "[Image attached, but vision analysis is unavailable because API key is missing.]",
      error: "API key missing",
    };
  }

  const model = environment.OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash";

  const promptText = userPrompt?.trim()
    ? `${SYSTEM_VISION_PROMPT}\n\nUser Context/Instruction: "${userPrompt.trim()}"`
    : SYSTEM_VISION_PROMPT;

  try {
    console.log(`[Vision] Calling OpenRouter (${model}) for image: ${imageUrl}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://usejumpa.com",
        "X-Title": "Jumpa App",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Vision] OpenRouter error (${response.status}):`, errText);
      return {
        success: false,
        analysis: `[Image analysis error from vision model: HTTP ${response.status}]`,
        error: errText,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        success: false,
        analysis: "[Vision model returned an empty response.]",
        error: "Empty response",
      };
    }

    console.log(`[Vision] Successfully analyzed image. Summary length: ${content.length} chars`);
    return {
      success: true,
      analysis: content,
    };
  } catch (err: any) {
    console.error("[Vision] Failed to analyze image with OpenRouter:", err);
    return {
      success: false,
      analysis: `[Failed to analyze image due to a network or service error.]`,
      error: err?.message || String(err),
    };
  }
}
