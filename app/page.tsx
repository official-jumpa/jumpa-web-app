import { AuthRedirect } from "@/components/landing/auth-redirect";
import { BetaCtaSection } from "@/components/landing/beta-cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { RevealObserver } from "@/components/landing/reveal-observer";
import { SecuritySection } from "@/components/landing/security-section";
import { WhyJumpaSection } from "@/components/landing/why-jumpa-section";

/**
 * Public marketing home. A signed-in visitor is redirected on by `AuthRedirect`.
 *
 * The page reproduces the two design frames by scaling one unit rather than
 * reflowing: every section below measures in design px of the 393 phone frame,
 * and in px of the 1440 desktop frame from `md:` up. See the `frame-*` note in
 * `app/globals.css` — the root carries no padding or border, by that rule.
 *
 * There is no tablet frame in Figma, so 768–1023 is the desktop frame scaled
 * down rather than a third composition: `md:frame-1440/1440` makes the unit
 * track the viewport, so the page shrinks continuously from 1440 to 768 and
 * only swaps to the phone frame below it.
 *
 * Motion: the nav and hero play their entrance from plain `animate-*` utilities
 * at the first paint, and everything below it carries a `.reveal*` marker that
 * `RevealObserver` plays as it scrolls in. Decorative layers carry `.drift`,
 * which is scroll-linked rather than looping. Nothing in either path moves a
 * property that reflows, so the geometry at rest is the geometry in the design.
 */
export default function LandingPage() {
  return (
    <main className="frame-393/550 md:frame-1440/1440 isolate overflow-x-clip bg-jumpa-white">
      <AuthRedirect />
      <RevealObserver />
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
