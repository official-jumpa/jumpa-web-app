"use client";

import { TabBar } from "@/components/home/tab-bar";
import { MINI_APP_TABS } from "./mini-app-actions";

/** The main app's tab bar over the mini app's tabs. Chat stays Soon until the mini app has its own. */
export function MiniAppTabBar({
  current,
  onNavigate,
}: {
  current: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <TabBar
      tabs={MINI_APP_TABS}
      current={current}
      chatHref={null}
      onNavigate={onNavigate}
    />
  );
}
