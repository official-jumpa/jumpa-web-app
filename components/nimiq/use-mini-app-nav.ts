"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ORDER_ID_PATTERN } from "@/lib/nimiq/constants";

export const MINI_APP_PATH = "/nimiq";

export type FlowName = "cash-out" | "top-up";

export type MiniAppView =
  | { name: "home" }
  | { name: "history" }
  | { name: FlowName }
  /** `fromHistory`: Back returns to the history list rather than home. */
  | { name: "order"; orderId: string; fromHistory: boolean };

/** Screens this page pushed above home, so Back steps back rather than stacking home. */
let pushedViews = 0;

function readView(params: URLSearchParams): MiniAppView {
  const orderId = params.get("order");
  if (orderId && ORDER_ID_PATTERN.test(orderId)) {
    return {
      name: "order",
      orderId,
      fromHistory: params.get("from") === "history",
    };
  }
  const view = params.get("view");
  if (view === "cash-out" || view === "top-up" || view === "history") {
    return { name: view };
  }
  return { name: "home" };
}

/** The mini app's screens live in its query string, so reloads and Back land where expected. */
export function useMiniAppNav() {
  const router = useRouter();
  const params = useSearchParams();
  const view = readView(params);

  // Home is the bottom of the stack, however it was reached (a swipe back included).
  useEffect(() => {
    if (view.name === "home") pushedViews = 0;
  }, [view.name]);

  const push = (href: string) => {
    pushedViews += 1;
    router.push(href);
  };

  return {
    view,

    open(name: FlowName | "history") {
      push(`${MINI_APP_PATH}?view=${name}`);
    },

    openOrder(orderId: string, { fromHistory = false } = {}) {
      push(
        `${MINI_APP_PATH}?order=${orderId}${fromHistory ? "&from=history" : ""}`,
      );
    },

    /** Swaps a settled order for a fresh flow, so Back skips the old order. */
    restart(name: FlowName) {
      router.replace(`${MINI_APP_PATH}?view=${name}`);
    },

    /** Swaps a finished form for its order, so Back can't resubmit it. */
    showOrder(orderId: string) {
      router.replace(`${MINI_APP_PATH}?order=${orderId}`);
    },

    /** One screen back: home, or the history list an order was opened from. */
    back() {
      if (pushedViews > 0) {
        pushedViews -= 1;
        router.back();
      } else {
        router.replace(MINI_APP_PATH);
      }
    },
  };
}
