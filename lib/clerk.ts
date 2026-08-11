import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { env } from "@/lib/env";
import type { SessionUser } from "@/lib/auth";

export function isClerkEnabled(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY,
  );
}

export async function getClerkSessionUser(): Promise<SessionUser | null> {
  if (!isClerkEnabled()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const role =
    typeof user.publicMetadata?.role === "string"
      ? user.publicMetadata.role
      : "user";

  return {
    id: userId,
    email,
    name:
      user.fullName?.trim() ||
      user.firstName?.trim() ||
      email.split("@")[0] ||
      "Learner",
    role,
  };
}
