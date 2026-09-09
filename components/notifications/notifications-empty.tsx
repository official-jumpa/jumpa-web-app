import Image from "next/image";

/** A tab with nothing in it yet — the design's crossed-out bell, centred. */
export function NotificationsEmpty() {
  return (
    // The frame centres the bell in the 852 artboard, which is above the centre
    // of the space left under the chips.
    <div className="flex flex-1 items-center justify-center pb-38">
      <Image
        src="/images/notifications/no-notifications.svg"
        alt="No notifications"
        width={181}
        height={202}
        className="w-[181px]"
      />
    </div>
  );
}
