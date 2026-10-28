import Image from "next/image";
import type { JumpaRecipient } from "@/lib/jumpa-send";

/** The recipient's photo, or their initial on a brand disc when they have none. */
export function RecipientAvatar({ recipient }: { recipient: JumpaRecipient }) {
  if (recipient.image) {
    return (
      <Image
        src={recipient.image}
        alt=""
        width={92}
        height={92}
        className="size-11.5 shrink-0 rounded-pill bg-jumpa-primary-50 object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-600 text-xl leading-6.5 font-semibold text-jumpa-alt-400 uppercase"
    >
      {recipient.name.trim().charAt(0) || "J"}
    </span>
  );
}
