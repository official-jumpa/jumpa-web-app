import { environment } from "./environment";

interface TransferEmailData {
  customerName: string;
  amount: string;
  tokenSymbol: string;
  recipientAddress: string;
  transactionId: string;
  chainName: string;
}

function cleanTokenSymbol(token: string): string {
  const t = token.toUpperCase();
  if (t.startsWith("USDC")) return "USDC";
  if (t.startsWith("USDT")) return "USDT";
  if (t === "BASE" || t === "SEP") return "ETH";
  if (t.startsWith("SOL")) return "SOL";
  if (t.startsWith("XLM")) return "XLM";
  return token;
}

function formatChainName(chain: string): string {
  switch (chain) {
    case "baseSepolia":
      return "Base Sepolia";
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

function getExplorerUrl(tokenSymbol: string, hash: string): string {
  const sym = tokenSymbol.toUpperCase();
  if (sym.includes("SOL")) {
    const isDev = sym.includes("DEV") || sym.includes("TEST");
    return `https://solscan.io/tx/${hash}?cluster=${isDev ? "devnet" : "mainnet"}`;
  } else if (sym.includes("XLM")) {
    const isTest = sym.includes("TEST") || sym.includes("DEV");
    return `https://stellar.expert/explorer/${isTest ? "testnet" : "public"}/tx/${hash}`;
  } else {
    const isSepolia =
      sym.includes("SEP") || sym.includes("TEST") || sym.includes("DEV");
    return `https://${isSepolia ? "sepolia." : ""}basescan.org/tx/${hash}`;
  }
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

  const htmlContent = `
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
