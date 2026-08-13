import "server-only";

import { redirect } from "next/navigation";

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
