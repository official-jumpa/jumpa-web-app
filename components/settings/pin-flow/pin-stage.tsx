import type { ReactNode } from "react";
import { AuthHeading } from "@/components/auth/auth-screen";
import { SettingsHeader } from "@/components/settings/settings-header";

/**
 * Shell every step of a PIN flow sits in. The steps change in local state at
 * one URL, so the header steps back through them rather than through history.
 * `footer` holds the viewport bottom until the body outgrows it.
 */
export function PinStage({
  title,
  heading,
  description,
  onBack,
  footer,
  children,
}: {
  title: string;
  heading: string;
  description: string;
  onBack: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(24px+env(safe-area-inset-bottom))]">
      <SettingsHeader title={title} onBack={onBack} />

      <main className="flex flex-1 flex-col pt-6">
        <AuthHeading title={heading}>{description}</AuthHeading>
        {children}
      </main>

      {footer}
    </div>
  );
}
