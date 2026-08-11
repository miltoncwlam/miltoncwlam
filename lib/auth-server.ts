import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type SessionUser } from "@/lib/auth";
import { getClerkSessionUser, isClerkEnabled } from "@/lib/clerk";
import type { AuthProvider } from "@/lib/types/auth";

export type { AuthProvider } from "@/lib/types/auth";

export type AppSession = {
  user: SessionUser;
  provider: AuthProvider;
};

async function getBetterAuthSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user as { role?: string | null }).role ?? "user",
    },
    provider: "better-auth",
  };
}

export async function getSession(): Promise<AppSession | null> {
  const betterAuth = await getBetterAuthSession();
  if (betterAuth) return betterAuth;

  const clerkUser = await getClerkSessionUser();
  if (clerkUser) {
    return { user: clerkUser, provider: "clerk" };
  }

  return null;
}

export function clerkAuthConfigured(): boolean {
  return isClerkEnabled();
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
  if (session.provider !== "better-auth" || session.user.role !== "admin") {
    redirect("/decks");
  }
  return session;
}
