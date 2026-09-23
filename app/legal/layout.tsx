import { AppColumn } from "@/components/ui/app-column";

/**
 * The legal pages are public — they are linked from the marketing footer and
 * have to open for a signed-out visitor — so they sit outside `(app)` and carry
 * their own column instead of inheriting the signed-in one.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <AppColumn>{children}</AppColumn>;
}
