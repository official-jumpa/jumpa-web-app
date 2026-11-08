"use client";

import { TabBar } from "@/components/home/tab-bar";
import { MINI_APP_CHAT_HREF } from "@/lib/nimiq/views";
import { MINI_APP_TABS } from "./mini-app-actions";

/** The main app's tab bar over the mini app's tabs, with its chat button opening the mini app's chat. */
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
      chatHref={MINI_APP_CHAT_HREF}
      onNavigate={onNavigate}
    />
  );
}
