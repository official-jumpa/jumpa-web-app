/**
 * Jumpa Account Statement PDF Generator
 *
 * Generates an official, bank-grade vector PDF statement using jsPDF and jspdf-autotable.
 * - Text is 100% vector, selectable, searchable, and copyable.
 * - Native Naira sign (₦) support powered by embedded Verdana TrueType font.
 * - Single Jumpa purple logo at top left.
 * - Clean Account Details & Statement Overview cards.
 * - Dedicated, highly legible Multi-Currency Financial Activity Summary table.
 * - Separate Debit and Credit columns (no plus/minus signs, no red color).
 * - Multiline row wrapping with full un-truncated references.
 * - Automatic pagination with clean headers and footers (no continuation text, no support email).
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { StatementData } from "@/lib/functions/statementFunctions";

const LOGO_SRC = "/logo/mark/purple.png";
const VERDANA_REGULAR_URL = "/fonts/Verdana.ttf";
const VERDANA_BOLD_URL = "/fonts/Verdana-Bold.ttf";

/**
 * Sanitizes any text string to be strictly compatible with PDF fonts.
 * Preserves ASCII and the Naira symbol (U+20A6).
 */
export function sanitizePdfText(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2022/g, "|")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\x7F\u20A6]/g, "")
    .trim();
}

/**
 * Formats monetary amounts with Naira symbol (₦) for NGN and ISO currency codes for crypto.
 */
export function formatMoney(amount: number, currency: string): string {
  const isNgn = currency.toUpperCase() === "NGN" || currency.toUpperCase() === "CNGN";
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (isNgn) {
    return `₦${formatted}`;
  }
  return `${formatted} ${currency.toUpperCase()}`;
}

/**
 * Loads an image from URL and returns a base64 Data URL.
 */
async function loadBase64Image(src: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[statement-pdf] Could not load logo image:", err);
    return null;
  }
}

/**
 * Loads a TTF font from public URL or local filesystem, returning a base64 string.
 */
async function loadBase64Font(src: string): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localPath = path.join(process.cwd(), "public", src.replace(/^\//, ""));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath).toString("base64");
      }
    } catch {
      return null;
    }
    return null;
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[statement-pdf] Could not load font:", src, err);
    return null;
  }
}

/**
 * Builds the complete vector PDF document Blob from statement data.
 */
