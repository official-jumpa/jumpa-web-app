import { getSendByteClient, DEFAULT_SENDBYTE_FROM, SendByteError } from "./sendbyte";

/**
 * Send OTP email via SendByte SDK when SENDBYTE_API_KEY is set;
 * otherwise log in development (no email sent).
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  console.log(
    `[email-otp] Preparing OTP email for ${to}. Verification Code: ${code}`,
  );

  if (!sendbyte) {
    console.warn(`[email-otp] SENDBYTE_API_KEY missing — OTP for ${to}: ${code}`);
    return;
  }

  try {
    const res = await sendbyte.emails.send({
      from,
      to,
      subject: "Your Jumpa verification code",
      html: `<div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; border-radius: 8px;">
        <h2 style="color: #6A59CE;">Jumpa Verification</h2>
        <p>Your verification code is: <strong style="font-size: 24px; color: #6A59CE; letter-spacing: 2px;">${code}</strong></p>
        <p style="color: #888;">It expires in 10 minutes.</p>
      </div>`,
    });

    console.log(`[email-otp] Verification code sent to ${to} (ID: ${res.id})`);
  } catch (err: any) {
    if (err instanceof SendByteError) {
      console.error(
        `[email-otp] SendByte API error [${err.code}] (${err.status}): ${err.message}`,
      );
    } else {
      console.error("[email-otp] Error sending OTP email via SendByte:", err);
    }
  }
}
