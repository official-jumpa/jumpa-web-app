import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Page not found",
  description:
    "That page doesn't exist. Head back to Jumpa to send, swap, save and spend across currencies and chains.",
});

/** Catches every unmatched URL. Sits outside the route groups, so it carries its own column. */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-app bg-jumpa-white">
      <PlaceholderScreen
        art={
          <span className="text-6xl leading-none font-bold text-jumpa-primary-600">
            404
          </span>
        }
        title="We can't find that page"
        body="The link may be out of date, or the page may have moved. Let's get you back."
        action={{ label: "Back to Home", href: "/home" }}
      />
    </div>
  );
}
