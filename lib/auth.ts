import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP, anonymous } from "better-auth/plugins";
import { connectDB, getDb } from "./db";
import { sendOtpEmail } from "./email-otp-mail";
import { environment } from "./environment";
import { generateId } from "./schema-ids";

import { generateUniqueJumpaTag, generateUniqueReferralCode, ensureUserJumpaFields } from "./user-profile";
import { User } from "@/models/User";
import { Referral } from "@/models/Referral";
import { Wallet } from "@/models/Wallet";

await connectDB();

export const auth = betterAuth({
  database: mongodbAdapter(getDb()),
  user: {
    additionalFields: {
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
          } catch (e) {
            console.error("[Auth Hook] Failed in session.create.after:", e);
          }
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          const jumpaTag = await generateUniqueJumpaTag(user.name, user.email);
          const referralCode = await generateUniqueReferralCode();
          return {
            data: {
              ...user,
              jumpaTag: (user as any).jumpaTag || jumpaTag,
              referralCode: (user as any).referralCode || referralCode,
            },
          };
        },
        after: async (user) => {
          const referredBy = (user as any).referredBy;
          if (referredBy) {
            try {
              const referrer = await User.findOne({
                referralCode: String(referredBy).toUpperCase(),
              });
              if (referrer && referrer._id !== user.id) {
                await Referral.create({
                  referrerId: referrer._id,
                  referrerCode: String(referredBy).toUpperCase(),
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
        const map: Record<string, "USER" | "SESS" | "ACCT" | "VRFY"> = {
          user: "USER",
          session: "SESS",
          account: "ACCT",
          verification: "VRFY",
        };
        return generateId(map[model] ?? "USER");
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
