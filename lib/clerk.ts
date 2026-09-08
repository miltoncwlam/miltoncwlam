import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { SessionUser } from "@/lib/types/auth";

export async function getClerkSessionUser(): Promise<SessionUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }

  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const role =
    typeof user?.publicMetadata?.role === "string"
      ? user.publicMetadata.role
      : "user";

  return {
    id: userId,
    email,
    name:
      user?.fullName?.trim() ||
      user?.firstName?.trim() ||
      email.split("@")[0] ||
      "Learner",
    role,
  };
}
