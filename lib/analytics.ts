/**
 * One way to send a product event. GA is only loaded when `NEXT_PUBLIC_GA_ID`
 * is set (see `app/layout.tsx`), so every call is a silent no-op without it.
 */

type Gtag = (command: "event", name: string, params?: EventParams) => void;
type EventParams = Record<string, string | number | boolean>;

export function track(name: string, params?: EventParams) {
  if (typeof window === "undefined") return;
  const gtag = (window as Window & { gtag?: Gtag }).gtag;
  gtag?.("event", name, params);
}
