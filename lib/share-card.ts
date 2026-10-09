/**
 * The savings share card: one 1080x1350 PNG per moment, drawn on a canvas so
 * it carries the app's own tokens and type. Browser-only. Amounts are drawn
 * only when the person opts in — the default card never shows a balance.
 */

import {
  cssToken,
  fontStack,
  loadImage,
  roundedRect,
  wrapToWidth,
} from "@/lib/canvas";
import { GLYPHS, type GlyphName } from "@/lib/moment-glyphs";
import { MILESTONES, type MomentCard } from "@/lib/savings-moments";

const WIDTH = 1080;
/** 4:5 — the tallest a feed shows uncropped, and Stories pad it cleanly. */
const HEIGHT = 1350;
const PAD = 80;
const CENTRE = WIDTH / 2;
const ART_Y = 560;

const WORDMARK_SRC = "/logo/wordmark/white.png";
const WORDMARK_W = 192;
const WORDMARK_H = WORDMARK_W / (384 / 80);

const SITE_LABEL = "usejumpa.com";

type Palette = {
  deep: string;
  brand: string;
  light: string;
  lime: string;
  ink: string;
  white: string;
};

function palette(): Palette {
  return {
    deep: cssToken("primary-700", "#8301ff"),
    brand: cssToken("primary-600", "#8f12ff"),
    light: cssToken("primary-500", "#963aff"),
    lime: cssToken("alt-400", "#d5ff19"),
    ink: cssToken("primary-950", "#370078"),
    white: cssToken("white", "#ffffff"),
  };
}