export async function generateStatementPdf(statement: StatementData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const rightEdge = pageWidth - marginX; // 196mm

  // 1. Load single Jumpa Logo & Fonts in parallel
  const [logoDataUrl, regFontBase64, boldFontBase64] = await Promise.all([
    loadBase64Image(LOGO_SRC),
    loadBase64Font(VERDANA_REGULAR_URL),
    loadBase64Font(VERDANA_BOLD_URL),
  ]);

  let fontName = "helvetica";
  if (regFontBase64) {
    doc.addFileToVFS("Verdana.ttf", regFontBase64);
    doc.addFont("Verdana.ttf", "Verdana", "normal");
    fontName = "Verdana";
  }
  if (boldFontBase64) {
    doc.addFileToVFS("Verdana-Bold.ttf", boldFontBase64);
    doc.addFont("Verdana-Bold.ttf", "Verdana", "bold");
  }

  const hasNairaFont = fontName === "Verdana";
  const safe = (str: string | undefined | null) => {
    const sanitized = sanitizePdfText(str);
    return hasNairaFont ? sanitized : sanitized.replace(/\u20A6/g, "NGN ");
  };

  // 2. Page 1 Header
  if (logoDataUrl) {
    const logoW = 30;
    const logoH = (logoW * 381) / 803; // ~14.2mm
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, 10, logoW, logoH, undefined, "FAST");
    } catch {
      doc.setFont(fontName, "bold");
      doc.setFontSize(16);
      doc.setTextColor(143, 18, 255);
      doc.text("Jumpa", marginX, 18);
    }
  } else {
    doc.setFont(fontName, "bold");
    doc.setFontSize(16);
    doc.setTextColor(143, 18, 255);
    doc.text("Jumpa", marginX, 18);
  }

  // Right Header Text
  doc.setFont(fontName, "bold");
  doc.setFontSize(13);
  doc.setTextColor(29, 29, 41);
  doc.text("ACCOUNT STATEMENT", rightEdge, 14, { align: "right" });

  doc.setFont(fontName, "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 129);
  doc.text(`Statement ID: ${safe(statement.statementId)}`, rightEdge, 19, {
    align: "right",
  });
  doc.text(`Generated: ${safe(statement.generatedAt)}`, rightEdge, 23, {
    align: "right",
  });

  // Top Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, 27, rightEdge, 27);

  // 3. Info Cards Section (Account Details on Left, Bank & Wallets on Right)
  const cardY = 31;
  const colGap = 5;
  const card1W = 62; // Compact Account Details
  const card2W = contentWidth - card1W - colGap; // 115mm spacious section for Bank & Wallets
  const cardH = 29;

  // Card 1: Account Details (Left)
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, cardY, card1W, cardH, 2.5, 2.5, "FD");

  doc.setFont(fontName, "bold");
  doc.setFontSize(7);
  doc.setTextColor(143, 18, 255);
  doc.text("ACCOUNT DETAILS", marginX + 4, cardY + 5.2);

  doc.setFont(fontName, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(safe(statement.accountHolder.name || "Jumpa Account"), marginX + 4, cardY + 9.8);

  doc.setFont(fontName, "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(107, 114, 129);

  let accDetailY = cardY + 13.8;
  if (statement.accountHolder.email) {
    doc.text(safe(statement.accountHolder.email), marginX + 4, accDetailY);
    accDetailY += 3.7;
  }

  const periodFrom = statement.period?.from || "";
  const periodTo = statement.period?.to || "";
  doc.text(`Period: ${safe(periodFrom)} - ${safe(periodTo)}`, marginX + 4, accDetailY);
  accDetailY += 3.7;

  const currencyScope = (statement.currency || "ALL").toUpperCase();
  const txCount = statement.transactions?.length || 0;
  doc.text(`Scope: ${safe(currencyScope)} (${txCount} ${txCount === 1 ? "Tx" : "Txs"})`, marginX + 4, accDetailY);
  accDetailY += 3.7;

  if (statement.accountHolder.homeAddress) {
    doc.setFontSize(6.0);
    doc.setTextColor(75, 85, 99);
    const splitAddr = doc.splitTextToSize(safe(statement.accountHolder.homeAddress), card1W - 8);
    doc.text(splitAddr, marginX + 4, accDetailY);
  }

  // Card 2: Bank Account & Wallets (Right - Wide)
  const card2X = marginX + card1W + colGap;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(card2X, cardY, card2W, cardH, 2.5, 2.5, "FD");

  doc.setFont(fontName, "bold");
  doc.setFontSize(7);
  doc.setTextColor(143, 18, 255);
  doc.text("BANK ACCOUNT & WALLETS", card2X + 4, cardY + 5.2);

  let wY = cardY + 9.8;

  // NGN Virtual Bank Account
  if (statement.bankAccount && (statement.bankAccount.accountNumber || statement.bankAccount.bankName)) {
    doc.setFont(fontName, "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(55, 65, 81);
    doc.text("NGN Bank: ", card2X + 4, wY);

    doc.setFont(fontName, "normal");
    doc.setTextColor(17, 24, 39);
    const bankDesc = `${statement.bankAccount.bankName || "Virtual Bank"} - ${statement.bankAccount.accountNumber || "N/A"}`;
    doc.text(safe(bankDesc), card2X + 18, wY);
    wY += 3.8;
  }

  // Solana Wallet Address
  if (statement.wallets?.solana) {
    doc.setFont(fontName, "bold");
    doc.setFontSize(6.0);
    doc.setTextColor(55, 65, 81);
    doc.text("Solana: ", card2X + 4, wY);

    doc.setFont(fontName, "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(safe(statement.wallets.solana), card2X + 15, wY);
    wY += 3.8;
  }

  // BASE/ETH Wallet Address (EVM)
  const evmAddress = statement.wallets?.base || statement.wallets?.ethereum;
  if (evmAddress) {
    doc.setFont(fontName, "bold");
    doc.setFontSize(6.0);
    doc.setTextColor(55, 65, 81);
    doc.text("BASE/ETH: ", card2X + 4, wY);

    doc.setFont(fontName, "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(safe(evmAddress), card2X + 19, wY);
    wY += 3.8;
  }

  // Stellar Wallet Address
  if (statement.wallets?.stellar) {
    doc.setFont(fontName, "bold");
    doc.setFontSize(6.0);
    doc.setTextColor(55, 65, 81);
    doc.text("Stellar: ", card2X + 4, wY);

    doc.setFont(fontName, "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(safe(statement.wallets.stellar), card2X + 15, wY);
    wY += 3.8;
  }

  // Tron Wallet Address (if present)
  if (statement.wallets?.tron) {
    doc.setFont(fontName, "bold");
    doc.setFontSize(6.0);
    doc.setTextColor(55, 65, 81);
    doc.text("Tron: ", card2X + 4, wY);

    doc.setFont(fontName, "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(safe(statement.wallets.tron), card2X + 13, wY);
    wY += 3.8;
  }

  // Fallback if no bank account or wallets found
  if (!statement.bankAccount && !statement.wallets) {
    doc.setFont(fontName, "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(156, 163, 175);
    doc.text("No external bank account or wallets linked", card2X + 4, wY);
  }
  const summarySectionY = cardY + cardH + 5;
  doc.setFont(fontName, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("FINANCIAL ACTIVITY SUMMARY", marginX, summarySectionY);

  const summaryHead = [
    ["Currency", "Total Inflow", "Total Outflow", "Net Movement", "Activity"],
  ];

  const summaryBody = statement.summaries.map((s) => {
    const isNetPos = s.netMovement >= 0;
    const netFormatted = `${isNetPos ? "" : "-"}${formatMoney(Math.abs(s.netMovement), s.currency)}`;
    return [
      safe(s.currency),
      safe(formatMoney(s.totalInflow, s.currency)),
      safe(formatMoney(s.totalOutflow, s.currency)),
      safe(netFormatted),
      `${s.count} ${s.count === 1 ? "transaction" : "transactions"}`,
    ];
  });

  if (summaryBody.length === 0) {
    summaryBody.push([
      safe(statement.currency.toUpperCase()),
      "0.00",
      "0.00",
      "0.00",
      "0 transactions",
    ]);
  }

  autoTable(doc, {
    startY: summarySectionY + 2,
    margin: { left: marginX, right: marginX },
    head: summaryHead,
    body: summaryBody,
    theme: "plain",
    tableWidth: contentWidth,
    styles: {
      font: fontName,
    },
    headStyles: {
      font: fontName,
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: "bold",
      fontSize: 7.2,
      cellPadding: 1.8,
    },
    bodyStyles: {
      font: fontName,
      fontSize: 7.2,
      textColor: [31, 41, 55],
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [243, 244, 246],
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold", textColor: [17, 24, 39] }, // Currency
      1: { cellWidth: 40, halign: "right", fontStyle: "bold", textColor: [22, 163, 74] }, // Inflow (Green)
      2: { cellWidth: 40, halign: "right", fontStyle: "bold", textColor: [17, 24, 39] }, // Outflow (Black)
      3: { cellWidth: 44, halign: "right", fontStyle: "bold", textColor: [17, 24, 39] }, // Net Movement
      4: { cellWidth: 30, halign: "right", fontSize: 6.8, textColor: [107, 114, 129] }, // Tx Count
    },
    didParseCell: (data) => {
      // Color Net Movement green if positive, black if negative
      if (data.section === "body" && data.column.index === 3) {
        const rowData = statement.summaries[data.row.index];
        if (rowData && rowData.netMovement > 0) {
          data.cell.styles.textColor = [22, 163, 74];
        } else {
          data.cell.styles.textColor = [17, 24, 39];
        }
      }
    },
  });

  const summaryFinalY = (doc as any).lastAutoTable?.finalY || summarySectionY + 20;

  // 5. Transaction Ledger Section
  const ledgerSectionY = summaryFinalY + 6;
  doc.setFont(fontName, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text("TRANSACTION LEDGER", marginX, ledgerSectionY);

  const tableHead = [
    [
      "Date & Time",
      "Description",
      "Type",
      "Reference",
      "Debit",
      "Credit",
    ],
  ];

  const tableBody = statement.transactions.map((tx) => [
    safe(tx.date),
    safe(tx.description),
    safe(tx.formattedType),
    safe(tx.reference),
    safe(tx.debit),
    safe(tx.credit),
  ]);

  if (tableBody.length === 0) {
    tableBody.push([
      safe(statement.period.from),
      "No confirmed transactions found for this period",
      "",
      "",
      "",
      "",
    ]);
  }

  autoTable(doc, {
    startY: ledgerSectionY + 2,
    margin: { left: marginX, right: marginX, bottom: 15, top: 20 },
    head: tableHead,
    body: tableBody,
    theme: "plain",
    tableWidth: contentWidth,
    rowPageBreak: "avoid",
    styles: {
      font: fontName,
    },
    headStyles: {
      font: fontName,
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: "bold",
      fontSize: 7.2,
      cellPadding: 2,
    },
    bodyStyles: {
      font: fontName,
      fontSize: 7,
      textColor: [31, 41, 55],
      cellPadding: 2,
      overflow: "linebreak",
      lineWidth: 0.1,
      lineColor: [243, 244, 246],
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    columnStyles: {
      0: { cellWidth: 26, fontSize: 6.8, textColor: [107, 114, 129] }, // Date & Time
      1: { cellWidth: 42, fontSize: 7.5, fontStyle: "bold", textColor: [17, 24, 39] }, // Description
      2: { cellWidth: 18, fontSize: 7.2, textColor: [75, 85, 99] }, // Type
      3: { cellWidth: 36, fontSize: 6.5, textColor: [107, 114, 129] }, // Reference (Full, multiline)
      4: { cellWidth: 30, halign: "right", fontSize: 7.2, fontStyle: "bold", textColor: [17, 24, 39] }, // Debit (Solid Black)
      5: { cellWidth: 30, halign: "right", fontSize: 7.2, fontStyle: "bold", textColor: [22, 163, 74] }, // Credit (Green)
    },
    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;

      // Header on Page 2+ (Subsequent pages)
      if (pageNumber > 1) {
        doc.setFont(fontName, "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(143, 18, 255);
        doc.text("Jumpa Account Statement", marginX, 11);

        doc.setFont(fontName, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(107, 114, 129);
        doc.text(`Ref: ${safe(statement.statementId)}`, rightEdge, 11, {
          align: "right",
        });

        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(marginX, 14, rightEdge, 14);
      }

      // Footer on Every Page (No support email, no continuation text)
      const footerY = pageHeight - 8;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY - 3, rightEdge, footerY - 3);

      doc.setFont(fontName, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.text(
        "Official computer-generated account statement issued by Jumpa Technologies.",
        marginX,
        footerY + 1,
      );

      doc.setFontSize(7);
      doc.setTextColor(107, 114, 129);
      const totalPagesExp = "{total_pages_count_string}";
      doc.text(`Page ${pageNumber} of ${totalPagesExp}`, rightEdge, footerY + 1, {
        align: "right",
      });
    },
  });

  // Calculate and replace total pages string across all pages
  if (typeof doc.putTotalPages === "function") {
    doc.putTotalPages("{total_pages_count_string}");
  }

  const arrayBuffer = doc.output("arraybuffer");
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

/**
 * Triggers a direct browser download of the statement PDF
 */
export function downloadStatementBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
