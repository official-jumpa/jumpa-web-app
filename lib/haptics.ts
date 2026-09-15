/**
 * Jumpa Haptics & Vibration Utility
 *
 * Provides tactile feedback for mobile browsers via the Web Vibration API (navigator.vibrate).
 * Gracefully no-ops on desktop / Mac browsers while logging in development for debugging.
 * Integrates with user settings (defaults to enabled).
 */

export type HapticFeedbackType =
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error";

const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  selection: 8,
  light: 12,
  medium: 22,
  success: [12, 40, 12],
  warning: [25, 50, 25],
  error: [35, 60, 35],
};

/**
 * Triggers a tactile vibration pulse on supported devices.
 * Safely falls back on desktop and unsupported browsers without throwing.
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

  const pattern = HAPTIC_PATTERNS[type] ?? 12;

  //delete the log later. Just for debugging
  console.log(`[Haptics] ${type} (${Array.isArray(pattern) ? pattern.join("-") : pattern}ms)`);
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  return false;
}
