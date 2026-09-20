import { environment } from "./environment";

export interface TransferEmailData {
  customerName: string;
  amount: string;
  tokenSymbol: string;
  recipientAddress: string;
  transactionId: string;
  chainName: string;
}

export function cleanTokenSymbol(token: string): string {
  const t = token.toUpperCase();
  if (t.startsWith("USDC")) return "USDC";
  if (t.startsWith("USDT")) return "USDT";
  if (t === "BASE") return "ETH";
  if (t.startsWith("SOL")) return "SOL";
  if (t.startsWith("XLM")) return "XLM";
  return token;
}

export function formatChainName(chain: string): string {
  switch (chain) {
    case "base":
      return "Base";
    case "solDevnet":
      return "Solana Devnet";
    case "solana":
      return "Solana";
    case "stellarTestnet":
      return "Stellar Testnet";
    case "stellar":
      return "Stellar";
    default:
      return chain || "Base";
  }
}

import { getExplorerTxUrl } from "@/lib/blockchain";

export function getExplorerUrl(tokenSymbol: string, hash: string): string {
  const sym = tokenSymbol.toUpperCase();
  if (sym.includes("SOL")) {
    return getExplorerTxUrl("solana", hash);
  } else if (sym.includes("XLM")) {
    const isTest = sym.includes("TEST") || sym.includes("DEV");
    return getExplorerTxUrl("stellar", hash, isTest);
  } else {
    return getExplorerTxUrl("base", hash);
  }
}

/**
 * Generates the responsive HTML email markup for a confirmed transfer.
 */
