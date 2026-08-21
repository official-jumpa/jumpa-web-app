import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP, anonymous } from "better-auth/plugins";
import { connectDB, getDb } from "./db";
import { sendOtpEmail } from "./email-otp-mail";
import { environment } from "./environment";
import { generateId } from "./schema-ids";

await connectDB();

export const auth = betterAuth({
  database: mongodbAdapter(getDb()),
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
