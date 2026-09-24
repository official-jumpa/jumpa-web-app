import type { ReactNode } from "react";

/**
 * The legal pages are public — they are linked from the marketing footer and
 * have to open for a signed-out visitor — so they sit outside `(app)` and carry
 * their own shell instead of inheriting the signed-in column.
 *
 * Full width like the landing page, not the app's 500px column: a document read
 * on a laptop should not sit in a phone-width strip inside a black frame. The
 * page is white edge to edge and only the text measure is capped.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh w-full bg-jumpa-white">{children}</div>;
}
