import { NextResponse } from "next/server";

export type ExternalProvider =
  | "Myaza"
  | "Aella"
  | "Fossapay"
  | "Brails"
  | "Centiiv"
  | "Toronet"
  | "Defindex"
  | "Stellar"
  | "Rates"
  | "Bills"
  | "Bridge"
  | "CircleIris"
  | "Generic";

export interface SafeFetchOptions {
  provider: ExternalProvider | string;
  action?: string;
  /** Timeout in milliseconds. Defaults to 15,000ms (15s). Use 8000 for fast reads, 30000 for uploads. */
  timeoutMs?: number;
  /** Custom error message mapper based on upstream response payload or status. */
  customErrorMessage?: (data: any, status: number) => string | null;
}

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: any;
}

/**
 * Safely flattens full error or provider payload into a compact single line,
 * capping it at 400 characters max so no multiline traces spill into logs.
 */
export function formatOneLineError(err: any, maxLen = 1000): string {
  try {
    let raw = "";
    if (typeof err === "string") {
      raw = err;
    } else if (err instanceof Error) {
      const extra: Record<string, any> = {};
      for (const key of Object.getOwnPropertyNames(err)) {
        if (key !== "name" && key !== "message" && key !== "stack") {
          extra[key] = (err as any)[key];
        }
      }
      const hasExtra = Object.keys(extra).length > 0;
      raw = `${err.name}: ${err.message}${hasExtra ? ` | details: ${JSON.stringify(extra)}` : ""}`;
    } else {
      raw = JSON.stringify(err);
    }
    const flattened = String(raw || "Unknown error")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return flattened.length > maxLen
      ? `${flattened.slice(0, maxLen - 3)}...`
      : flattened;
  } catch {
    return String(err).replace(/[\r\n\t]+/g, " ").slice(0, maxLen);
  }
}

/**
 * Determines whether an error was caused by a network timeout or abort.
 */
export function isTimeoutError(err: any): boolean {
  if (!err) return false;
  return (
    err?.name === "TimeoutError" ||
    err?.name === "AbortError" ||
    err?.code === "ETIMEDOUT" ||
    err?.code === "ECONNABORTED" ||
    String(err?.message || "").toLowerCase().includes("timeout") ||
    String(err?.message || "").toLowerCase().includes("aborted")
  );
}

/**
 * Executes a network call to a 3rd-party provider with an automatic timeout signal.
 */
export async function safeExternalFetch<T = any>(
  url: string,
  init: RequestInit = {},
  options: SafeFetchOptions
): Promise<SafeFetchResult<T>> {
  const { provider, action, timeoutMs = 15000 } = options;

  let timeoutId: NodeJS.Timeout | null = null;
  let signal = init.signal;

  // Use AbortSignal.timeout if supported, otherwise fallback to AbortController
  if (!signal) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      signal = AbortSignal.timeout(timeoutMs);
    } else {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      signal = controller.signal;
    }
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal,
    });

    let data: T | null = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[${provider}] ${isTimeout ? `Timed out after ${timeoutMs}ms` : "Network Exception"}: ${formatOneLineError(err)}`
    );

    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      data: null,
      error: err,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export interface HandleErrorParams {
  provider: ExternalProvider | string;
  action?: string;
  status?: number;
  rawError?: any;
  /** Optional custom client message override */
  customMessage?: string;
}

/**
 * Intercepts a 3rd-party error, logs a clean one-line trace (< 400 chars),
 * and returns a sanitized, user-friendly NextResponse.
 */
export function handleExternalApiError(params: HandleErrorParams): NextResponse {
  const { provider, status = 500, rawError, customMessage } = params;

  // 1. One-line console log capped at 400 chars max
  console.error(
    `[${provider}] Upstream failure | Status: ${status} | Payload: ${formatOneLineError(rawError)}`
  );

  // 2. Identify error type and craft user-friendly error copy
  let clientMessage = customMessage;
  let responseStatus = status >= 400 && status < 600 ? status : 500;

  if (!clientMessage) {
    if (isTimeoutError(rawError) || status === 504) {
      responseStatus = 504;
      clientMessage =
        "The request timed out while contacting our provider. Please check your connection and try again.";
    } else if (status === 429) {
      clientMessage =
        "The service is currently experiencing heavy traffic. Please wait a moment and try again.";
    } else if (status >= 500) {
      responseStatus = 502;
      clientMessage =
        "Our provider service is momentarily unavailable. Please try again shortly.";
    } else if (status === 401 || status === 403) {
      responseStatus = 500; // Do not leak auth / permission failures from upstream
      clientMessage =
        "Unable to authorize service transaction at this time. Please contact support.";
    } else if (status === 400 || status === 422) {
      clientMessage =
        "The transaction request could not be completed with the provider. Please verify your details.";
    } else {
      clientMessage =
        "An unexpected error occurred while communicating with the service. Please try again later.";
    }
  }

  return NextResponse.json(
    {
      error: clientMessage,
      success: false,
    },
    { status: responseStatus }
  );
}