import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  LOCAL_AUTH_COOKIE,
  LOCAL_DEV_USER,
  isLocalAppHost,
  verifyLocalAuthCookie,
} from "@/lib/auth-local";
import { getClerkSessionUser } from "@/lib/clerk";
import { env } from "@/lib/env";
import type { SessionUser } from "@/lib/types/auth";

export type { SessionUser } from "@/lib/types/auth";

export type AppSession = {
  user: SessionUser;
};

export function isAdminUser(user: SessionUser): boolean {
  if (user.role === "admin") return true;
  const bootstrap = env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  return Boolean(bootstrap && user.email.toLowerCase() === bootstrap);
}

export async function getSession(): Promise<AppSession | null> {
  const host = (await headers()).get("host");
  if (isLocalAppHost(host)) {
    const token = (await cookies()).get(LOCAL_AUTH_COOKIE)?.value;
    const secret = env.CLERK_SECRET_KEY;
    if (secret && (await verifyLocalAuthCookie(token, secret))) {
      return { user: { ...LOCAL_DEV_USER } };
    }
    return null;
  }

  const user = await getClerkSessionUser();
  if (!user) return null;
  return { user };
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

export async function requireApiSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function requireAdminSession(): Promise<AppSession> {
  const session = await requireSession();
  if (!isAdminUser(session.user)) {
    redirect("/decks");
  }
  return session;
}
