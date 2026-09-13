/**
 * lib/user-agent.ts
 *
 * Lightweight user-agent parsing helper to identify device family, OS, and browser
 * without heavy external dependencies.
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
  deviceType: "mobile" | "desktop" | "tablet";
  deviceLabel: string;
}

export function parseUserAgent(uaString?: string): ParsedUserAgent {
  if (!uaString) {
    return {
      browser: "Unknown Browser",
      os: "Unknown Device",
      deviceType: "desktop",
      deviceLabel: "Unknown Device",
    };
  }

  const ua = uaString.toLowerCase();

  // 1. Detect Device Type & OS
  let deviceType: "mobile" | "desktop" | "tablet" = "desktop";
  let os = "Unknown OS";
  let deviceLabel = "Desktop Device";

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "tablet";
    os = /ipad/i.test(ua) ? "iPadOS" : "Android Tablet";
    deviceLabel = "Tablet";
  } else if (/iphone/i.test(ua)) {
    deviceType = "mobile";
    os = "iOS";
    deviceLabel = "iPhone";
  } else if (/android.*mobile/i.test(ua)) {
    deviceType = "mobile";
    os = "Android";
    deviceLabel = "Android Phone";
  } else if (/macintosh|mac os x/i.test(ua)) {
    deviceType = "desktop";
    os = "macOS";
    deviceLabel = "Mac";
  } else if (/windows/i.test(ua)) {
    deviceType = "desktop";
    os = "Windows";
    deviceLabel = "Windows PC";
  } else if (/linux/i.test(ua)) {
    deviceType = "desktop";
    os = "Linux";
    deviceLabel = "Linux PC";
  }

  // 2. Detect Browser
  let browser = "Browser";
  if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = "Safari";
  }

  return {
    browser,
    os,
    deviceType,
    deviceLabel: `${deviceLabel} via ${browser}`,
  };
}

/** Formats a human-friendly sign-in description: "Signed in on iPhone on May 26, 2:34 PM" */
export function formatSignInDescription(
  uaString?: string,
  date = new Date(),
): string {
  const { os, deviceType, browser } = parseUserAgent(uaString);

  let targetDevice = "a new device";
  if (deviceType === "mobile") {
    targetDevice = os === "iOS" ? "iPhone" : "Android";
  } else if (os === "macOS") {
    targetDevice = "Mac";
  } else if (os === "Windows") {
    targetDevice = "Windows PC";
  } else if (os !== "Unknown OS") {
    targetDevice = os;
  }

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `Signed in on ${targetDevice} via ${browser} on ${formattedDate}, ${formattedTime}`;
}
