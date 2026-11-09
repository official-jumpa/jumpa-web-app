import { ORDER_ID_PATTERN } from "./constants";

export const MINI_APP_PATH = "/nimiq";

export type FlowName =
  | "cash-out"
  | "top-up"
  | "airtime"
  | "data"
  | "send"
  | "send-tag"
  | "receive";

export type TabName = "home" | "history" | "me";

export type MiniAppView =
  | { name: TabName }
  | { name: FlowName }
  | { name: "chat" }
  /** `fromHistory`: Back returns to the history list rather than home. */
  | { name: "order"; orderId: string; fromHistory: boolean };

/** Where each tab lives; the tab bar matches the current view against these. */
export const MINI_APP_TAB_HREF: Record<TabName, string> = {
  home: MINI_APP_PATH,
  history: `${MINI_APP_PATH}?view=history`,
  me: `${MINI_APP_PATH}?view=me`,
};

/** The chat sits above the tabs, like a flow. */
export const MINI_APP_CHAT_HREF = `${MINI_APP_PATH}?view=chat`;

const NAMED_VIEWS = [
  "chat",
  "cash-out",
  "top-up",
  "airtime",
  "data",
  "send",
  "send-tag",
  "receive",
  "history",
  "me",
] as const;

/** The screen a query string asks for; anything unknown is home. */
export function readView(params: URLSearchParams): MiniAppView {
  const orderId = params.get("order");
  if (orderId && ORDER_ID_PATTERN.test(orderId)) {
    return {
      name: "order",
      orderId,
      fromHistory: params.get("from") === "history",
    };
  }
  const view = params.get("view");
  const named = NAMED_VIEWS.find((name) => name === view);
  return { name: named ?? "home" };
}

/** The tab a view sits under, or null for flows and orders, which hide the tab bar. */
export function tabHrefOf(view: MiniAppView): string | null {
  return view.name in MINI_APP_TAB_HREF
    ? MINI_APP_TAB_HREF[view.name as TabName]
    : null;
}
