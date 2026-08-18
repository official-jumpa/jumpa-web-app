/** Order and count of the carousel. Keep in step with OnboardingCarousel. */
export const ONBOARDING_SLIDES = ["chat", "coins", "hero"] as const;

export type OnboardingSlideId = (typeof ONBOARDING_SLIDES)[number];
