"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";

export interface UserProfile {
  id: string;
  name: string | null;
  nickname: string | null;
  jumpaTag: string | null;
  email: string;
  image: string | null;
  country: string | null;
  status?: "pending" | "active" | "banned" | "suspended" | "deleted";
}

export interface UserProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

/**
 * Hook to consume the reactive user profile state across the entire app.
 */
export function useUserProfile(): UserProfileContextValue {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}

interface UserProfileProviderProps {
  children: ReactNode;
  initialProfile?: UserProfile | null;
}

export function UserProfileProvider({
  children,
  initialProfile = null,
}: UserProfileProviderProps) {
  const auth = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (initialProfile) return initialProfile;
    if (auth?.user) {
      return {
        id: auth.user.id,
        name: auth.user.name ?? null,
        nickname: auth.user.nickname ?? null,
        jumpaTag: auth.user.jumpaTag ?? null,
        email: auth.user.email,
        image: auth.user.image ?? null,
        country: auth.user.country ?? null,
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!initialProfile && !auth?.user);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (err) {
      console.warn("[UserProfileProvider] Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      fetchProfile();
    }
  }, [auth?.isAuthenticated, fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<UserProfile> => {
      const previous = profile;

      // 1. Optimistic update: reflect immediately across the app
      setProfile((prev) => (prev ? { ...prev, ...updates } : (updates as UserProfile)));

      try {
        // 2. Persist to unified profile endpoint
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to update profile.");
        }

        const savedProfile = data.profile;
        setProfile(savedProfile);

        // Keep AuthGuard context in sync if supported
        auth?.updateUser?.(updates);

        return savedProfile;
      } catch (err) {
        // Rollback optimistic update on error
        setProfile(previous);
        throw err;
      }
    },
    [profile, auth],
  );

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        isLoading,
        updateProfile,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}
