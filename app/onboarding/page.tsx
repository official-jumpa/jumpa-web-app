import type { Metadata } from "next";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Welcome to Jumpa",
  description:
    "Get started with Jumpa, the wallet that lets you move money the way you chat. Create an account or import an existing wallet.",
  path: "/onboarding",
});

export default function OnboardingPage() {
  return <OnboardingCarousel />;
}
