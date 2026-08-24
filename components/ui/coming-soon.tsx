import Image from "next/image";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";

/** Stand-in for a route the UI links to but the design has not covered yet. */
export function ComingSoon({ feature }: { feature: string }) {
  return (
    <PlaceholderScreen
      back="/home"
      art={
        <span className="flex size-20 items-center justify-center rounded-panel bg-jumpa-primary-50">
          {/* Alpha-trimmed mark — the raw logo is mostly transparent padding. */}
          <Image
            src="/logo/mark/purple.png"
            alt=""
            width={803}
            height={381}
            className="w-11"
          />
        </span>
      }
      eyebrow="In development"
      title={feature}
      body="This screen is still is development. Everything around it works, check back shortly."
      action={{ label: "Back to Home", href: "/home" }}
    />
  );
}
