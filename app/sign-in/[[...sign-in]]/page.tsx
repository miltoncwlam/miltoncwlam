import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ClerkSignInPanel } from "@/components/clerk-auth-panel";
import { safeAppPath } from "@/lib/app-url";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeAppPath(params.redirect_url ?? params.next);
  const { userId } = await auth();
  if (userId) redirect(redirectTo);

  return (
    <main className="auth-fill">
      <ClerkSignInPanel redirectTo={redirectTo} />
    </main>
  );
}
