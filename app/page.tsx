import Link from "next/link";
import { cookies } from "next/headers";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username =
    typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : null;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          interns-ai-flashcard
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {user ? `Welcome, ${username ?? "friend"}` : "Login system ready"}
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          {user
            ? "You are signed in with Supabase username and password auth."
            : "Sign up or sign in to create your account."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 sm:w-auto"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="flex h-12 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
