import Image from "next/image";
import type { ReactNode } from "react";

/** Full-screen message with art, a title and the actions under it. */
export function NimiqNotice({
  art,
  title,
  body,
  children,
}: {
  art: ReactNode;
  title: string;
  body: ReactNode;
  /** The actions, pinned to the bottom. */
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <Image
        src="/logo/wordmark/purple.png"
        alt="Jumpa"
        width={384}
        height={80}
        priority
        className="mx-auto h-5.25 w-24"
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
        {art}
        <div className="flex max-w-75 flex-col gap-2">
          <h1 className="text-2xl leading-7 font-bold text-jumpa-black">
            {title}
          </h1>
          <div className="text-sm leading-5 text-jumpa-neutral-500">{body}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
