"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, anonymousClient } from "better-auth/client/plugins";
import { environment } from "./environment";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : environment.BETTER_AUTH_URL,
  plugins: [emailOTPClient(), anonymousClient()],
});

export const { signIn, signOut, useSession, emailOtp } = authClient;
