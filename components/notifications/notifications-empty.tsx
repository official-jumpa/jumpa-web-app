import Image from "next/image";

/** A tab with nothing in it yet — the design's crossed-out bell, centred. */
export function NotificationsEmpty() {
  return (
    // The frame centres the bell in the 852 artboard, which is above the centre
    // of the space left under the chips.
    <div className="flex flex-1 flex-col leading-4.5 text-center items-center justify-center pb-38">
      <Image
        src="/images/notifications/no-notifications.svg"
        alt="No notifications"
        width={181}
        height={202}
        className="w-[181px]"
      />

      <h2 className="text-jumpa-black font-medium text-base pt-8">No notifications yet</h2>

      <p className="text-jumpa-grey-300 pt-2 text-sm font-medium leading-3.5">You’re all caught up. We’ll let you know when <br /> there’s something worth your attention.</p>
    </div>
  );
}
