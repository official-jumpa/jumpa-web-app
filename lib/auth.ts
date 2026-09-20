import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP, anonymous } from "better-auth/plugins";
import { connectDB, getDb } from "./db";
import { sendOtpEmail } from "./email-otp-mail";
import { environment } from "./environment";
import { generateId } from "./schema-ids";

import { generateUniqueReferralCode, ensureUserJumpaFields } from "./user-profile";
import { User } from "@/models/User";
import { Referral } from "@/models/Referral";
import { Wallet } from "@/models/Wallet";

import { detectUserCountry } from "./location";
import { recordUserActivity } from "./functions/userFunctions";
import { createNotification } from "./functions/notificationFunctions";
import { shouldSendNotification } from "./functions/userPreferenceFunctions";
import { formatSignInDescription, parseUserAgent } from "./user-agent";
import { sendLoginAlertEmail } from "./email-notifications";

await connectDB();

export const auth = betterAuth({
  baseURL: environment.BETTER_AUTH_URL || environment.AUTH_URL,
  database: mongodbAdapter(getDb()),
  user: {
    additionalFields: {
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
      },
      country: {
        type: "string",
        required: false,
      },
      jumpaTag: {
        type: "string",
        required: false,
      },
      referralCode: {
        type: "string",
        required: false,
      },
      referredBy: {
        type: "string",
        required: false,
      },
      nickname: {
        type: "string",
        required: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          try {
            const userId = session.userId;
            const wallet = await Wallet.findOne({ userId });

            await User.updateOne(
              { _id: userId },
              {
                $set: {
                  lastLoginAt: new Date(),
                  ...(wallet ? { activeWalletId: wallet._id } : {}),
                },
              },
            );

            await ensureUserJumpaFields(userId);

            // 1. Record in UserActivityLog
            await recordUserActivity({
              userId,
              action: "USER_LOGIN",
              ipAddress: session.ipAddress || undefined,
              userAgent: session.userAgent || undefined,
              details: { sessionId: session.id },
            });

            // 2. Create in-app activity notification
            const loginBody = formatSignInDescription(
              session.userAgent || undefined,
              new Date(),
            );
            await createNotification({
              userId,
              tab: "activities",
              type: "LOGIN",
              title: "New Sign-in",
              body: loginBody,
              metadata: {
                sessionId: session.id,
                userAgent: session.userAgent || undefined,
              },
              link: "/profile/settings?section=devices",
            });

            // 3. Dispatch security email alert if allowed by user preference
            const allowEmail = await shouldSendNotification(userId, "LOGIN");
            if (allowEmail) {
              const userRecord = await User.findById(userId).lean();
              if (userRecord?.email) {
                const { deviceLabel, browser, os } = parseUserAgent(
                  session.userAgent || undefined,
                );
                const appUrl =
                  process.env.NEXT_PUBLIC_APP_URL || "https://usejumpa.com";
                sendLoginAlertEmail(userRecord.email, {
                  customerName: userRecord.name || "Jumpa User",
                  email: userRecord.email,
                  device: deviceLabel,
                  browser,
                  os,
                  ipAddress: session.ipAddress || undefined,
                  manageDevicesUrl: `${appUrl}/profile/settings?section=devices`,
                  time: new Date(),
                }).catch((err) =>
                  console.warn(`[Auth Hook] Failed to send login alert email to ${userRecord?.email || "unknown"}:`, err),
                );
              }
            }
          } catch (e) {
            console.error("[Auth Hook] Failed in session.create.after:", e);
          }
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          const referralCode = await generateUniqueReferralCode();
          const country = await detectUserCountry();
          const rawTag = (user as any).jumpaTag;
          const tag =
            rawTag && typeof rawTag === "string" && rawTag.trim()
              ? rawTag.toLowerCase().trim()
              : undefined;

          return {
            data: {
              ...user,
              status: (user as any).status || "active",
              country: (user as any).country || country,
              ...(tag ? { jumpaTag: tag } : {}),
              referralCode: (user as any).referralCode || referralCode,
            },
          };
        },
        after: async (user) => {
          const referredBy = (user as any).referredBy;
          if (referredBy) {
            try {
              const referrer = await User.findOne({
                referralCode: String(referredBy).toLowerCase(),
              });
              if (referrer && referrer._id !== user.id) {
                await Referral.create({
                  referrerId: referrer._id,
                  referrerCode: String(referredBy).toLowerCase(),
                  referredUserId: user.id,
                  points: 1,
                  status: "joined",
                });
              }
            } catch (e) {
              console.error("[Auth Hook] Failed to record referral:", e);
            }
          }
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: ({ model }: { model: string }) => {
        const map: Record<string, "user" | "sess" | "acct" | "vrfy"> = {
          user: "user",
          session: "sess",
          account: "acct",
          verification: "vrfy",
        };
        return generateId(map[model] ?? "user");
      },
    },
  },
  socialProviders: {
    google: {
      clientId: environment.GOOGLE_CLIENT_ID,
      clientSecret: environment.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp);
      },
    }),
    anonymous(),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});
