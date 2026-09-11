"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";
import { hasInAppHistory } from "@/lib/nav-history";

// Steps back through history when there is somewhere in-app behind it.
// `/sign-up/pin` is reached from three flows, so one href can't serve them all.
export function AuthBack({ href }: { href: string }) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (!hasInAppHistory()) return;
        event.preventDefault();
        router.back();
      }}
      className="flex items-center gap-2 text-jumpa-primary-950"
    >
      <ArrowBackIcon className="size-6" />
      <span className="text-base leading-4.5 font-medium">Back</span>
    </Link>
  );
}
