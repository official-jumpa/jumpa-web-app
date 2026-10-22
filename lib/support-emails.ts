/**
 * Support emails: one layout, a few messages. It mirrors the dashboard's dark
 * card so every Jumpa email looks alike. Tables, not flex: Gmail and Outlook
 * drop flexbox. Everything a user or agent wrote is escaped here.
 */

import { environment } from "@/lib/environment";
import {
  DEFAULT_SENDBYTE_FROM,
  getSendByteClient,
  SendByteError,
} from "@/lib/sendbyte";
import { SITE } from "@/lib/seo";
import { SUPPORT_EMAIL, supportHref } from "@/lib/support";
import type { AlertTone, SupportAlert } from "@/lib/support-alerts";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || SITE).replace(/\/+$/, "");
/** Email clients only load absolute image URLs. */
const LOGO_URL = `${SITE}/logo/mark/purple.png`;

/** Where a ticket opens in the app. */
export function ticketAppUrl(ticketId: string): string {
  return `${APP_URL}${supportHref("chat", { ticket: ticketId })}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Long unbroken strings (links, hashes) wrap instead of widening the card. */
const WRAP = "overflow-wrap:anywhere;word-break:break-word;";
const LABEL = `margin:0 0 8px;color:#8E8E93;font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;`;

/** The eyebrow pill above the headline, by how urgent the email is. */
const PILL: Record<AlertTone, { bg: string; fg: string }> = {
  new: { bg: "rgba(143,18,255,0.16)", fg: "#C084FC" },
  warn: { bg: "rgba(230,146,0,0.16)", fg: "#FBBF24" },
  urgent: { bg: "rgba(255,56,60,0.16)", fg: "#FF6B6E" },
  info: { bg: "rgba(106,89,206,0.18)", fg: "#B4A9F5" },
};

interface Layout {
  audience: "customer" | "team";
  /** Inbox preview line, hidden in the body. */
  preheader: string;
  pills?: { label: string; tone: AlertTone }[];
  title: string;
  greeting?: string;
  paragraphs: string[];
  quote?: { label: string; text: string };
  details?: { label: string; value: string }[];
  note?: { label: string; text: string };
  cta?: { label: string; href: string };
  ref: string;
}

function pillsHtml(pills: Layout["pills"] = []): string {
  if (!pills.length) return "";
  const spans = pills
    .map(
      ({ label, tone }) =>
        `<span style="display:inline-block;margin:0 6px 0 0;padding:4px 10px;border-radius:999px;background:${PILL[tone].bg};color:${PILL[tone].fg};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(label)}</span>`,
    )
    .join("");
  return `<p style="margin:0 0 14px;">${spans}</p>`;
}

function detailsHtml(details: Layout["details"] = []): string {
  const rows = details.filter((d) => d.label && d.value);
  if (!rows.length) return "";
  const body = rows
    .map(
      (row, i) =>
        `<tr><td valign="top" style="padding:12px 12px 12px 0;width:120px;color:#8E8E93;font-size:13px;line-height:1.45;${i ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}">${escapeHtml(row.label)}</td><td valign="top" style="padding:12px 0;color:#FFFFFF;font-size:14px;font-weight:600;line-height:1.45;${WRAP}${i ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;padding:4px 18px;background:#0F0F12;border:1px solid rgba(255,255,255,0.08);border-radius:12px;border-collapse:separate;">${body}</table>`;
}

function render(layout: Layout): string {
  const paragraphs = layout.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:#D1D1D6;font-size:15px;line-height:1.6;${WRAP}">${escapeHtml(p)}</p>`,
    )
    .join("");
  const greeting = layout.greeting
    ? `<p style="margin:0 0 12px;color:#D1D1D6;font-size:15px;line-height:1.6;">${escapeHtml(layout.greeting)}</p>`
    : "";
  const quote = layout.quote
    ? `<p style="${LABEL}">${escapeHtml(layout.quote.label)}</p><div style="margin:0 0 24px;padding:14px 16px;border-left:3px solid #6A59CE;background:#1A1A1F;border-radius:8px;color:#FFFFFF;font-size:15px;line-height:1.6;white-space:pre-wrap;${WRAP}">${escapeHtml(layout.quote.text)}</div>`
    : "";
  const note = layout.note
    ? `<p style="${LABEL}">${escapeHtml(layout.note.label)}</p><p style="margin:0 0 24px;color:#D1D1D6;font-size:14px;line-height:1.6;${WRAP}">${escapeHtml(layout.note.text)}</p>`
    : "";
  const button = layout.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;"><tr><td style="border-radius:10px;background:#6A59CE;"><a href="${escapeHtml(layout.cta.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${escapeHtml(layout.cta.label)}</a></td></tr></table>`
    : "";
  const footer =
    layout.audience === "team"
      ? `Reference ${escapeHtml(layout.ref)}. You're getting this because you're a Jumpa support admin.`
      : `Reference ${escapeHtml(layout.ref)}. Jumpa will never ask for your recovery phrase or PIN.`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(layout.title)}</title></head>
<body style="margin:0;padding:0;background:#08080A;font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#08080A;">${escapeHtml(layout.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080A;"><tr><td style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#121215;border:1px solid rgba(255,255,255,0.08);border-radius:16px;"><tr><td style="padding:32px 28px;">
      <a href="${SITE}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;"><img src="${LOGO_URL}" width="42" height="20" alt="" style="display:inline-block;vertical-align:middle;width:42px;height:20px;border:0;"><span style="display:inline-block;vertical-align:middle;margin-left:8px;color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-0.3px;">Jumpa</span></a>
      <div style="height:1px;margin:20px 0 24px;background:rgba(255,255,255,0.06);"></div>
      ${pillsHtml(layout.pills)}
      <h1 style="margin:0 0 14px;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.2px;${WRAP}">${escapeHtml(layout.title)}</h1>
      ${greeting}${paragraphs}${quote}${detailsHtml(layout.details)}${note}${button}
      <div style="height:1px;margin:24px 0 16px;background:rgba(255,255,255,0.06);"></div>
      <p style="margin:0;color:#636366;font-size:12px;line-height:1.5;">${footer}</p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
}

async function send(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  const sendbyte = getSendByteClient();
  if (!sendbyte || to.length === 0) return;
  try {
    await sendbyte.emails.send({
      from: DEFAULT_SENDBYTE_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    const detail =
      err instanceof SendByteError ? `[${err.code}] ${err.message}` : err;
    console.error("[support-emails] Send failed:", detail);
  }
}

interface TicketMail {
  to: string;
  firstName: string | null;
  ticketId: string;
  ref: string;
  subject: string;
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export function sendDelayEmail(mail: TicketMail): Promise<void> {
  return send(
    mail.to,
    `An update on your request: ${mail.subject}`,
    render({
      audience: "customer",
      preheader: "It's now a priority for the team. Here's where it stands.",
      title: "This is taking longer than we said",
      greeting: mail.firstName ? `Hi ${mail.firstName},` : "Hi,",
      paragraphs: [
        "We're sorry. Your request is taking longer than we promised.",
        "It's now a priority for the team, and we'll update you in the app as soon as we have news. You don't need to do anything.",
      ],
      details: [
        { label: "Your request", value: mail.subject },
        { label: "Reference", value: mail.ref },
      ],
      cta: { label: "View conversation", href: ticketAppUrl(mail.ticketId) },
      ref: mail.ref,
    }),
  );
}

/** The dashboard's admins, parsed the way the dashboard parses them. */
function teamRecipients(): string[] {
  const admins = environment.ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return admins.length > 0 ? admins : [SUPPORT_EMAIL];
}

/** Team-facing: the same alert the chat gets, as one email to every admin unless `to` narrows it. */
export function sendTeamAlertEmail(
  alert: SupportAlert,
  to: string[] = teamRecipients(),
): Promise<void> {
  const about = alert.quote ? ` — "${clip(alert.quote.text, 60)}"` : "";
  return send(
    to,
    `[Support]${alert.high ? " High priority ·" : ""} ${alert.event} ${alert.ref}${about}`,
    render({
      audience: "team",
      preheader: `${alert.headline}. ${alert.lead}`,
      pills: [
        { label: alert.event, tone: alert.tone },
        ...(alert.high
          ? [{ label: "High priority", tone: "urgent" as const }]
          : []),
      ],
      title: alert.headline,
      paragraphs: [alert.lead],
      quote: alert.quote,
      details: [{ label: "Reference", value: alert.ref }, ...alert.fields],
      note: alert.summary
        ? { label: "What the assistant gathered", text: alert.summary }
        : undefined,
      cta: alert.link
        ? { label: "Open in dashboard", href: alert.link }
        : undefined,
      ref: alert.ref,
    }),
  );
}
