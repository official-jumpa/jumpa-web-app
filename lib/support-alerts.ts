/**
 * Posts support alerts to the team's chat. Slack and Discord incoming webhooks
 * take different bodies; the URL tells us which. Never throws — an alert that
 * fails must not fail the user's request.
 */
import { environment } from "@/lib/environment";

const TIMEOUT_MS = 5_000;

/** The dashboard page for a ticket, when the dashboard URL is configured. */
export function ticketDashboardUrl(ticketId: string): string | null {
  const base = environment.SUPPORT_DASHBOARD_URL.trim().replace(/\/+$/, "");
  return base ? `${base}/${ticketId}` : null;
}

/** new: someone should claim it. warn: it's late. urgent: a promise was missed. */
export type AlertTone = "new" | "warn" | "urgent" | "info";

/**
 * One alert, read the same way in the team chat and the team email, so the two
 * can never tell an agent different things.
 */
export interface SupportAlert {
  ref: string;
  /** The customer's first name, when we have one. */
  customer: string | null;
  /** Where the ticket stands, in the team's words: "Live with Tolu". */
  state: string;
  tone: AlertTone;
  high: boolean;
  emoji: string;
  /** Short event name: "New ticket". */
  event: string;
  /** What happened, as a sentence about the customer: "Ada needs a person". */
  headline: string;
  /** What the team should do about it. */
  lead: string;
  /** The customer's own words, quoted as-is. */
  quote?: { label: string; text: string };
  fields: { label: string; value: string }[];
  summary?: string;
  link: string | null;
}

/**
 * One marker per ticket, so its messages stand out in a busy channel. No red:
 * that reads as urgent. Discord colours its embed bar to match.
 */
const MARKERS = [
  { emoji: "🟦", color: 0x55acee },
  { emoji: "🟩", color: 0x78b159 },
  { emoji: "🟨", color: 0xfdcb58 },
  { emoji: "🟧", color: 0xf4900c },
  { emoji: "🟪", color: 0xaa8ed6 },
  { emoji: "🟫", color: 0xc1694f },
  { emoji: "⬛", color: 0x31373d },
] as const;

/** The dashboard's copy uses the same hash, so a ticket keeps its marker in both apps. */
function markerFor(ref: string) {
  let hash = 5381;
  for (const char of ref) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return MARKERS[hash % MARKERS.length];
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** Without this, a customer typing `<!channel>` would ping everyone. */
const slackText = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Customer text stays literal: no bold, no disguised links. */
const discordText = (text: string) =>
  text.replace(/([\\*_~`|[\]>#-])/g, "\\$1");

const quoteLines = (text: string) =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

/** Which ticket: the first thing every alert says. */
const identity = (alert: SupportAlert) =>
  `${markerFor(alert.ref).emoji} ${alert.ref} · ${alert.customer ?? "Customer"}`;

/** What happened, and where the ticket stands now. */
const context = (alert: SupportAlert) =>
  `${alert.emoji} ${alert.event} · ${alert.state}${alert.high ? " · 🔴 High priority" : ""}`;

/** What a notification banner shows before the message is opened. */
const preview = (alert: SupportAlert) =>
  clip(
    `${identity(alert)} — ${alert.emoji} ${alert.event}: ${alert.quote ? `"${alert.quote.text}"` : alert.headline}`,
    280,
  );

function slackBody(alert: SupportAlert) {
  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: clip(identity(alert), 150),
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: clip(`*${slackText(context(alert))}*`, 3000) },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: clip(
          `*${slackText(alert.headline)}.* ${slackText(alert.lead)}`,
          3000,
        ),
      },
    },
  ];
  if (alert.quote) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: clip(
          `*${slackText(alert.quote.label)}*\n${quoteLines(slackText(alert.quote.text))}`,
          3000,
        ),
      },
    });
  }
  if (alert.fields.length) {
    blocks.push({
      type: "section",
      fields: alert.fields.slice(0, 10).map((field) => ({
        type: "mrkdwn",
        text: clip(
          `*${slackText(field.label)}*\n${slackText(field.value)}`,
          2000,
        ),
      })),
    });
  }
  if (alert.summary) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: clip(
          `*What the assistant gathered*\n${slackText(alert.summary)}`,
          3000,
        ),
      },
    });
  }
  if (alert.link) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${alert.link}|Open ${alert.ref} in the dashboard →>`,
      },
    });
  }
  // The fallback is parsed too: escape it, or `<!channel>` pings from the banner.
  return { text: slackText(preview(alert)), blocks };
}

function discordBody(alert: SupportAlert) {
  const description = [
    `**${discordText(alert.headline)}.** ${discordText(alert.lead)}`,
    alert.quote
      ? `**${discordText(alert.quote.label)}**\n${quoteLines(discordText(alert.quote.text))}`
      : "",
    alert.link ? `[Open ${alert.ref} in the dashboard →](${alert.link})` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const fields = [
    ...alert.fields.map((field) => ({
      name: clip(field.label, 256),
      value: clip(discordText(field.value), 1024),
      inline: true,
    })),
    ...(alert.summary
      ? [
          {
            name: "What the assistant gathered",
            value: clip(discordText(alert.summary), 1024),
            inline: false,
          },
        ]
      : []),
  ];

  return {
    // Embeds never ping, and this stops a stray @everyone in the fallback too.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        author: { name: clip(context(alert), 256) },
        title: clip(identity(alert), 256),
        ...(alert.link ? { url: alert.link } : {}),
        color: markerFor(alert.ref).color,
        description: clip(description, 4096),
        fields: fields.slice(0, 25),
      },
    ],
  };
}

export async function pingSupportChannel(alert: SupportAlert): Promise<void> {
  const url = environment.SUPPORT_WEBHOOK_URL.trim();
  if (!url) return;
  const isDiscord = /discord(app)?\.com\/api\/webhooks/i.test(url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isDiscord ? discordBody(alert) : slackBody(alert)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) console.warn("[support-alerts] Webhook returned", res.status);
  } catch (err) {
    console.warn("[support-alerts] Webhook failed:", (err as Error).message);
  }
}
