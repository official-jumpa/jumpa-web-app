import { environment } from "@/lib/environment";

export interface AudioTranscriptionResult {
  success: boolean;
  transcript: string;
  error?: string;
}

const SYSTEM_AUDIO_PROMPT = `You are an audio transcription engine for Jumpa, a Nigerian fiat & crypto neo-banking app.
Your task is to accurately transcribe the spoken words verbatim into clean text.

SPECIAL DOMAIN RULES:
1. Nigerian Banking & Fiat:
   - Accurately recognize Nigerian bank names (e.g., OPay, Palmpay, Moniepoint, Kuda, GTBank, Zenith, Access, First Bank, UBA, Providus, Wema, etc.).
   - Accurately capture 10-digit NUBAN account numbers (e.g., 8012345678, 2048123456).
   - Accurately capture currency amounts (e.g., "5000 naira", "10k naira", "₦5,000").
2. Web3 & Crypto:
   - Accurately recognize tokens: USDC, USDT, XLM, SOL, ETH, Bitcoin, etc.
   - Accurately capture networks: Stellar, Solana, Base, Ethereum.
   - Accurately capture actions: send, transfer, swap, deposit, withdraw, buy airtime, buy data.
3. Formatting:
   - Output ONLY the clean verbatim transcription.
   - Do NOT add markdown ticks, quotation marks, conversational greetings, explanations, or assistant replies.
   - If the audio contains only background noise or is completely inaudible, return an empty string.`;

/**
 * Transcribes audio buffer using Google Gemini 2.5 Flash via OpenRouter.
 */
export async function transcribeAudioWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<AudioTranscriptionResult> {
  const apiKey = environment.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[Audio] OpenRouter API key is missing");
    return {
      success: false,
      transcript: "",
      error: "OpenRouter API key missing",
    };
  }

  const model = environment.OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash";

  // Normalize audio format extension for OpenRouter input_audio
  const lowerMime = (mimeType || "").toLowerCase();
  let format = "webm";
  if (lowerMime.includes("mp4") || lowerMime.includes("m4a")) {
    format = "mp4";
  } else if (lowerMime.includes("wav")) {
    format = "wav";
  } else if (lowerMime.includes("ogg")) {
    format = "ogg";
  } else if (lowerMime.includes("mpeg") || lowerMime.includes("mp3")) {
    format = "mp3";
  } else if (lowerMime.includes("webm")) {
    format = "webm";
  }

  const base64Audio = audioBuffer.toString("base64");

  try {
    console.log(
      `[Audio] Sending ${audioBuffer.length} bytes (${format}) to Gemini 2.5 Flash (${model}) for transcription...`,
    );

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
                text: SYSTEM_AUDIO_PROMPT,
              },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Audio] OpenRouter error (${response.status}):`, errText);
      return {
        success: false,
        transcript: "",
        error: `Transcription failed: HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    console.log(`[Audio] Gemini 2.5 transcribed: "${content}"`);
    return {
      success: true,
      transcript: content,
    };
  } catch (err: any) {
    console.error("[Audio] Failed to transcribe with Gemini 2.5 Flash:", err);
    return {
      success: false,
      transcript: "",
      error: err?.message || String(err),
    };
  }
}
