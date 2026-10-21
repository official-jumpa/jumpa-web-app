"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/** Bottom sheet over a scrim. Portalled to body to prevent iOS stacking/viewport clipping. */
export function SuccessSheet({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Dismiss any active mobile keyboard so iOS viewport geometry resets cleanly
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  useScrollLock(true);

  if (!mounted) return null;

  const handleAction = (e?: React.MouseEvent) => {
    if (navigating) return;
    if (onAction) {
      onAction();
      return;
    }
    if (actionHref) {
      e?.preventDefault();
      setNavigating(true);
      router.push(actionHref);
      // Fallback for iOS Standalone PWA if router push hangs or is slow
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== actionHref) {
          window.location.assign(actionHref);
        }
      }, 400);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-jumpa-black/45 touch-manipulation">
      <div className="relative w-full max-w-app animate-sheet-up rounded-t-[32px] rounded-b-none bg-jumpa-white px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl">
        <div className="flex flex-col items-center gap-6">
          <span className="block h-1 w-25 rounded-full bg-jumpa-neutral-75" />

          <div className="flex w-full flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-6">
              <Image
                src="/images/auth/verification_success.svg"
                alt=""
                width={126}
                height={94}
                priority
              />
              <div className="flex flex-col items-center gap-2.5">
                <h2 className="text-center text-2xl leading-6.5 font-medium text-jumpa-black">
                  {title}
                </h2>
                <span className="h-px w-full bg-jumpa-neutral-100" />
                <p className="flex items-center gap-2 text-xs leading-3.5 text-jumpa-black text-center">
                  <span>{description}</span>
                </p>
              </div>
            </div>

            <Button
              href={actionHref}
              onClick={handleAction}
              variant="gradientSheet"
              size="lg"
              className="max-w-[330px] cursor-pointer select-none touch-manipulation active:opacity-90"
            >
              {navigating ? "Continuing..." : actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
