import { redirect } from "next/navigation";
import { AuthRedirect } from "@/components/landing/auth-redirect";
import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { inter, jakarta } from "@/components/landing/fonts";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { InstallPrompt } from "@/components/landing/install-prompt";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { RevealObserver } from "@/components/landing/reveal-observer";
import { SecuritySection } from "@/components/landing/security-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { siteGraph } from "@/lib/structured-data";

/**
 * Public marketing home. A signed-in visitor is redirected on by `AuthRedirect`.
 *
 * Every section measures in design px of the 402 phone frame, and of the 1440
 * desktop frame from `md:` up (see `frame-*` in `app/globals.css`). 768–1023 is
 * the desktop frame scaled down; there is no tablet frame in the design.
 *
 * Big screens: section backgrounds run full-bleed, but the content board stops
 * growing at 1440 and centres. Past that the type would outgrow reading
 * distance on a monitor, so only the backgrounds, marquees and grids widen.
 *
 * Motion: nav and hero animate at first paint; everything below carries a
 * `.reveal*` marker that `RevealObserver` plays on scroll, and decorative
 * layers carry the scroll-linked `.drift`. None of it moves a property that
 * reflows, so the geometry at rest is the design's.
 */
export default async function LandingPage() {
  const session = await getCachedAuthSession();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <>
      {/* Tells Google "Jumpa" is a brand, not just the Malay word. */}
      <JsonLd data={siteGraph()} />
      {/* Outside the frame: app chrome measures in the app's own spacing. */}
      <InstallPrompt />
      <main
        className={`${jakarta.variable} ${inter.variable} frame-402/550 md:frame-1440/1440 isolate overflow-clip bg-jumpa-white font-jakarta text-jumpa-ink`}
      >
        <AuthRedirect />
        <RevealObserver />
        <LandingNav />
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <SecuritySection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
        <LandingFooter />
      </main>
    </>
  );
}
