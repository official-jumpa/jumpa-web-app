/**
 * Account statement PDF, drawn with jsPDF + jspdf-autotable so every word
 * stays selectable. Verdana is embedded because it carries ₦ (Geist does not).
 * Layout numbers are the design's px on a 1142px-wide page, scaled to A4.
 */

import { jsPDF } from "jspdf";
import autoTable, { type CellHookData, type RowInput, type Styles } from "jspdf-autotable";
import { getAssetLogo } from "@/lib/assets";
import { loadImage } from "@/lib/canvas";
import type { StatementData } from "@/lib/functions/statementFunctions";
import { SUPPORT_EMAIL } from "@/lib/support";

const LOGO_SRC = "/logo/wordmark/purple.png";
/** The wordmark PNG is 384 × 80. */
const LOGO_RATIO = 384 / 80;
const VERDANA_REGULAR_URL = "/fonts/Verdana.ttf";
const VERDANA_BOLD_URL = "/fonts/Verdana-Bold.ttf";

/** The design's page width; every layout number below is in its px. */
const DESIGN_WIDTH = 1142;
/** Verdana sets wider than the design's Geist, so type is drawn a touch smaller. */
const TYPE_SCALE = 0.9;
const MARGIN = 50;
const CONTENT = 1042;
const RADIUS = 20;
/** Marks a cell with nothing to show, as the design does for a missing fee. */
const NONE = "----";

const COLOR = {
  brand: "#8f12ff",
  title: "#23232b",
  label: "#57565b",
  muted: "#8b8b8b",
  value: "#4a4a4a",
  page: "#959595",
  credit: "#0ab46d",
  creditFill: "#eaf8f1",
  debit: "#fb4f6e",
  debitFill: "#fff0f2",
  card: "#f8f8fa",
  head: "#eeeff3",
  zebra: "#fcf9ff",
  rule: "#e2e2e7",
  border: "#e6e6e6",
} as const;

/** A table column in design px. Medium type maps to Verdana regular, SemiBold to bold. */
type Column = {
  label: string;
  width: number;
  left?: number;
  right?: number;
  /** Header inset when it differs from the body's. */
  headLeft?: number;
  center?: boolean;
  size?: number;
  bold?: boolean;
  color?: string;
  /** Shrinks the type rather than wrap to a second line. */
  single?: boolean;
};

const ASSET_COLUMNS: Column[] = [
  { label: "Date/time", width: 191, left: 20, size: 12, single: true },
  { label: "Asset", width: 181, left: 52, headLeft: 20 },
  { label: "Bought", width: 216, left: 20, bold: true, single: true },
  { label: "Sold", width: 235, left: 20, bold: true, single: true },
  { label: "Reference value", width: 219, left: 20, right: 20, bold: true, color: COLOR.value, single: true },
];

const HISTORY_COLUMNS: Column[] = [
  { label: "Date/time", width: 173, left: 20, size: 12, single: true },
  { label: "Type/Description", width: 185 },
  { label: "Credit/Debit", width: 98 },
  { label: "Asset", width: 84, right: 21, center: true, size: 12, bold: true, color: COLOR.value, single: true },
  { label: "Fee", width: 84, right: 21, center: true, size: 12, bold: true, color: COLOR.value, single: true },
  { label: "Amount", width: 119, headLeft: 13, bold: true, single: true },
  { label: "Balance After", width: 114, bold: true, color: COLOR.value, single: true },
  { label: "Transaction Reference", width: 185, right: 20, bold: true, color: COLOR.value },
];

const SIGN = { inflow: "+ ", outflow: "- ", neutral: "" } as const;
const AMOUNT_COLOR = { inflow: COLOR.credit, outflow: COLOR.debit, neutral: COLOR.value } as const;

/**
 * Sanitizes any text string to be strictly compatible with PDF fonts.
 * Preserves ASCII and the Naira symbol (U+20A6).
 */
export function sanitizePdfText(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/•/g, "|")
    .replace(/…/g, "...")
    .replace(/[^\x00-\x7F₦]/g, "")
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

