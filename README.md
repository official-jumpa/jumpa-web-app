# Jumpa

Mobile-first web app for moving money conversationally — send, swap, save and spend
across currencies and chains. Self-custodial wallet.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Command          | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Dev server                                     |
| `npm run build`  | Production build — **must pass before a PR**   |
| `npm run lint`   | Biome check (lint + format verification)       |
| `npm run format` | Apply formatting                               |

Stack: Next.js 16 (App Router, React Server Components), TypeScript (strict),
Tailwind CSS v4, Biome. We use Biome rather than ESLint/Prettier — don't add either.

## Project layout

The `@/*` path alias points at the repo root, so imports read `@/components/ui/button`.

```
app/                  routes only — layouts, pages, loading/error boundaries
  globals.css         design tokens (see below)
components/
  ui/                 generic primitives (Button, …)
  onboarding/         feature components, grouped by flow
lib/                  framework-agnostic helpers
public/
  logo/               brand marks; logo/mark/ holds padding-trimmed versions
  images/             screen artwork, exported from the design file
```

Conventions:

- Files and folders `kebab-case`; components `PascalCase`; hooks `useThing`.
- Server Components by default. Add `"use client"` only for state, effects or browser
  APIs, and push it to the smallest leaf that needs it.
- Route files compose and fetch; business logic lives outside `app/`.

## Design tokens — the one styling rule

Every colour, font, radius and shadow is declared once in `app/globals.css` and named to
mirror the design file (`Jumpa Primary /600` → `jumpa-primary-600`).

```css
@theme static {
  --color-jumpa-primary-600: #8f12ff;
}
```

That single line yields `bg-jumpa-primary-600`, `text-jumpa-primary-600` and
`var(--color-jumpa-primary-600)` for raw CSS and gradients.

- **Never hardcode a hex, `rgb()` or px font-size in a component.** Add the token instead.
  A raw colour value in a `.tsx` file is treated as a review failure.
- The block is `@theme static`, not plain `@theme`, on purpose: Tailwind v4 tree-shakes
  unused theme variables, which would silently break `var(--color-…)` references from CSS.
  `static` guarantees the whole palette is always emitted.

Some ramp steps are intentionally absent because they are not yet confirmed from the
design file. **Do not invent intermediate values** — pull the real ones and add them.

### Typography

**Host Grotesk** carries all UI copy. It is loaded once in `app/layout.tsx` via
`next/font/google` as a variable face (300–800), so every weight comes from one file —
use `font-medium`, `font-semibold` and so on rather than adding another import.

Four aliases point at it in `@theme`:

| Token            | Utility          | Used for                                    |
| ---------------- | ---------------- | ------------------------------------------- |
| `--font-sans`    | `font-sans`      | Default; set on `body`                       |
| `--font-display` | `font-display`   | Oversized amounts — the design asks for Gotham Ultra |
| `--font-numeric` | `font-numeric`   | PIN digits and keypads — the design asks for Neue Montreal |
| `--font-mono`    | `font-mono`      | Code blocks in chat markdown (Geist Mono)   |

`display` and `numeric` are **placeholders**: Gotham Ultra and Neue Montreal are licensed
faces we do not have. Repoint those two tokens if they are ever purchased; nothing else
needs to change.

## Mobile-first

The design baseline is a **393 × 852** frame, and layouts are centred with a `430px`
max-width on larger screens. Write unprefixed styles for mobile and add `sm:`/`md:`
upward; never introduce a desktop-first `max-*` breakpoint.

Artwork transcribed from the design is positioned inside `DesignLayer`, which pins a
393px coordinate space to the centre of the viewport so exact offsets survive on wider
screens. Device chrome from the mockups (status bar, home indicator, rounded corners) is
deliberately **not** rendered — real devices draw their own.
