import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

import { isGuestEmail } from "@/lib/credits/config";
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
  const isGuest =
    user?.publicMetadata?.guest === true || isGuestEmail(email);

  return {
    id: userId,
    email,
    name:
      user?.fullName?.trim() ||
      user?.firstName?.trim() ||
      email.split("@")[0] ||
      (isGuest ? "Guest" : "Learner"),
    role,
    isGuest,
  };
}

export async function displayNamesForUsers(
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const names = new Map<string, string>();
  if (!unique.length) return names;
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({
      userId: unique,
      limit: Math.min(100, unique.length),
    });
    for (const user of users.data) {
      const email = user.emailAddresses[0]?.emailAddress ?? "";
      names.set(
        user.id,
        user.fullName?.trim() ||
          user.firstName?.trim() ||
          email.split("@")[0] ||
          "Learner",
      );
    }
  } catch {
    // Keep truncated ids if Clerk is unavailable.
  }
  return names;
}
