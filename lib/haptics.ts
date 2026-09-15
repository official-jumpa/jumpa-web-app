/**
 * Haptics & Vibration Utility
 *
 * Provides tactile feedback for mobile browsers via the Web Vibration API (navigator.vibrate).
 * Gracefully no-ops on desktop / Mac browsers while logging in development for debugging.
 * Integrates with user settings (defaults to enabled).
 */

export type HapticPreset = "selection" | "light" | "medium" | "heavy";
export type HapticFeedbackType = HapticPreset | number;

const HAPTIC_PATTERNS: Record<HapticPreset, number> = {
  selection: 35,
  light: 50,
  medium: 80,
  heavy: 120,
};

/**
 * Triggers a tactile vibration pulse on supported devices.
 * Accepts either a preset name ("selection", "light", "medium", "heavy") or millisecond duration.
 * Defaults to 50ms.
 */
export function triggerHaptic(type: HapticFeedbackType = "light"): boolean {
  if (typeof window === "undefined") return false;

  // Respect user preference if explicitly disabled
  try {
    const pref = localStorage.getItem("jumpa_haptics");
    if (pref === "false") return false;
  } catch {
    // Ignore storage restriction errors in private browsing
  }

  const pattern =
    typeof type === "number" ? type : (HAPTIC_PATTERNS[type] ?? 50);

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  return false;
}
