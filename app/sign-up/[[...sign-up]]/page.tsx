import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { clerkHostedAuthUrl, publicAppUrl, safeAppPath } from "@/lib/app-url";
import { env } from "@/lib/env";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeAppPath(params.redirect_url ?? params.next);
  const { userId } = await auth();
  if (userId) redirect(redirectTo);

  const returnTo = new URL(redirectTo, publicAppUrl()).toString();
  redirect(
    clerkHostedAuthUrl("sign-up", returnTo, env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  );
}
