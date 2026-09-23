"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AutoLockModal } from "./auto-lock-modal";
import { useAuthContext } from "./AuthGuard";

export type AutoLockTimeoutOption =
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "7d";

export const AUTO_LOCK_OPTIONS: {
  id: AutoLockTimeoutOption;
  label: string;
  durationMs: number;
}[] = [
  { id: "15m", label: "15 minutes", durationMs: 15 * 60 * 1000 },
  { id: "30m", label: "30 minutes", durationMs: 30 * 60 * 1000 },
  { id: "1h", label: "1 hour", durationMs: 60 * 60 * 1000 },
  { id: "4h", label: "4 hours", durationMs: 4 * 60 * 60 * 1000 },
  { id: "7d", label: "7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
];

const STORAGE_KEYS = {
  setting: "jumpa_auto_lock_setting",
} as const;

const COOKIE_NAME = "jumpa_unlocked";
const LOCK_CHANNEL = "jumpa_lock_sync";

function notifyLockSync(action: "lock" | "unlock") {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(LOCK_CHANNEL);
      channel.postMessage(action);
      channel.close();
    } catch {}
  }
}

export function hasUnlockedCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((item) => item.trim().startsWith(`${COOKIE_NAME}=true`));
}

export function setUnlockedCookie(option: AutoLockTimeoutOption) {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  const secureFlag = isSecure ? "; Secure" : "";

  const ms = getDurationMs(option);
  const maxAgeSec = Math.max(1, Math.floor(ms / 1000));
  document.cookie = `${COOKIE_NAME}=true; path=/; max-age=${maxAgeSec}; SameSite=Lax${secureFlag}`;
}

export function clearUnlockedCookie() {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  const secureFlag = isSecure ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
}

interface AutoLockContextValue {
  isLocked: boolean;
  timeoutSetting: AutoLockTimeoutOption;
  updateTimeoutSetting: (option: AutoLockTimeoutOption) => Promise<void>;
  unlock: (password: string) => Promise<{ success: boolean; error?: string }>;
  lockNow: () => void;
}

const AutoLockContext = createContext<AutoLockContextValue | null>(null);

export function useAutoLock(): AutoLockContextValue {
  const context = useContext(AutoLockContext);
  if (!context) {
    throw new Error("useAutoLock must be used within an AutoLockProvider");
  }
  return context;
}

export function getDurationMs(option: AutoLockTimeoutOption): number {
  const found = AUTO_LOCK_OPTIONS.find((opt) => opt.id === option);
  return found ? found.durationMs : 15 * 60 * 1000;
}

export function AutoLockProvider({
  children,
  initialTimeout,
  initialIsLocked,
}: {
  children: ReactNode;
  initialTimeout?: AutoLockTimeoutOption;
  initialIsLocked?: boolean;
}) {
  const auth = useAuthContext();
  const hasPassword = auth?.status ? Boolean(auth.status.hasPassword) : true;

  const [timeoutSetting, setTimeoutSetting] = useState<AutoLockTimeoutOption>(
    () => {
      if (typeof window === "undefined") return initialTimeout || "15m";
      const saved = localStorage.getItem(
        STORAGE_KEYS.setting,
      ) as AutoLockTimeoutOption;
      if (saved && AUTO_LOCK_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
      return initialTimeout || "15m";
    },
  );

  // Locked state is solely determined by whether the unlocked cookie is present
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return initialIsLocked ?? false;
    if (initialIsLocked) return true;
    return !hasUnlockedCookie();
  });

  const lastThrottleRef = useRef<number>(0);

  // Sync initial timeout from server preference if not locally set
  useEffect(() => {
    if (initialTimeout && !localStorage.getItem(STORAGE_KEYS.setting)) {
      setTimeoutSetting(initialTimeout);
      localStorage.setItem(STORAGE_KEYS.setting, initialTimeout);
    }
  }, [initialTimeout]);

  const triggerLock = useCallback(() => {
    clearUnlockedCookie();
    setIsLocked(true);
    notifyLockSync("lock");
  }, []);

  // Periodic expiration checker for idle users (checks every 1.5s)
  useEffect(() => {
    if (typeof window === "undefined" || isLocked) {
      return;
    }

    const interval = setInterval(() => {
      if (!hasUnlockedCookie()) {
        triggerLock();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isLocked, triggerLock]);

  // Throttled activity updater: slides document.cookie max-age forward on user interaction
  const recordActivity = useCallback(() => {
    if (isLocked) return;
    const now = Date.now();
    if (now - lastThrottleRef.current > 15_000) {
      lastThrottleRef.current = now;
      setUnlockedCookie(timeoutSetting);
    }
  }, [isLocked, timeoutSetting]);

  // Activity event listeners
  useEffect(() => {
    if (typeof window === "undefined" || isLocked) return;

    const events = ["pointerdown", "keydown", "touchstart", "scroll"];
    const handleEvent = () => recordActivity();

    events.forEach((evt) =>
      window.addEventListener(evt, handleEvent, { passive: true }),
    );

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
    };
  }, [recordActivity, isLocked]);

  // Tab visibility and focus change detection
  useEffect(() => {
    if (typeof window === "undefined" || isLocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!hasUnlockedCookie()) {
          triggerLock();
        } else {
          recordActivity();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [isLocked, triggerLock, recordActivity]);

  // In-memory cross-tab synchronization via BroadcastChannel (no disk storage used)
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(LOCK_CHANNEL);
    channel.onmessage = (e) => {
      if (e.data === "lock") {
        setIsLocked(true);
      } else if (e.data === "unlock" && hasUnlockedCookie()) {
        setIsLocked(false);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Update setting handler (caches preference setting and syncs to DB)
  const updateTimeoutSetting = useCallback(
    async (newOption: AutoLockTimeoutOption) => {
      setTimeoutSetting(newOption);
      localStorage.setItem(STORAGE_KEYS.setting, newOption);
      setUnlockedCookie(newOption);

      try {
        await fetch("/api/user/preference", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autoLockTimeout: newOption }),
        });
      } catch (err) {
        console.warn("[AutoLock] Failed to sync preference to server:", err);
      }
    },
    [],
  );

  // Unlock handler: verifies 6-digit login password with server
  const unlock = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.verified) {
          return {
            success: false,
            error: data.error || "Incorrect password",
          };
        }

        setUnlockedCookie(timeoutSetting);
        lastThrottleRef.current = Date.now();
        setIsLocked(false);
        notifyLockSync("unlock");

        return { success: true };
      } catch (err: any) {
        console.error("[AutoLock] Unlock error:", err);
        return {
          success: false,
          error: err?.message || "Failed to verify password",
        };
      }
    },
    [timeoutSetting],
  );

  const lockNow = useCallback(() => {
    triggerLock();
    fetch("/api/auth/verify-password", { method: "DELETE" }).catch(() => {});
  }, [triggerLock]);

  return (
    <AutoLockContext.Provider
      value={{
        isLocked,
        timeoutSetting,
        updateTimeoutSetting,
        unlock,
        lockNow,
      }}
    >
      {children}
      {isLocked && hasPassword ? <AutoLockModal onUnlock={unlock} /> : null}
    </AutoLockContext.Provider>
  );
}
