import { environment } from "./environment";
import { getSendByteClient, DEFAULT_SENDBYTE_FROM, SendByteError } from "./sendbyte";

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
      
      <div style="border: 1px dashed #2C2C35; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; background-color: #121214;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tbody>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; font-size: 13px; color: #70707A; font-weight: 500;">
                Amount Sent
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; font-size: 16px; font-weight: 700; color: #6A59CE; word-break: break-word;">
                ${amount} ${displayToken}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Recipient
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${recipientAddress}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Network
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${displayChain}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Transaction ID
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${transactionId.slice(0, 8)}...${transactionId.slice(-8)}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Date
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${formattedDate}
              </td>
            </tr>
          </tbody>
        </table>
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
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  if (!sendbyte) {
    console.warn("API_KEY missing");
    return;
  }

  const { amount, tokenSymbol, recipientAddress } = data;
  const displayToken = cleanTokenSymbol(tokenSymbol);
  const htmlContent = generateTransferEmailHtml(data);

  try {
    const res = await sendbyte.emails.send({
      from,
      to: toEmail,
      subject: `Payment Sent: ${amount} ${displayToken} to ${recipientAddress.slice(0, 6)}...`,
      html: htmlContent,
    });

    console.log(
      `[email-notifications] Transfer confirmation email sent to ${toEmail} (ID: ${res.id})`,
    );
  } catch (err: any) {
    if (err instanceof SendByteError) {
      console.error(
        `[email-notifications] Error [${err.code}] (${err.status}): ${err.message}`,
      );
    } else {
      console.error(
        "[email-notifications] Error dispatching email via SendByte:",
        err,
      );
    }
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
          If this was you, no action is needed. If you did not sign in recently, please review your active sessions in your account settings.
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
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  if (!sendbyte) {
    console.warn("[email-notifications] SENDBYTE_API_KEY missing — skipping login email alert");
    return;
  }

  const htmlContent = generateLoginAlertEmailHtml(data);

  try {
    const res = await sendbyte.emails.send({
      from,
      to: toEmail,
      subject: `New sign-in to your Jumpa account${data.device ? ` on ${data.device}` : ""}`,
      html: htmlContent,
    });

    console.log(
      `[email-notifications] Login alert email sent to ${toEmail} (ID: ${res.id})`,
    );
  } catch (err: any) {
    if (err instanceof SendByteError) {
      console.error(
        `[email-notifications] SendByte API error for login alert [${err.code}] (${err.status}): ${err.message}`,
      );
    } else {
      console.error(
        "[email-notifications] Error dispatching login alert via SendByte:",
        err,
      );
    }
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
 * Sends the waitlist private beta welcome email via SendByte.
 */
export async function sendWaitlistWelcomeEmail(
  toEmail: string,
  data?: Partial<WaitlistEmailData>,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  if (!sendbyte) {
    console.warn("[email-notifications] SENDBYTE_API_KEY missing — skipping waitlist welcome email");
    return { success: false, error: "SENDBYTE_API_KEY is not configured" };
  }

  const subject = data?.subject || WAITLIST_DEFAULT_SUBJECT;
  const htmlContent = generateWaitlistEmailHtml({
    email: toEmail,
    customerName: data?.customerName,
    whatsappUrl: data?.whatsappUrl,
  });

  try {
    const res = await sendbyte.emails.send({
      from,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(
      `[email-notifications] Waitlist welcome email sent to ${toEmail} (ID: ${res.id})`,
    );
    return { success: true, id: res.id };
  } catch (err: any) {
    if (err instanceof SendByteError) {
      console.error(
        `[email-notifications] SendByte API error for waitlist email [${err.code}] (${err.status}): ${err.message}`,
      );
      return { success: false, error: `SendByte error: [${err.code}] ${err.message}` };
    }
    console.error(
      "[email-notifications] Error dispatching waitlist welcome email via SendByte:",
      err,
    );
    return { success: false, error: err.message || "Failed to dispatch email" };
  }
}

// Deposit Confirmation Email

export interface DepositEmailData {
  customerName?: string;
  amount: string; // e.g. "₦50,000" or "50.00 USDC"
  currencyOrToken: string; // "NGN", "USDC", "SOL", "XLM", etc.
  channel: string; // "Naira Virtual Account", "Base", "Solana", "Stellar", "Onramp"
  senderInfo?: string; // e.g. "Access Bank • 0123456789 (JOHN DOE)" or wallet address
  transactionId: string;
  reference?: string;
  explorerUrl?: string;
  fiatPaid?: string; // If onramp: "₦75,000"
  date?: Date | string;
}

export function generateDepositEmailHtml(data: DepositEmailData): string {
  const {
    customerName,
    amount,
    currencyOrToken,
    channel,
    senderInfo,
    transactionId,
    reference,
    explorerUrl,
    fiatPaid,
    date = new Date(),
  } = data;

  const displayRef = reference || transactionId;
  const shortRef = displayRef.length > 20 ? `${displayRef.slice(0, 10)}...${displayRef.slice(-8)}` : displayRef;
  const formattedDate = new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const ctaUrl = explorerUrl || `https://usejumpa.com/transactions`;
  const formattedAmount = currencyOrToken && currencyOrToken !== "NGN" && !amount.includes(currencyOrToken)
    ? `${amount} ${currencyOrToken}`
    : amount;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deposit Confirmed</title>
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
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="wrapper" style="width: 100%; background-color: #0A0A0C; padding: 40px 16px; box-sizing: border-box;">
    <div class="container" style="max-width: 500px; margin: 0 auto; background-color: #121214; border: 1px solid #1A1A1E; border-radius: 16px; padding: 32px 24px; box-sizing: border-box;">
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://usejumpa.com" style="font-size: 24px; font-weight: 800; color: #6A59CE; text-decoration: none; letter-spacing: -0.5px;">Jumpa</a>
        <div style="margin-top: 10px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: rgba(16, 185, 129, 0.15); color: #34D399; text-transform: uppercase; letter-spacing: 0.5px;">Deposit Confirmed</span>
        </div>
      </div>
      
      <p style="font-size: 15px; color: #EDEDEF; margin: 0 0 6px 0; font-weight: 600;">Hi ${customerName || "there"},</p>
      <p style="font-size: 14px; color: #99999F; line-height: 1.5; margin: 0 0 24px 0;">Your deposit has been successfully received and credited to your Jumpa account.</p>
      
      <div style="border: 1px dashed #2C2C35; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; background-color: #121214;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tbody>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; font-size: 13px; color: #70707A; font-weight: 500;">
                Amount Credited
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; font-size: 16px; font-weight: 700; color: #34D399; word-break: break-word;">
                ${formattedAmount}
              </td>
            </tr>
            ${fiatPaid ? `
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Amount Paid
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${fiatPaid}
              </td>
            </tr>` : ""}
            ${senderInfo ? `
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Sender / Source
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${senderInfo}
              </td>
            </tr>` : ""}
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Channel
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${channel}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Reference
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${shortRef}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Date
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${formattedDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #6A59CE; color: #FFFFFF !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 12px;">View in Jumpa</a>
      </div>
      
      <div style="text-align: center; border-top: 1px solid #1A1A1E; padding-top: 20px;">
        <p style="font-size: 12px; color: #4E4E52; margin: 0;">Thank you for using Jumpa.</p>
        <p style="font-size: 12px; color: #4E4E52; margin: 6px 0 0 0;">&copy; ${new Date().getFullYear()} The Jumpa Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendDepositConfirmedEmail(
  toEmail: string,
  data: DepositEmailData,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  if (!sendbyte) {
    console.warn(`[email-notifications] API_KEY missing — skipping deposit email to ${toEmail}`);
    return { success: false, error: "API_KEY missing" };
  }

  const htmlContent = generateDepositEmailHtml(data);
  const formattedAmount = data.currencyOrToken && data.currencyOrToken !== "NGN" && !data.amount.includes(data.currencyOrToken)
    ? `${data.amount} ${data.currencyOrToken}`
    : data.amount;

  try {
    const res = await sendbyte.emails.send({
      from,
      to: toEmail,
      subject: `Deposit Confirmed: ${formattedAmount} credited to your account`,
      html: htmlContent,
    });

    console.log(`[email-notifications] Deposit confirmation email sent to ${toEmail} (ID: ${res.id})`);
    return { success: true, id: res.id };
  } catch (err: any) {
    console.error("[email-notifications] Error:", err);
    return { success: false, error: err?.message || "SendByte dispatch error" };
  }
}

// Withdrawal Confirmation Email

export interface WithdrawalEmailData {
  customerName?: string;
  amount: string; // e.g. "₦25,000" or "50.00 USDC"
  currencyOrToken: string; // "NGN", "USDC", "SOL", etc.
  channel: string; // "Naira Bank Transfer", "Offramp", "Base", "Solana", etc.
  destinationInfo: string; // e.g. "Guaranty Trust Bank • 0123456789 (Jane Doe)" or recipient wallet address
  transactionId: string;
  reference?: string;
  explorerUrl?: string;
  fiatReceived?: string; // If offramp: "₦75,000"
  date?: Date | string;
}

export function generateWithdrawalEmailHtml(data: WithdrawalEmailData): string {
  const {
    customerName,
    amount,
    currencyOrToken,
    channel,
    destinationInfo,
    transactionId,
    reference,
    explorerUrl,
    fiatReceived,
    date = new Date(),
  } = data;

  const displayRef = reference || transactionId;
  const shortRef = displayRef.length > 20 ? `${displayRef.slice(0, 10)}...${displayRef.slice(-8)}` : displayRef;
  const formattedDate = new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const ctaUrl = explorerUrl || `https://usejumpa.com/transactions`;
  const formattedAmount = currencyOrToken && currencyOrToken !== "NGN" && !amount.includes(currencyOrToken)
    ? `${amount} ${currencyOrToken}`
    : amount;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Withdrawal Successful</title>
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
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="wrapper" style="width: 100%; background-color: #0A0A0C; padding: 40px 16px; box-sizing: border-box;">
    <div class="container" style="max-width: 500px; margin: 0 auto; background-color: #121214; border: 1px solid #1A1A1E; border-radius: 16px; padding: 32px 24px; box-sizing: border-box;">
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://usejumpa.com" style="font-size: 24px; font-weight: 800; color: #6A59CE; text-decoration: none; letter-spacing: -0.5px;">Jumpa</a>
        <div style="margin-top: 10px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: rgba(106, 89, 206, 0.15); color: #A89BFF; text-transform: uppercase; letter-spacing: 0.5px;">Withdrawal Successful</span>
        </div>
      </div>
      
      <p style="font-size: 15px; color: #EDEDEF; margin: 0 0 6px 0; font-weight: 600;">Hi ${customerName || "there"},</p>
      <p style="font-size: 14px; color: #99999F; line-height: 1.5; margin: 0 0 24px 0;">Your withdrawal has been processed and sent successfully.</p>
      
      <div style="border: 1px dashed #2C2C35; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; background-color: #121214;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tbody>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; font-size: 13px; color: #70707A; font-weight: 500;">
                Amount Sent
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; font-size: 16px; font-weight: 700; color: #A89BFF; word-break: break-word;">
                ${formattedAmount}
              </td>
            </tr>
            ${fiatReceived ? `
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Delivered to Bank
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${fiatReceived}
              </td>
            </tr>` : ""}
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Destination
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${destinationInfo}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Channel
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${channel}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Reference
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${shortRef}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Date
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${formattedDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #6A59CE; color: #FFFFFF !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 12px;">View Transaction</a>
      </div>

      <div style="background-color: #16161A; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #70707A; line-height: 1.4;">
        If you did not authorize this withdrawal, please lock your account or contact support immediately at support@usejumpa.com.
      </div>
      
      <div style="text-align: center; border-top: 1px solid #1A1A1E; padding-top: 20px;">
        <p style="font-size: 12px; color: #4E4E52; margin: 0;">Thank you for using Jumpa.</p>
        <p style="font-size: 12px; color: #4E4E52; margin: 6px 0 0 0;">&copy; ${new Date().getFullYear()} The Jumpa Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendWithdrawalConfirmedEmail(
  toEmail: string,
  data: WithdrawalEmailData,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  if (!sendbyte) {
    console.warn(`[email-notifications] API_KEY missing — skipping withdrawal email to ${toEmail}`);
    return { success: false, error: "API_KEY missing" };
  }

  const htmlContent = generateWithdrawalEmailHtml(data);
  const formattedAmount = data.currencyOrToken && data.currencyOrToken !== "NGN" && !data.amount.includes(data.currencyOrToken)
    ? `${data.amount} ${data.currencyOrToken}`
    : data.amount;

  try {
    const res = await sendbyte.emails.send({
      from,
      to: toEmail,
      subject: `Withdrawal Successful: ${formattedAmount} sent`,
      html: htmlContent,
    });

    console.log(`[email-notifications] Withdrawal confirmation email sent to ${toEmail} (ID: ${res.id})`);
    return { success: true, id: res.id };
  } catch (err: any) {
    console.error("[email-notifications] Error:", err);
    return { success: false, error: err?.message || "SendByte dispatch error" };
  }
}
// Withdrawal Failed Alert Email

export interface WithdrawalFailedEmailData {
  customerName?: string;
  amount: string; // e.g. "₦25,000" or "50.00 USDC"
  currencyOrToken: string; // "NGN", "USDC", etc.
  channel: string; // "Naira Bank Transfer", "Offramp", etc.
  destinationInfo: string;
  reason: string;
  refundStatus?: string; // e.g. "Refunded to your Naira balance"
  transactionId: string;
  reference?: string;
  date?: Date | string;
}

export function generateWithdrawalFailedEmailHtml(data: WithdrawalFailedEmailData): string {
  const {
    customerName,
    amount,
    currencyOrToken,
    channel,
    destinationInfo,
    reason,
    refundStatus = "Your funds are safe and will be refunded to your balance.",
    transactionId,
    reference,
    date = new Date(),
  } = data;

  const displayRef = reference || transactionId;
  const shortRef = displayRef.length > 20 ? `${displayRef.slice(0, 10)}...${displayRef.slice(-8)}` : displayRef;
  const formattedDate = new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const formattedAmount = currencyOrToken && currencyOrToken !== "NGN" && !amount.includes(currencyOrToken)
    ? `${amount} ${currencyOrToken}`
    : amount;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Withdrawal Failed</title>
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
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="wrapper" style="width: 100%; background-color: #0A0A0C; padding: 40px 16px; box-sizing: border-box;">
    <div class="container" style="max-width: 500px; margin: 0 auto; background-color: #121214; border: 1px solid #1A1A1E; border-radius: 16px; padding: 32px 24px; box-sizing: border-box;">
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://usejumpa.com" style="font-size: 24px; font-weight: 800; color: #6A59CE; text-decoration: none; letter-spacing: -0.5px;">Jumpa</a>
        <div style="margin-top: 10px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: rgba(239, 68, 68, 0.15); color: #F87171; text-transform: uppercase; letter-spacing: 0.5px;">Withdrawal Failed</span>
        </div>
      </div>
      
      <p style="font-size: 15px; color: #EDEDEF; margin: 0 0 6px 0; font-weight: 600;">Hi ${customerName || "there"},</p>
      <p style="font-size: 14px; color: #99999F; line-height: 1.5; margin: 0 0 24px 0;">Your withdrawal of ${formattedAmount} could not be completed.</p>
      
      <div style="border: 1px dashed #2C2C35; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; background-color: #121214;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tbody>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; font-size: 13px; color: #70707A; font-weight: 500;">
                Amount
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; font-size: 16px; font-weight: 700; color: #F87171; word-break: break-word;">
                ${formattedAmount}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Destination
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${destinationInfo}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Reason
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #F87171; word-break: break-word;">
                ${reason}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Channel
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${channel}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Reference
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${shortRef}
              </td>
            </tr>
            <tr>
              <td align="left" valign="top" style="text-align: left; vertical-align: top; width: 38%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; color: #70707A; font-weight: 500;">
                Date
              </td>
              <td align="right" valign="top" style="text-align: right; vertical-align: top; width: 62%; padding: 8px 0; border-top: 1px solid #1F1F24; font-size: 13px; font-weight: 600; color: #EDEDEF; word-break: break-word;">
                ${formattedDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #A7F3D0; line-height: 1.4;">
        <strong style="color: #34D399;">Funds Protection:</strong> ${refundStatus}
      </div>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://usejumpa.com/transactions" target="_blank" style="display: inline-block; background-color: #6A59CE; color: #FFFFFF !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 26px; border-radius: 12px;">View in Jumpa</a>
      </div>
      
      <div style="text-align: center; border-top: 1px solid #1A1A1E; padding-top: 20px;">
        <p style="font-size: 12px; color: #4E4E52; margin: 0;">If you have any questions, our support team is available at support@usejumpa.com.</p>
        <p style="font-size: 12px; color: #4E4E52; margin: 6px 0 0 0;">&copy; ${new Date().getFullYear()} The Jumpa Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendWithdrawalFailedEmail(
  toEmail: string,
  data: WithdrawalFailedEmailData,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const sendbyte = getSendByteClient();
  const from = DEFAULT_SENDBYTE_FROM;

  if (!sendbyte) {
    console.warn(`[email-notifications] API_KEY missing — skipping failed withdrawal email to ${toEmail}`);
    return { success: false, error: "API_KEY missing" };
  }

  const htmlContent = generateWithdrawalFailedEmailHtml(data);

  try {
    const res = await sendbyte.emails.send({
      from,
      to: toEmail,
      subject: `Withdrawal Failed: ${data.amount} ${data.currencyOrToken} transfer could not be completed`,
      html: htmlContent,
    });

    console.log(`[email-notifications] Withdrawal failed email sent to ${toEmail} (ID: ${res.id})`);
    return { success: true, id: res.id };
  } catch (err: any) {
    console.error("[email-notifications] Error:", err);
    return { success: false, error: err?.message || "Email error" };
  }
}



