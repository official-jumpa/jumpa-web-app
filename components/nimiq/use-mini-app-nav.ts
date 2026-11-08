"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { type FlowName, MINI_APP_PATH, readView } from "@/lib/nimiq/views";

export {
  type FlowName,
  MINI_APP_PATH,
  type MiniAppView,
} from "@/lib/nimiq/views";

/** Screens this page pushed above home, so Back steps back rather than stacking home. */
let pushedViews = 0;

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

  const back = () => {
    if (pushedViews > 0) {
      pushedViews -= 1;
      router.back();
    } else {
      router.replace(MINI_APP_PATH);
    }
  };

  return {
    view,

    open(name: FlowName | "history") {
      push(`${MINI_APP_PATH}?view=${name}`);
    },

    /** Pushes a mini-app href, for shared tiles and pills that hand their route to the host. */
    go(href: string) {
      if (href.startsWith(`${MINI_APP_PATH}?`)) push(href);
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
    back,

    /** Tabs sit one step above home: home pushes, tab to tab swaps, and Home steps back. */
    tab(href: string) {
      if (href === MINI_APP_PATH) back();
      else if (view.name === "home") push(href);
      else router.replace(href);
    },
  };
}
