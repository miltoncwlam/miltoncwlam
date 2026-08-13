import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { SessionUser } from "@/lib/types/auth";

export async function getClerkSessionUser(): Promise<SessionUser | null> {
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
