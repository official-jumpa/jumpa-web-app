export type NotificationTab = "transactions" | "activities";

export type Notification = {
  id: string;
  tab: NotificationTab;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

/** The two chips above the feed, in the design's order. */
export const NOTIFICATION_TABS: { id: NotificationTab; label: string }[] = [
  { id: "transactions", label: "Transactions" },
  { id: "activities", label: "Activities" },
];

/** Placeholder feed; the notifications service replaces it. */
export const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    tab: "transactions",
    title: "New Payment Received",
    body: "1.43 USDC received on 24th Aug, 1:30pm, from rfvf383fbur3",
    time: "Today 12:32AM",
    read: true,
  },
  {
    id: "n2",
    tab: "transactions",
    title: "New Payment Received",
    body: "1.43 USDC received on 24th Aug, 1:30pm, from rfvf383fbur3",
    time: "Today 12:32AM",
    read: false,
  },
  {
    id: "n3",
    tab: "transactions",
    title: "New Payment Received",
    body: "1.43 USDC received on 24th Aug, 1:30pm, from rfvf383fbur3",
    time: "Today 12:32AM",
    read: false,
  },
  {
    id: "n4",
    tab: "transactions",
    title: "New Payment Received",
    body: "1.43 USDC received on 24th Aug, 1:30pm, from rfvf383fbur3",
    time: "Today 12:32AM",
    read: false,
  },
];
