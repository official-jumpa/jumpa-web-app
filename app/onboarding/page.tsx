import type { Metadata } from "next";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";

export const metadata: Metadata = {
  title: "Welcome to Jumpa",
  description: "Get started with Jumpa — the wallet that lets you move money the way you chat. Create an account or import an existing wallet.",
};

export default function OnboardingPage() {
  return <OnboardingCarousel />;
}
