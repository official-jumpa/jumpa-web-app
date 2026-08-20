import { environment } from "./environment";

/**
 * Send OTP email via Resend HTTP API when RESEND_API_KEY is set;
 * otherwise log in development (no email sent).
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const key = environment.RESEND_API_KEY.trim();
  const configuredFrom = environment.RESEND_FROM_EMAIL.trim();
  const fallbackFrom = "Jumpa <onboarding@resend.dev>";
  const from = configuredFrom || fallbackFrom;

  console.log(
    `[email-otp] Preparing OTP email for ${to}. Verification Code: ${code}`,
  );

  if (!key) {
    console.warn(`[email-otp] RESEND_API_KEY missing — OTP for ${to}: ${code}`);
    return;
  }

  const sendRequest = async (senderEmail: string) => {
    return fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [to],
        subject: "Your Jumpa verification code",
        html: `<div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 8px;">
          <h2 style="color: #6A59CE;">Jumpa Verification</h2>
          <p>Your verification code is: <strong style="font-size: 24px; color: #6A59CE; letter-spacing: 2px;">${code}</strong></p>
          <p style="color: #888;">It expires in 10 minutes.</p>
        </div>`,
      }),
    });
  };

  let res = await sendRequest(from);

  // If primary domain sending fails due to domain authorization on Resend, retry with onboarding@resend.dev
  if (!res.ok && configuredFrom && configuredFrom !== fallbackFrom) {
    const errText = await res.text();
    console.warn(
      `[email-otp] Primary sender ${from} failed (${res.status}: ${errText}). Retrying with ${fallbackFrom}...`,
    );
    res = await sendRequest(fallbackFrom);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[email-otp] Resend API failed: ${res.status} ${text}`);
  } else {
    console.log(`[email-otp] Verification code sent to ${to}`);
  }
}