/** Coin amounts keep up to 6 decimals so 0.0004 BTC never prints as 0.00. */
function formatUnits(amount: number): string {
  return Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/** Naira as ₦; coins as "0.0012 BTC". */
function formatAmount(amount: number, token: string): string {
  return token === "NGN" ? formatMoney(amount, token) : `${formatUnits(amount)} ${token}`;
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

/** jsPDF reads neither WebP nor SVG, so a coin mark is redrawn to PNG. */
async function loadCoinMark(src: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    const image = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    canvas.getContext("2d")?.drawImage(image, 0, 0, 96, 96);
    return canvas.toDataURL("image/png");
  } catch {
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

  const scale = doc.internal.pageSize.getWidth() / DESIGN_WIDTH;
  const px = (value: number) => value * scale;
  /** Design px type size to points. */
  const pt = (size: number) => px(size) * TYPE_SCALE * (72 / 25.4);
  const pageBottom = doc.internal.pageSize.getHeight() / scale;

  const [logoDataUrl, regFontBase64, boldFontBase64, coinMarks] = await Promise.all([
    loadBase64Image(LOGO_SRC),
    loadBase64Font(VERDANA_REGULAR_URL),
    loadBase64Font(VERDANA_BOLD_URL),
    Promise.all(statement.assetActivity.map((asset) => loadCoinMark(getAssetLogo(asset.token)))),
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
    return hasNairaFont ? sanitized : sanitized.replace(/₦/g, "NGN ");
  };

  const setType = (size: number, bold: boolean, color: string) => {
    doc.setFont(fontName, bold ? "bold" : "normal");
    doc.setFontSize(pt(size));
    doc.setTextColor(color);
  };
  /** One line of already-safe text, centred vertically on `y`. */
  const write = (value: string, x: number, y: number) =>
    doc.text(value, px(x), px(y), { baseline: "middle" });
  /** One line shrunk to fit `room`, and trimmed only past 70% of its size. */
  const writeFitted = (value: string, x: number, y: number, room: number) => {
    const size = doc.getFontSize();
    const width = (line: string) => doc.getTextWidth(line);
    let line = safe(value);
    while (width(line) > px(room) && doc.getFontSize() > size * 0.7) {
      doc.setFontSize(doc.getFontSize() * 0.95);
    }
    if (width(line) > px(room)) {
      while (line.length > 1 && width(`${line}...`) > px(room)) line = line.slice(0, -1);
      line = `${line}...`;
    }
    write(line, x, y);
    doc.setFontSize(size);
  };
  const rule = (x: number, top: number) => {
    doc.setDrawColor(COLOR.rule);
    doc.setLineWidth(px(1));
    doc.line(px(x), px(top), px(x), px(top + 46));
  };
  const card = (top: number, height: number) => {
    doc.setFillColor(COLOR.card);
    doc.roundedRect(px(MARGIN), px(top), px(CONTENT), px(height), px(RADIUS), px(RADIUS), "F");
  };
  /** Label over value; `x` and `top` are the column's own corner. */
  const field = (label: string, value: string, x: number, top: number, room: number, color: string = COLOR.title) => {
    setType(14, false, COLOR.label);
    write(label, x, top + 7);
    setType(18, true, color);
    writeFitted(value, x, top + 28, room);
  };
  /** A full-width table row fill; `round` rounds the corners that meet the frame. Units are mm. */
  const band = (y: number, height: number, color: string, round?: "top" | "bottom") => {
    const x = px(MARGIN);
    const width = px(CONTENT);
    const r = px(RADIUS);
    doc.setFillColor(color);
    if (!round) {
      doc.rect(x, y, width, height, "F");
      return;
    }
    doc.roundedRect(x, y, width, height, r, r, "F");
    doc.rect(x, round === "top" ? y + r : y, width, height - r, "F");
  };
  const currentPage = () => doc.getCurrentPageInfo().pageNumber;

  /**
   * A rounded, bordered table: grey header band, lilac zebra rows, one frame
   * per page it spans. `paint` draws cells plain text can't. Returns its bottom in px.
   */
  const table = (options: {
    top: number;
    columns: Column[];
    body: RowInput[];
    rowHeight: number;
    /** A blank band under the rows on every page, for the page label. */
    footHeight?: number;
    parse?: (data: CellHookData) => void;
    paint?: (data: CellHookData) => void;
  }): number => {
    const { columns } = options;
    const frames = new Map<number, { top: number; bottom: number }>();
    const inset = (column: Column, head: boolean) => ({
      top: 0,
      bottom: 0,
      left: px((head ? column.headLeft : undefined) ?? column.left ?? 0),
      right: px(column.right ?? 12),
    });
    const align = (column: Column) => (column.center ? "center" : "left") as Styles["halign"];

    autoTable(doc, {
      startY: px(options.top),
      margin: { left: px(MARGIN), right: px(MARGIN), top: px(70), bottom: px(50) },
      tableWidth: px(CONTENT),
      theme: "plain",
      rowPageBreak: "avoid",
      showHead: "everyPage",
      showFoot: "everyPage",
      head: [
        columns.map((column) => ({
          content: column.label,
          styles: { cellPadding: inset(column, true), halign: align(column) },
        })),
      ],
      body: options.body,
      foot: options.footHeight
        ? [[{ content: "", colSpan: columns.length, styles: { minCellHeight: px(options.footHeight) } }]]
        : undefined,
      styles: {
        font: fontName,
        fontStyle: "normal",
        fontSize: pt(14),
        textColor: COLOR.label,
        fillColor: false,
        lineWidth: 0,
        valign: "middle",
        overflow: "linebreak",
        cellPadding: 0,
      },
      headStyles: { minCellHeight: px(59) },
      bodyStyles: { minCellHeight: px(options.rowHeight) },
      columnStyles: Object.fromEntries(
        columns.map((column, index) => [
          index,
          {
            cellWidth: px(column.width),
            cellPadding: inset(column, false),
            halign: align(column),
            fontSize: pt(column.size ?? 14),
            fontStyle: column.bold ? "bold" : "normal",
            textColor: column.color ?? COLOR.label,
          } satisfies Partial<Styles>,
        ]),
      ),
      didParseCell: (data) => {
        options.parse?.(data);
        const column = columns[data.column.index];
        if (data.section !== "body" || !column?.single || data.cell.colSpan > 1) return;
        const room = px(column.width - (column.left ?? 0) - (column.right ?? 12));
        doc.setFont(fontName, data.cell.styles.fontStyle);
        doc.setFontSize(data.cell.styles.fontSize);
        const width = doc.getTextWidth(data.cell.text.join(" "));
        if (width > room) data.cell.styles.fontSize *= room / width;
      },
      willDrawCell: (data) => {
        if (data.column.index !== 0) return;
        const last = !options.footHeight && data.row.index === options.body.length - 1;
        if (data.section === "head") band(data.cell.y, data.row.height, COLOR.head, "top");
        else if (data.section === "body" && data.row.index % 2 === 1) {
          band(data.cell.y, data.row.height, COLOR.zebra, last ? "bottom" : undefined);
        }
      },
      didDrawCell: (data) => {
        options.paint?.(data);
        if (data.column.index !== 0) return;
        const frame = frames.get(currentPage());
        frames.set(currentPage(), {
          top: Math.min(frame?.top ?? data.cell.y, data.cell.y),
          bottom: Math.max(frame?.bottom ?? 0, data.cell.y + data.row.height),
        });
      },
    });

    const lastPage = currentPage();
    doc.setDrawColor(COLOR.border);
    doc.setLineWidth(px(1));
    for (const [page, frame] of frames) {
      doc.setPage(page);
      const r = px(RADIUS);
      doc.roundedRect(px(MARGIN), frame.top, px(CONTENT), frame.bottom - frame.top, r, r, "S");
    }
    doc.setPage(lastPage);
    return (frames.get(lastPage)?.bottom ?? px(options.top)) / scale;
  };

  // Header: wordmark, title and the statement's three facts.
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", px(MARGIN), px(79), px(40 * LOGO_RATIO), px(40), undefined, "FAST");
  } else {
    setType(30, true, COLOR.brand);
    write("Jumpa", MARGIN, 99);
  }

  setType(30, true, COLOR.title);
  write("Account Statement", MARGIN, 180);

  const facts: [string, string, number, number][] = [
    ["Generated", statement.generatedAt, 487, 160],
    ["Statement Period", `${statement.period.from} - ${statement.period.to}`, 687, 175],
    ["Reference No.", statement.statementId, 897, 195],
  ];
  for (const [label, value, x, room] of facts) {
    setType(14, false, COLOR.label);
    write(label, x, 165.5);
    writeFitted(value, x, 186.5, room);
  }
  rule(660, 151);
  rule(875, 151);

  // Account card. Names and emails are never cut: a long one shrinks to 75%, then
  // wraps and the card grows. A home address, when asked for, takes a second row.
  const holder = statement.accountHolder;
  const accountTop = 227;
  const accountColumns: [string, string, number][] = [
    ["Account Name", holder.name, 35],
    ["Jumpa Tag", holder.jumpaTag || NONE, 185],
    ["Email", holder.email || NONE, 405],
    ["Country", holder.country || NONE, 710],
    ["Primary Currency", holder.primaryCurrency, 857],
  ];
  const account = accountColumns.map(([label, value, x], index) => {
    const room = px((accountColumns[index + 1]?.[2] ?? CONTENT) - x - 20);
    setType(18, true, COLOR.title);
    const full = doc.getFontSize();
    const size = Math.max(full * 0.75, Math.min(full, (full * room) / doc.getTextWidth(safe(value))));
    doc.setFontSize(size);
    return { label, x, size, lines: doc.splitTextToSize(safe(value), room) as string[] };
  });
  const wrapped = (Math.max(...account.map((column) => column.lines.length)) - 1) * 20;
  setType(18, true, COLOR.title);
  const address: string[] = holder.homeAddress
    ? doc.splitTextToSize(safe(holder.homeAddress), px(CONTENT - 70))
    : [];
  const addressTop = accountTop + 78 + wrapped;
  const accountHeight = 78 + wrapped + (address.length ? 61 + (address.length - 1) * 24 : 0);
  card(accountTop, accountHeight);
  for (const column of account) {
    setType(14, false, COLOR.label);
    write(column.label, MARGIN + column.x, accountTop + 24);
    setType(18, true, COLOR.title);
    doc.setFontSize(column.size);
    column.lines.forEach((line, index) => {
      write(line, MARGIN + column.x, accountTop + 45 + index * 20);
    });
  }
  if (address.length) {
    setType(14, false, COLOR.label);
    write("Address", MARGIN + 35, addressTop + 7);
    setType(18, true, COLOR.title);
    address.forEach((line, index) => {
      write(line, MARGIN + 35, addressTop + 28 + index * 24);
    });
  }

  // Totals card: naira totals where the statement has naira, else its first currency.
  const summaryTop = accountTop + accountHeight + 15;
  const primary = statement.summaries.find((summary) => summary.currency === "NGN") ?? statement.summaries[0];
  const currency = primary?.currency ?? "NGN";
  card(summaryTop, 73);
  const totals: [string, string, number, string?][] = [
    ["Total Debit", formatAmount(primary?.totalOutflow ?? 0, currency), 38],
    ["Total Credit", formatAmount(primary?.totalInflow ?? 0, currency), 199, COLOR.credit],
    ["Credit Count", String(statement.summary.creditCount), 352],
    ["Debit Count", String(statement.summary.debitCount), 509],
    ["Crypto purchased", formatMoney(statement.summary.cryptoPurchased, "NGN"), 640],
    ["Crypto sold", formatMoney(statement.summary.cryptoSold, "NGN"), 798],
  ];
  const dividers = [169, 328, 479, 611, 780];
  totals.forEach(([label, value, x, color], index) => {
    const room = (dividers[index] ?? CONTENT) - x - 12;
    field(label, value, MARGIN + x, summaryTop + 18, room, color);
  });
  for (const x of dividers) rule(MARGIN + x, summaryTop + 14);

  // Digital asset activity: naira buys and sells per coin; left out when there were none.
  let cursor = summaryTop + 73 + 26;
  if (statement.assetActivity.length > 0) {
    setType(18, true, COLOR.title);
    write("Digital asset activity", MARGIN, cursor + 9);
    const assetBottom = table({
      top: cursor + 33,
      columns: ASSET_COLUMNS,
      rowHeight: 67,
      body: statement.assetActivity.map((asset) =>
        [
          asset.date,
          asset.token,
          asset.bought > 0 ? `${formatUnits(asset.bought)} ${asset.token}` : NONE,
          asset.sold > 0 ? `${formatUnits(asset.sold)} ${asset.token}` : NONE,
          asset.rate ? `${formatMoney(asset.rate, "NGN")}/${asset.token}` : NONE,
        ].map(safe),
      ),
      paint: (data) => {
        const mark = coinMarks[data.row.index];
        if (data.section !== "body" || data.column.index !== 1 || !mark) return;
        const middle = data.cell.y + data.row.height / 2;
        doc.addImage(mark, "PNG", data.cell.x + px(7), middle - px(15.5), px(31), px(31));
      },
    });
    cursor = assetBottom + 25;
  }

  // Transaction history.
  setType(18, true, COLOR.title);
  write("Transaction history", MARGIN, cursor + 9);

  const rows = statement.transactions;
  const descriptions = new Map<number, { title: string[]; sub: string[] }>();
  /** Height of a title-over-subtitle block, in px. */
  const blockHeight = (title: number, sub: number) => (title - 1) * 17 + 14 + (sub ? 7 + (sub - 1) * 14 + 12 : 0);
  const pageLabels = new Map<number, number>();

  const historyBottom = table({
    top: cursor + 37,
    columns: HISTORY_COLUMNS,
    rowHeight: 69,
    footHeight: 36,
    body: rows.length
      ? rows.map((row) =>
          [
            row.date,
            "",
            "",
            row.token,
            row.fee > 0 ? formatUnits(row.fee) : NONE,
            `${SIGN[row.direction]}${formatAmount(row.rawAmount, row.token)}`,
            // TODO: no running balance is stored per transaction yet; print it here once one is.
            NONE,
            row.reference,
          ].map(safe),
        )
      : [
          [
            {
              content: "No confirmed transactions found for this period",
              colSpan: HISTORY_COLUMNS.length,
              styles: { halign: "center", cellPadding: 0, fontSize: pt(12), textColor: COLOR.muted },
            },
          ],
        ],
    parse: (data) => {
      const row = rows[data.row.index];
      if (data.section !== "body" || !row) return;
      if (data.column.index === 5) data.cell.styles.textColor = AMOUNT_COLOR[row.direction];
      if (data.column.index !== 1) return;
      setType(14, false, COLOR.label);
      const title = doc.splitTextToSize(safe(row.description), px(173));
      setType(12, false, COLOR.muted);
      const sub = row.subtitle ? doc.splitTextToSize(safe(row.subtitle), px(173)) : [];
      descriptions.set(data.row.index, { title, sub });
      data.cell.styles.minCellHeight = px(Math.max(69, 34 + blockHeight(title.length, sub.length)));
    },
    paint: (data) => {
      if (data.section === "foot") {
        pageLabels.set(currentPage(), data.cell.y + data.row.height / 2);
        return;
      }
      const row = rows[data.row.index];
      if (data.section !== "body" || !row) return;
      const middle = data.cell.y + data.row.height / 2;

      if (data.column.index === 1) {
        const block = descriptions.get(data.row.index);
        if (!block) return;
        const top = middle - px(blockHeight(block.title.length, block.sub.length)) / 2;
        setType(14, false, COLOR.label);
        block.title.forEach((line, index) => {
          doc.text(line, data.cell.x, top + px(index * 17 + 7), { baseline: "middle" });
        });
        const subTop = top + px((block.title.length - 1) * 17 + 14 + 7);
        setType(12, false, COLOR.muted);
        block.sub.forEach((line, index) => {
          doc.text(line, data.cell.x, subTop + px(index * 14 + 6), { baseline: "middle" });
        });
      }

      if (data.column.index === 2 && row.direction !== "neutral") {
        const credit = row.direction === "inflow";
        doc.setFillColor(credit ? COLOR.creditFill : COLOR.debitFill);
        doc.roundedRect(data.cell.x, middle - px(12), px(63), px(24), px(12), px(12), "F");
        setType(12, false, credit ? COLOR.credit : COLOR.debit);
        doc.text(credit ? "Credit" : "Debit", data.cell.x + px(31.5), middle, {
          baseline: "middle",
          align: "center",
        });
      }
    },
  });

  // Footer notice and sign-off, after the last row.
  setType(12, false, COLOR.muted);
  const notice: string[] = doc.splitTextToSize(
    `Statement ID ${safe(statement.statementId)}. This statement was generated electronically and does not need a signature. If something looks wrong, write to ${SUPPORT_EMAIL} within 30 days.`,
    px(612),
  );
  const footerHeight = notice.length * 16 + 7 + 35;
  let footerTop = historyBottom + 30;
  if (footerTop + footerHeight > pageBottom - 15) {
    doc.addPage();
    footerTop = 70;
  }
  notice.forEach((line, index) => {
    write(line, MARGIN, footerTop + 6 + index * 16);
  });
  const signOff = footerTop + notice.length * 16 + 7;
  setType(14, false, COLOR.label);
  write("Jumpa", MARGIN, signOff + 7);
  const brandWidth = doc.getTextWidth("Jumpa") / scale;
  setType(14, false, COLOR.muted);
  write(`·  Account statement  ·  ${SUPPORT_EMAIL}`, MARGIN + brandWidth + 8, signOff + 7);
  setType(14, false, COLOR.label);
  write("From Jumpa Technologies Ltd", MARGIN, signOff + 28);

  // Page labels sit in each page's table foot; later pages also name the statement up top.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    setType(12, false, COLOR.page);
    doc.text(`Page ${page} of ${pages}`, px(MARGIN + CONTENT - 25), pageLabels.get(page) ?? px(pageBottom - 30), {
      baseline: "middle",
      align: "right",
    });
    if (page > 1) {
      setType(12, false, COLOR.muted);
      write(`Account Statement  ·  ${safe(statement.statementId)}`, MARGIN, 40);
    }
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
