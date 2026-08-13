import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";

import { requireSession } from "@/lib/auth-server";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <main className="page-shell max-w-3xl">
      <Link className="text-button" href="/decks">
        ← Back to decks
      </Link>
      <p className="eyebrow mt-6">Account</p>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">
        Signed in as {session.user.email}. Password and email sign-in are
        managed below.
      </p>
      <div className="mt-8 flex justify-center">
        <UserProfile routing="hash" />
      </div>
    </main>
  );
}