/** `#rrggbb` at an alpha; tokens are hex, and canvas has no colour-mix. */
function alpha(hex: string, value: number): string {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? [...raw].map((ch) => ch + ch).join("") : raw;
  const channel = (at: number) => Number.parseInt(full.slice(at, at + 2), 16);
  return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${value})`;
}

function glyph(
  ctx: CanvasRenderingContext2D,
  name: GlyphName,
  x: number,
  y: number,
  size: number,
  colour: string,
) {
  const { stroke, fill } = GLYPHS[name];
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  if (fill) {
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.14;
    ctx.fill(new Path2D(fill));
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(stroke));
  ctx.restore();
}

function disc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colour: string,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colour;
  ctx.fill();
}

function backdrop(ctx: CanvasRenderingContext2D, colours: Palette) {
  const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  wash.addColorStop(0, colours.deep);
  wash.addColorStop(0.55, colours.brand);
  wash.addColorStop(1, colours.light);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(940, 140, 0, 940, 140, 560);
  glow.addColorStop(0, alpha(colours.lime, 0.3));
  glow.addColorStop(1, alpha(colours.lime, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A faint grid that fades out from behind the art.
  const fade = ctx.createRadialGradient(CENTRE, ART_Y, 0, CENTRE, ART_Y, 720);
  fade.addColorStop(0, alpha(colours.white, 0.09));
  fade.addColorStop(1, alpha(colours.white, 0));
  ctx.strokeStyle = fade;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= WIDTH; x += 60) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let y = 0; y <= HEIGHT; y += 60) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();
}

function header(
  ctx: CanvasRenderingContext2D,
  colours: Palette,
  family: string,
  eyebrow: string,
  wordmark: HTMLImageElement | null,
) {
  if (wordmark) {
    ctx.drawImage(wordmark, PAD, PAD, WORDMARK_W, WORDMARK_H);
  } else {
    ctx.font = `700 44px ${family}`;
    ctx.fillStyle = colours.white;
    ctx.textBaseline = "top";
    ctx.fillText("Jumpa", PAD, PAD);
  }

  const label = eyebrow.toUpperCase();
  ctx.font = `600 24px ${family}`;
  const width = ctx.measureText(label).width + 48;
  const x = WIDTH - PAD - width;
  ctx.fillStyle = alpha(colours.white, 0.14);
  roundedRect(ctx, x, PAD - 4, width, 48, 24);
  ctx.fill();
  ctx.fillStyle = colours.lime;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, PAD + 20);
  ctx.textAlign = "left";
}

function ring(
  ctx: CanvasRenderingContext2D,
  colours: Palette,
  family: string,
  art: Extract<MomentCard["art"], { type: "ring" }>,
  complete: boolean,
) {
  const radius = 230;
  const start = -Math.PI / 2;
  const angle = (percent: number) => start + (percent / 100) * Math.PI * 2;

  const halo = ctx.createRadialGradient(CENTRE, ART_Y, 160, CENTRE, ART_Y, 330);
  halo.addColorStop(0, alpha(colours.lime, 0.16));
  halo.addColorStop(1, alpha(colours.lime, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(CENTRE - 330, ART_Y - 330, 660, 660);

  ctx.lineCap = "round";
  ctx.lineWidth = 34;
  ctx.strokeStyle = alpha(colours.white, 0.14);
  ctx.beginPath();
  ctx.arc(CENTRE, ART_Y, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (art.progress > 0) {
    ctx.strokeStyle = colours.lime;
    ctx.beginPath();
    ctx.arc(CENTRE, ART_Y, radius, start, angle(Math.max(art.progress, 1)));
    ctx.stroke();
  }

  // The four milestones sit on the ring; the ones passed are dark on lime.
  for (const mark of MILESTONES) {
    if (mark === 100 && art.progress >= 100) continue;
    const at = angle(mark);
    const x = CENTRE + Math.cos(at) * radius;
    const y = ART_Y + Math.sin(at) * radius;
    disc(
      ctx,
      x,
      y,
      8,
      art.progress >= mark ? colours.ink : alpha(colours.white, 0.45),
    );
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = colours.white;
  if (complete) {
    glyph(ctx, "trophy", CENTRE, ART_Y - 34, 132, colours.lime);
    ctx.font = `700 56px ${family}`;
    ctx.fillText("100%", CENTRE, ART_Y + 100);
  } else {
    ctx.font = `700 132px ${family}`;
    ctx.fillText(`${art.progress}%`, CENTRE, ART_Y + 36);
    ctx.font = `500 34px ${family}`;
    ctx.fillStyle = alpha(colours.white, 0.72);
    ctx.fillText(art.unit, CENTRE, ART_Y + 92);
  }
  ctx.textAlign = "left";
}

function badge(
  ctx: CanvasRenderingContext2D,
  colours: Palette,
  name: GlyphName,
) {
  const halo = ctx.createRadialGradient(CENTRE, ART_Y, 140, CENTRE, ART_Y, 320);
  halo.addColorStop(0, alpha(colours.lime, 0.28));
  halo.addColorStop(1, alpha(colours.lime, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(CENTRE - 320, ART_Y - 320, 640, 640);

  ctx.strokeStyle = alpha(colours.white, 0.3);
  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let ray = 0; ray < 16; ray++) {
    const at = (ray / 16) * Math.PI * 2;
    ctx.moveTo(CENTRE + Math.cos(at) * 236, ART_Y + Math.sin(at) * 236);
    ctx.lineTo(CENTRE + Math.cos(at) * 262, ART_Y + Math.sin(at) * 262);
  }
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = alpha(colours.white, 0.25);
  ctx.beginPath();
  ctx.arc(CENTRE, ART_Y, 204, 0, Math.PI * 2);
  ctx.stroke();

  disc(ctx, CENTRE, ART_Y, 170, colours.lime);
  glyph(ctx, name, CENTRE, ART_Y, 168, colours.ink);
}

function streak(
  ctx: CanvasRenderingContext2D,
  colours: Palette,
  weeks: boolean[],
) {
  const y = ART_Y - 40;
  const halo = ctx.createRadialGradient(CENTRE, y, 120, CENTRE, y, 290);
  halo.addColorStop(0, alpha(colours.lime, 0.28));
  halo.addColorStop(1, alpha(colours.lime, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(CENTRE - 290, y - 290, 580, 580);

  disc(ctx, CENTRE, y, 150, colours.lime);
  glyph(ctx, "flame", CENTRE, y, 156, colours.ink);

  // Twelve weeks, oldest first; this week carries a ring.
  const step = 64;
  const left = CENTRE - ((weeks.length - 1) * step) / 2;
  const row = ART_Y + 220;
  weeks.forEach((saved, index) => {
    const x = left + index * step;
    disc(ctx, x, row, 15, saved ? colours.lime : alpha(colours.white, 0.18));
    if (index === weeks.length - 1) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = alpha(colours.white, 0.8);
      ctx.beginPath();
      ctx.arc(x, row, 23, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

/** The band the headline, subject and amounts share, between art and footer. */
const COPY_TOP = 846;
const COPY_BOTTOM = 1170;

function copy(
  ctx: CanvasRenderingContext2D,
  colours: Palette,
  family: string,
  card: MomentCard,
  showAmounts: boolean,
) {
  const max = WIDTH - PAD * 2;
  const pill = showAmounts && card.amounts ? card.amounts : null;
  const rest = 20 + 48 + (pill ? 28 + 64 : 0);
  const measure = (text: string) => ctx.measureText(text).width;

  // Largest headline that fits two lines inside the band.
  let size = 92;
  let lines: string[] = [];
  for (; size >= 56; size -= 4) {
    ctx.font = `700 ${size}px ${family}`;
    lines = wrapToWidth(card.headline, max, measure);
    if (
      lines.length <= 2 &&
      lines.length * size * 1.08 + rest <= COPY_BOTTOM - COPY_TOP
    ) {
      break;
    }
  }

  const height = lines.length * size * 1.08 + rest;
  let y = COPY_TOP + (COPY_BOTTOM - COPY_TOP - height) / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = colours.white;
  for (const line of lines) {
    ctx.fillText(line, CENTRE, y);
    y += size * 1.08;
  }

  y += 20;
  ctx.font = `500 40px ${family}`;
  ctx.fillStyle = alpha(colours.white, 0.72);
  ctx.fillText(wrapToWidth(card.subject, max, measure)[0], CENTRE, y);
  y += 48;

  if (pill) {
    y += 28;
    ctx.font = `600 34px ${family}`;
    const width = measure(pill) + 64;
    ctx.fillStyle = alpha(colours.white, 0.14);
    roundedRect(ctx, CENTRE - width / 2, y, width, 64, 32);
    ctx.fill();
    ctx.fillStyle = colours.white;
    ctx.textBaseline = "middle";
    ctx.fillText(pill, CENTRE, y + 33);
  }
  ctx.textAlign = "left";
}

function footer(
  ctx: CanvasRenderingContext2D,
  colours: Palette,
  family: string,
) {
  ctx.fillStyle = alpha(colours.white, 0.16);
  ctx.fillRect(PAD, 1206, WIDTH - PAD * 2, 2);

  ctx.textBaseline = "alphabetic";
  ctx.font = `500 30px ${family}`;
  ctx.fillStyle = alpha(colours.white, 0.72);
  ctx.fillText("Saving with Jumpa", PAD, 1272);

  ctx.font = `600 30px ${family}`;
  ctx.fillStyle = colours.lime;
  ctx.textAlign = "right";
  ctx.fillText(SITE_LABEL, WIDTH - PAD, 1272);
  ctx.textAlign = "left";
}

/** Draws a moment and hands back a PNG. Rejects if the canvas is refused. */
export async function renderMomentCard(
  card: MomentCard,
  { showAmounts }: { showAmounts: boolean },
): Promise<Blob> {
  const family = fontStack();
  // The face has to be decoded before the first fillText, or the card falls
  // back to the system font for good.
  await Promise.all([
    document.fonts.load(`700 92px ${family}`),
    document.fonts.load(`500 40px ${family}`),
    document.fonts.load(`600 30px ${family}`),
  ]).catch(() => undefined);
  const wordmark = await loadImage(WORDMARK_SRC).catch(() => null);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  const colours = palette();
  backdrop(ctx, colours);
  header(ctx, colours, family, card.eyebrow, wordmark);

  if (card.art.type === "ring")
    ring(ctx, colours, family, card.art, card.complete);
  else if (card.art.type === "streak") streak(ctx, colours, card.art.weeks);
  else badge(ctx, colours, card.art.glyph);

  copy(ctx, colours, family, card, showAmounts);
  footer(ctx, colours, family);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not render the card")),
      // The card is opaque edge to edge, so JPEG loses nothing PNG keeps and
      // is a fraction of the size to send over mobile data.
      "image/jpeg",
      0.92,
    );
  });
}

export function momentFilename(card: MomentCard): string {
  const stem = `${card.headline} ${card.subject}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `jumpa-${stem || "savings"}.jpg`;
}
