import { clerkClient } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

import {
  LOCAL_AUTH_COOKIE,
  createLocalAuthCookie,
  isLocalAppHost,
} from "@/lib/auth-local";
import { isGuestEmail } from "@/lib/credits/config";

const GUEST_COOKIE = "hk_guest_uid";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function isGuestRecord(user: {
  publicMetadata?: Record<string, unknown> | null;
  emailAddresses?: { emailAddress: string }[];
}) {
  if (user.publicMetadata?.guest === true) return true;
  return (user.emailAddresses ?? []).some((entry) =>
    isGuestEmail(entry.emailAddress),
  );
}

function guestPassword() {
  return `Guest-${crypto.randomUUID()}Aa1!`;
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(LOCAL_AUTH_COOKIE);
  return Response.json({ ok: true });
}

export async function POST() {
  try {
    const host = (await headers()).get("host");
    if (isLocalAppHost(host)) {
      const secret = process.env.CLERK_SECRET_KEY;
      if (!secret) {
        return Response.json(
          { error: "Local auth is not configured" },
          { status: 500 },
        );
      }
      const jar = await cookies();
      jar.set(LOCAL_AUTH_COOKIE, await createLocalAuthCookie(secret), {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: GUEST_COOKIE_MAX_AGE,
      });
      return Response.json({ local: true, redirect: "/decks/new" });
    }

    const client = await clerkClient();
    const jar = await cookies();
    const existingId = jar.get(GUEST_COOKIE)?.value;
    let userId = existingId;

    if (userId) {
      try {
        const user = await client.users.getUser(userId);
        if (!isGuestRecord(user)) userId = undefined;
      } catch {
        userId = undefined;
      }
    }

    if (!userId) {
      const stamp = crypto.randomUUID();
      const user = await client.users.createUser({
        emailAddress: [`guest-${stamp}@example.com`],
        password: guestPassword(),
        firstName: "Guest",
        publicMetadata: { guest: true },
      });
      userId = user.id;
      jar.set(GUEST_COOKIE, userId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: GUEST_COOKIE_MAX_AGE,
      });
    }

    const token = await client.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: 120,
    });

    return Response.json({ ticket: token.token });
  } catch (error) {
    console.error("[guest-auth]", error);
    return Response.json(
      { error: "Could not start a guest session. Try again, or create an account." },
      { status: 500 },
    );
  }
}
