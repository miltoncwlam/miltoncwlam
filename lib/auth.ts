import "server-only";

import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

function appUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
}

function trustedOrigins() {
  const origins = new Set<string>();
  for (const value of [
    appUrl(),
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ]) {
    if (value?.startsWith("http")) origins.add(value.replace(/\/$/, ""));
  }
  return [...origins];
}

function rpID() {
  try {
    return new URL(appUrl()).hostname;
  } catch {
    return "localhost";
  }
}

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.VERCEL ? 1 : 5,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appUrl(),
  trustedOrigins: trustedOrigins(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    passkey({
      rpID: rpID(),
      rpName: "HK Study A",
      origin: appUrl(),
    }),
    nextCookies(),
  ],
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role?: string | null;
};
