import type { Metadata } from "next";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";

export const metadata: Metadata = {
  title: "Welcome to Jumpa",
};

export default function OnboardingPage() {
  return <OnboardingCarousel />;
}
