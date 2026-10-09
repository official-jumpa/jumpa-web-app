/**
 * Shared by everything the app draws on a canvas (receipts, share cards), so
 * an exported image reads its colours and type off the same tokens the
 * screen uses. Browser-only; each helper falls back when there is no document.
 */

/** A colour token, read off the document: `cssToken("primary-600", "#8f12ff")`. */
export function cssToken(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    `--color-jumpa-${name}`,
  );
  return value.trim() || fallback;
}

/** The body's resolved font stack, so a canvas draws in the app's own face. */
export function fontStack(): string {
  if (typeof document === "undefined") return "sans-serif";
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

const images = new Map<string, Promise<HTMLImageElement>>();

/** Loads a same-origin image once, so it never taints a canvas. A failure is not cached. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src);
  if (cached) return cached;

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      images.delete(src);
      reject(new Error(`Could not load ${src}`));
    };
    image.src = src;
  });
  images.set(src, request);
  return request;
}

/** Traces a rounded rectangle; `ctx.roundRect` is missing on older Safari. */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Breaks a value onto as many lines as it needs. A hash is the proof on a
 * receipt, so it is never cut — a word too long for the line is split.
 */
export function wrapToWidth(
  text: string,
  max: number,
  width: (value: string) => number,
): string[] {
  if (width(text) <= max) return [text];

  const lines: string[] = [];
  let line = "";

  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (width(candidate) <= max) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);

    // A single run with no spaces (a hash) is broken character by character.
    line = "";
    for (const char of word) {
      if (width(line + char) > max && line) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
  }

  if (line) lines.push(line);
  return lines;
}
