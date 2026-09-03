import { headers } from "next/headers";

/**
 * Converts a 2-letter ISO country code (e.g. "NG", "US") to full English country name.
 */
export function getCountryNameFromCode(code: string): string {
  try {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 2) return clean;
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(clean) || clean;
  } catch {
    return code;
  }
}

/**
 * Auto-detects the user's country.
 * Prioritizes:
 * 1. Reverse proxy / CDN edge headers (Vercel, Cloudflare, CloudFront).
 * 2. Client public IP from x-forwarded-for or x-real-ip via api.country.is.
 * 3. Outbound public IP lookup via api.country.is (for local development or proxies).
 * 4. Fallback public IP lookup via ipwho.is.
 *
 * Always returns the full country name (e.g. "Nigeria", "United States", "Ghana").
 */
export async function detectUserCountry(): Promise<string | null> {
  let detectedCode: string | null = null;
  let source = "unknown";

  try {
    let reqHeaders: Headers | null = null;
    try {
      reqHeaders = await headers();
    } catch {
      // headers() may fail outside request context
    }

    // 1. Edge / reverse proxy headers (instant, zero overhead in production)
    if (reqHeaders) {
      const proxyCountry =
        reqHeaders.get("x-vercel-ip-country") ||
        reqHeaders.get("cf-ipcountry") ||
        reqHeaders.get("cloudfront-viewer-country") ||
        reqHeaders.get("x-country-code");

      if (
        proxyCountry &&
        proxyCountry.length === 2 &&
        proxyCountry !== "XX" &&
        proxyCountry !== "T1"
      ) {
        detectedCode = proxyCountry.toUpperCase();
        source = "edge-header";
      }

      // 2. Client IP geolocation lookup (if forwarded header exists and has public IP)
      if (!detectedCode) {
        const forwarded = reqHeaders.get("x-forwarded-for");
        const rawIp = forwarded?.split(",")[0]?.trim() || reqHeaders.get("x-real-ip");

        if (
          rawIp &&
          !rawIp.startsWith("127.") &&
          !rawIp.startsWith("192.168.") &&
          !rawIp.startsWith("10.") &&
          !rawIp.startsWith("172.16.") &&
          rawIp !== "::1" &&
          rawIp !== "localhost"
        ) {
          try {
            const res = await fetch(`https://api.country.is/${rawIp}`, {
              signal: AbortSignal.timeout(2500),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.country && data.country.length === 2) {
                detectedCode = data.country.toUpperCase();
                source = `client-ip (${rawIp})`;
              }
            }
          } catch {
            // ignore lookup error and proceed to public IP fallback
          }
        }
      }
    }

    // 3. Outbound public IP lookup (accurate for local dev & server environments)
    if (!detectedCode) {
      try {
        const res = await fetch("https://api.country.is", {
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.country && data.country.length === 2) {
            detectedCode = data.country.toUpperCase();
            source = `public-ip (${data.ip || "unknown"})`;
          }
        }
      } catch {
        // proceed to secondary fallback
      }
    }

    // 4. Secondary fallback via ipwho.is
    if (!detectedCode) {
      try {
        const res = await fetch("https://ipwho.is/", {
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.country_code && data.country_code.length === 2) {
            detectedCode = data.country_code.toUpperCase();
            source = `ipwho.is (${data.ip || "unknown"})`;
          }
        }
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn("[Location Detection] Error detecting country:", err);
  }

  if (detectedCode) {
    const fullName = getCountryNameFromCode(detectedCode);
    console.log(`[Location Detection] Detected: ${fullName} (${detectedCode}) via ${source}`);
    return fullName;
  }

  return null;
}
