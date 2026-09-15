import { AuthRedirect } from "@/components/landing/auth-redirect";
import { BetaCtaSection } from "@/components/landing/beta-cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { SecuritySection } from "@/components/landing/security-section";
import { WhyJumpaSection } from "@/components/landing/why-jumpa-section";

/**
 * Public marketing home. A signed-in visitor is redirected on by `AuthRedirect`.
 *
 * The page reproduces the two design frames by scaling one unit rather than
 * reflowing: every section below measures in design px of the 393 phone frame,
 * and in px of the 1440 desktop frame from `lg:` up. See the `frame-*` note in
 * `app/globals.css` — the root carries no padding or border, by that rule.
 */
export default function LandingPage() {
  return (
    <main className="frame-393/550 lg:frame-1440/1440 isolate overflow-x-clip bg-jumpa-white">
      <AuthRedirect />
      <LandingNav />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <WhyJumpaSection />
      <SecuritySection />
      <FaqSection />
      <BetaCtaSection />
      <LandingFooter />
    </main>
  );
}
