export type Notification = {
  id: string;
  title: string;
  body: string;
  avatar: string;
  read: boolean;
};

/** Placeholder feed; the notifications service replaces it. */
export const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "Jumpa Support",
    body: "Your payment of ₦25,000 was completed successfully",
    avatar: "/images/notifications/avatar-1.webp",
    read: true,
  },
  {
    id: "n2",
    title: "Jumpa Support",
    body: "Your payment of ₦25,000 was completed successfully",
    avatar: "/images/notifications/avatar-2.webp",
    read: true,
  },
  {
    id: "n3",
    title: "Jumpa Support",
    body: "Your payment of ₦25,000 was completed successfully",
    avatar: "/images/notifications/avatar-2.webp",
    read: true,
  },
];
