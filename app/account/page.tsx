import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/account-settings";
import { auth } from "@/lib/auth";
import { clerkAuthConfigured, requireSession } from "@/lib/auth-server";

export default async function AccountPage() {
  const session = await requireSession();

  if (session.provider === "clerk" && clerkAuthConfigured()) {
    return (
      <main className="page-shell max-w-3xl">
        <Link className="text-button" href="/decks">
          ← Back to decks
        </Link>
        <p className="eyebrow mt-6">Account</p>
        <h1 className="page-title text-4xl">Settings</h1>
        <p className="page-subtitle">
          Signed in with Clerk as {session.user.email}. Password and social
          connections are managed below.
        </p>
        <div className="mt-8 flex justify-center">
          <UserProfile routing="hash" />
        </div>
      </main>
    );
  }

  const full = await auth.api.getSession({ headers: await headers() });
  if (!full?.user?.email) redirect("/sign-in");

  return (
    <main className="page-shell max-w-2xl">
      <Link className="text-button" href="/decks">
        ← Back to decks
      </Link>
      <p className="eyebrow mt-6">Account</p>
      <h1 className="page-title text-4xl">Settings</h1>
      <p className="page-subtitle">
        Password, passkeys, and active sessions for {full.user.email}.
      </p>
      <div className="mt-8">
        <AccountSettings email={full.user.email} />
      </div>
    </main>
  );
}