export function generateTransferEmailHtml(data: TransferEmailData): string {
  const {
    customerName,
    amount,
    recipientAddress,
    tokenSymbol,
    transactionId,
    chainName,
  } = data;

  const displayToken = cleanTokenSymbol(tokenSymbol);
  const displayChain = formatChainName(chainName);
  const explorerUrl = getExplorerUrl(tokenSymbol, transactionId);

  const formattedDate = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Sent Successfully</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0A0A0C;
      color: #EDEDEF;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0A0A0C;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #121214;
      border: 1px solid #1A1A1E;
      border-radius: 16px;
      padding: 32px;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #6A59CE;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      color: #99999F;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .details-box {
      border: 1px dashed #2C2C35;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
    }
    .details-row:not(:last-child) {
      border-bottom: 1px solid #1A1A1E;
    }
    .details-label {
      font-size: 13px;
      color: #70707A;
      font-weight: 500;
    }
    .details-value {
      font-size: 14px;
      color: #EDEDEF;
      font-weight: 600;
      text-align: right;
      word-break: break-all;
      max-width: 65%;
    }
    .details-value.highlight {
      color: #6A59CE;
      font-size: 16px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background-color: #6A59CE;
      color: #FFFFFF !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      transition: background-color 0.2s ease;
    }
    .footer {
      text-align: center;
      border-top: 1px solid #1A1A1E;
      padding-top: 20px;
    }
    .footer-text {
      font-size: 12px;
      color: #4E4E52;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="#" class="logo">Jumpa</a>
      </div>
      
      <h1>Payment Sent Successfully</h1>
      <p>Hi ${customerName || "User"},</p>
      <p>Your payment has been successfully processed and sent.</p>
      
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Amount Sent</span>
          <span class="details-value highlight">${amount} ${displayToken}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Recipient</span>
          <span class="details-value">${recipientAddress}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Network</span>
          <span class="details-value">${displayChain}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Transaction ID</span>
          <span class="details-value">${transactionId.slice(0, 8)}...${transactionId.slice(-8)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Date & Time</span>
          <span class="details-value">${formattedDate}</span>
        </div>
      </div>
      
      <div class="btn-container">
        <a href="${explorerUrl}" target="_blank" class="btn">View on Block Explorer</a>
      </div>
      
      <p style="font-size: 13px; text-align: center; margin-bottom: 24px;">
        You can monitor the progress of your transaction directly in Jumpa.
      </p>
      
      <div class="footer">
        <p class="footer-text">Thank you for trusting Jumpa with your payments.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; ${new Date().getFullYear()} The Jumpa Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send an email to the user confirming their transfer transaction has been sent.
 */
export async function sendTransferConfirmedEmail(
  toEmail: string,
  data: TransferEmailData,
): Promise<void> {
  const key = environment.RESEND_API_KEY.trim();
  const from =
    environment.RESEND_FROM_EMAIL.trim() || "Jumpa <onboarding@resend.dev>";

  if (!key) {
    console.warn("[email-notifications] API_KEY missing");
    return;
  }

  const { amount, tokenSymbol, recipientAddress } = data;
  const displayToken = cleanTokenSymbol(tokenSymbol);
  const htmlContent = generateTransferEmailHtml(data);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: `Payment Sent: ${amount} ${displayToken} to ${recipientAddress.slice(0, 6)}...`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[email-notifications] Resend API failed: ${res.status} ${text}`,
      );
    } else {
      console.log(
        `[email-notifications] Transfer confirmation email sent to ${toEmail}`,
      );
    }
  } catch (err: any) {
    console.error(
      "[email-notifications] Error dispatching email via Resend:",
      err,
    );
  }
}

export interface LoginAlertEmailData {
  customerName: string;
  email?: string;
  device?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  time?: Date | string;
  manageDevicesUrl?: string;
}

/**
 * Generates responsive HTML email markup for a new sign-in security alert.
 */
export function generateLoginAlertEmailHtml(data: LoginAlertEmailData): string {
  const {
    customerName,
    device,
    browser,
    os,
    ipAddress,
    location,
    time = new Date(),
    manageDevicesUrl = "https://usejumpa.com/profile/settings?section=devices",
  } = data;

  const displayDevice =
    device || (os && browser ? `${os} via ${browser}` : os || browser || "New Device");

  const formattedDate = new Date(time).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jumpa Security Alert: New Sign-in Detected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0A0A0C;
      color: #EDEDEF;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0A0A0C;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #121214;
      border: 1px solid #1A1A1E;
      border-radius: 16px;
      padding: 32px;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #6A59CE;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background-color: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      color: #99999F;
      line-height: 1.5;
      margin: 0 0 20px 0;
    }
    .details-box {
      border: 1px dashed #2C2C35;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
    }
    .details-row:not(:last-child) {
      border-bottom: 1px solid #1A1A1E;
    }
    .details-label {
      font-size: 13px;
      color: #70707A;
      font-weight: 500;
    }
    .details-value {
      font-size: 13px;
      color: #EDEDEF;
      font-weight: 600;
      text-align: right;
      word-break: break-all;
      max-width: 65%;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background-color: #6A59CE;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 13px 26px;
      border-radius: 12px;
      transition: background-color 0.2s ease;
    }
    .warning-box {
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 24px;
    }
    .warning-text {
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
    }
    .footer {
      text-align: center;
      border-top: 1px solid #1A1A1E;
      padding-top: 20px;
    }
    .footer-text {
      font-size: 12px;
      color: #4E4E52;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="#" class="logo">Jumpa</a>
      </div>
      
      <h1>New Sign-in Detected</h1>
      <p>Hi ${customerName || "there"},</p>
      <p>We detected a new sign-in to your Jumpa account</p>
      
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Device</span>
          <span class="details-value">${displayDevice}</span>
        </div>
        ${ipAddress
      ? `<div class="details-row">
          <span class="details-label">IP Address</span>
          <span class="details-value">${ipAddress}</span>
        </div>`
      : ""
    }
        ${location
      ? `<div class="details-row">
          <span class="details-label">Location</span>
          <span class="details-value">${location}</span>
        </div>`
      : ""
    }
        <div class="details-row">
          <span class="details-label">Date & Time</span>
          <span class="details-value">${formattedDate}</span>
        </div>
      </div>
      
      <div class="btn-container">
        <a href="${manageDevicesUrl}" target="_blank" class="btn">Manage Active Sessions</a>
      </div>

      <div class="warning-box">
        <p class="warning-text">
          <strong>Didn't recognize this activity?</strong> Someone else may have accessed your account.
          Please terminate this session immediately or update your password
        </p>
      </div>
      
      <div class="footer">
        <p class="footer-text">This is an automated security notification for your Jumpa account.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; ${new Date().getFullYear()} The Jumpa Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a security email alert when a new login session is detected.
 */
export async function sendLoginAlertEmail(
  toEmail: string,
  data: LoginAlertEmailData,
): Promise<void> {
  const key = environment.RESEND_API_KEY.trim();
  const from =
    environment.RESEND_FROM_EMAIL.trim() || "Jumpa <onboarding@resend.dev>";

  if (!key) {
    console.warn("[email-notifications] RESEND_API_KEY missing — skipping login email alert");
    return;
  }

  const htmlContent = generateLoginAlertEmailHtml(data);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: `Security Alert: New Sign-in on ${data.device || "a new device"}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[email-notifications] Resend API failed for login alert: ${res.status} ${text}`,
      );
    } else {
      console.log(
        `[email-notifications] Login alert email sent to ${toEmail}`,
      );
    }
  } catch (err: any) {
    console.error(
      "[email-notifications] Error dispatching login alert via Resend:",
      err,
    );
  }
}

export interface WaitlistEmailData {
  email: string;
  customerName?: string;
  subject?: string;
  whatsappUrl?: string;
}

export const WAITLIST_DEFAULT_WHATSAPP_URL =
  "https://chat.whatsapp.com/KExp42DN6gr9yPkSUpIa6L?mode=gi_t";

export const WAITLIST_DEFAULT_SUBJECT = "You’re part of Jumpa’s next chapter";
export const WAITLIST_DEFAULT_PREVIEW_TEXT =
  "Come meet the team and tell us what you really think.";

/**
 * Generates the responsive HTML email markup for the waitlist private beta invitation.
 */
export function generateWaitlistEmailHtml(data: WaitlistEmailData): string {
  const {
    customerName,
    whatsappUrl = WAITLIST_DEFAULT_WHATSAPP_URL,
  } = data;

  const previewText = WAITLIST_DEFAULT_PREVIEW_TEXT;
  const greeting = customerName ? `Hi ${customerName},` : "Hi,";
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You’re part of Jumpa’s next chapter</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0A0A0C;
      color: #EDEDEF;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0A0A0C;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #121214;
      border: 1px solid #1A1A1E;
      border-radius: 18px;
      padding: 36px 30px;
      box-sizing: border-box;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 26px;
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      color: #6A59CE;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .banner-box {
      background: linear-gradient(135deg, rgba(106, 89, 206, 0.16) 0%, rgba(26, 26, 30, 0.6) 100%);
      border: 1px solid rgba(106, 89, 206, 0.35);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 26px;
      text-align: center;
    }
    .banner-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #A89BFF;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .banner-title {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
      line-height: 1.35;
      letter-spacing: -0.2px;
    }
    .salutation {
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF !important;
      margin: 0 0 18px 0;
    }
    p {
      font-size: 15px;
      color: #CBCBCF;
      line-height: 1.6;
      margin: 0 0 18px 0;
    }
    .highlight-quote {
      color: #EDEDEF;
      font-style: italic;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0 20px 0;
    }
    .btn {
      display: inline-block;
      background-color: #6A59CE;
      color: #FFFFFF !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(106, 89, 206, 0.35);
    }
    .direct-link-box {
      background-color: #0E0E11;
      border: 1px dashed #282830;
      border-radius: 10px;
      padding: 12px 16px;
      margin: 18px 0 24px 0;
      word-break: break-all;
      text-align: center;
    }
    .direct-link-label {
      font-size: 11px;
      color: #70707A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 4px;
    }
    .direct-link-url {
      color: #8F81FF;
      font-size: 13px;
      text-decoration: underline;
      font-weight: 500;
    }
    .signoff {
      margin-top: 26px;
      padding-top: 20px;
      border-top: 1px solid #1A1A1E;
    }
    .signoff-note {
      font-size: 15px;
      color: #EDEDEF;
      margin: 0 0 4px 0;
    }
    .signoff-sender {
      font-size: 15px;
      color: #99999F;
      margin: 0;
    }
    .footer {
      text-align: center;
      border-top: 1px solid #1A1A1E;
      padding-top: 22px;
      margin-top: 28px;
    }
    .footer-text {
      font-size: 12px;
      color: #52525A;
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <!-- Hidden Preheader / Preview Text -->
  <div style="display:none;font-size:1px;color:#0A0A0C;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${previewText}
    &#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;
  </div>

  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://usejumpa.com" class="logo">Jumpa</a>
      </div>

      <div class="banner-box">
        <h1 class="banner-title">You’re part of Jumpa’s next chapter.</h1>
      </div>

      <p class="salutation">${greeting}</p>

      <p>I’m Kamso from Jumpa, and I’m glad you’ve joined our private beta.</p>

      <p>We’re building Jumpa so you can move money the way you chat. Now we need to find out how that feels in your hands, not just ours.</p>

      <p>As you try it, you might find something you love or catch yourself thinking, <span class="highlight-quote">“Surely, this could work better.”</span> Please tell us either way. You won’t hurt our feelings. We’d rather hear about the confusing bit than keep building around it.</p>

      <p>That’s what our beta group is for. Come meet the team, get testing instructions and tell us what you think we should improve.</p>

      <div class="btn-container">
        <a href="${whatsappUrl}" target="_blank" class="btn">Join WhatsApp Beta Group &rarr;</a>
      </div>

      <div class="direct-link-box">
        <span class="direct-link-label">Direct WhatsApp Invite Link</span>
        <a href="${whatsappUrl}" target="_blank" class="direct-link-url">${whatsappUrl}</a>
      </div>

      <div class="signoff">
        <p class="signoff-note">See you there,</p>
        <p class="signoff-sender"> The <strong style="color: #FFFFFF;">Jumpa</strong> team</p>
      </div>

      <div class="footer">
        <p class="footer-text">You received this email because you registered for the Jumpa private beta waitlist.</p>
        <p class="footer-text" style="margin-top: 6px;">&copy; ${currentYear} Jumpa &bull; <a href="https://usejumpa.com" style="color: #6A59CE; text-decoration: none;">usejumpa.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends the waitlist private beta welcome email via Resend.
 */
export async function sendWaitlistWelcomeEmail(
  toEmail: string,
  data?: Partial<WaitlistEmailData>,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const key = environment.RESEND_API_KEY.trim();
  const configuredFrom = environment.RESEND_FROM_EMAIL.trim();
  const fallbackFrom = "Jumpa <onboarding@resend.dev>";
  const from = configuredFrom || fallbackFrom;

  if (!key) {
    console.warn("[email-notifications] RESEND_API_KEY missing — skipping waitlist welcome email");
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  const subject = data?.subject || WAITLIST_DEFAULT_SUBJECT;
  const htmlContent = generateWaitlistEmailHtml({
    email: toEmail,
    customerName: data?.customerName,
    whatsappUrl: data?.whatsappUrl,
  });

  const sendRequest = async (senderEmail: string) => {
    return fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [toEmail],
        subject,
        html: htmlContent,
      }),
    });
  };

  try {
    let res = await sendRequest(from);

    // If primary sender failed due to domain authorization on Resend, retry with onboarding@resend.dev
    if (!res.ok && configuredFrom && configuredFrom !== fallbackFrom) {
      const errText = await res.text();
      console.warn(
        `[email-notifications] Primary sender ${from} failed (${res.status}: ${errText}). Retrying with ${fallbackFrom}...`,
      );
      res = await sendRequest(fallbackFrom);
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[email-notifications] Resend API failed for waitlist email: ${res.status} ${text}`,
      );
      return { success: false, error: `Resend error: ${res.status} ${text}` };
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    console.log(
      `[email-notifications] Waitlist welcome email sent to ${toEmail} (ID: ${json.id || "ok"})`,
    );
    return { success: true, id: json.id };
  } catch (err: any) {
    console.error(
      "[email-notifications] Error dispatching waitlist welcome email via Resend:",
      err,
    );
    return { success: false, error: err.message || "Failed to dispatch email" };
  }
}


