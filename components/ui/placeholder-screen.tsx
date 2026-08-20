import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";

/**
 * Shell for the screens that stand in for something not yet built — unbuilt
 * routes and the 404. Deliberately plain: nothing here comes from the design.
 */
export function PlaceholderScreen({
  back,
  art,
  eyebrow,
  title,
  body,
  action,
}: {
  back?: string;
  art: ReactNode;
  eyebrow?: string;
  title: string;
  body: string;
  action: { label: string; href: string };
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      {back ? <ScreenHeader back={back} /> : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {art}

        {eyebrow ? (
          <span className="rounded-pill bg-jumpa-alt-400 px-3 py-1.5 text-xs leading-3.5 font-medium text-jumpa-alt-950">
            {eyebrow}
          </span>
        ) : null}

        <div className="flex max-w-70 flex-col gap-2">
          <h1 className="text-2xl leading-7 font-bold text-jumpa-black">
            {title}
          </h1>
          <p className="text-sm leading-5 text-jumpa-neutral-500">{body}</p>
        </div>
      </div>

      <Button variant="gradientSheet" size="lg" href={action.href}>
        {action.label}
      </Button>
    </div>
  );
}
