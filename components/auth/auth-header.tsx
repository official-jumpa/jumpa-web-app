import Image from "next/image";
import Link from "next/link";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";

/** Back link and wordmark. */
export function AuthHeader({ backHref }: { backHref: string }) {
  return (
    <header className="flex items-center justify-between">
      <Link
        href={backHref}
        className="flex items-center gap-2 text-jumpa-primary-950"
      >
        <ArrowBackIcon className="size-6" />
        <span className="text-base leading-4.5 font-medium">Back</span>
      </Link>
      {/* Alpha-trimmed — the raw logo is half transparent padding. */}
      <Image
        src="/logo/wordmark/purple.png"
        alt="Jumpa"
        width={96}
        height={20}
        priority
        className="h-5 w-24"
      />
    </header>
  );
}

/** Circular back button with a centred title. */
export function AuthTitleBar({
  backHref,
  title,
}: {
  backHref: string;
  title: string;
}) {
  return (
    <header className="flex items-center">
      <Link
        href={backHref}
        aria-label="Back"
        className="rounded-pill bg-jumpa-neutral-50 p-2.5 text-jumpa-primary-950"
      >
        <ArrowBackIcon className="size-6" />
      </Link>
      {/* A bar label, not the page title. */}
      <p className="flex-1 text-center text-base leading-4.5 font-medium text-jumpa-black">
        {title}
      </p>
      {/* Balances the back button. */}
      <div className="size-11" aria-hidden />
    </header>
  );
}
