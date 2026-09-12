import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AUTH_ALLOWED_HOSTS, authTrustedOrigins } from "@/lib/auth-origins";

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [...AUTH_ALLOWED_HOSTS],
    fallback: process.env.BETTER_AUTH_URL,
  },
  trustedOrigins: authTrustedOrigins(process.env.BETTER_AUTH_URL),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [nextCookies()],
});
