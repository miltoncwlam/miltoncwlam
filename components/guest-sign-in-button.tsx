"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GuestSignInButton({
  redirectTo = "/decks",
  className,
  label = "Try as guest",
}: {
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGuest() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      const payload = (await response.json()) as { ticket?: string; error?: string };
      if (!response.ok || !payload.ticket) {
        throw new Error(payload.error || "Could not start a guest session");
      }
      if (isLoaded && signIn && setActive) {
        const result = await signIn.create({
          strategy: "ticket",
          ticket: payload.ticket,
        });
        if (result.status !== "complete" || !result.createdSessionId) {
          throw new Error("Guest sign-in did not finish. Create an account instead.");
        }
        await setActive({ session: result.createdSessionId });
        router.push(redirectTo);
        router.refresh();
        return;
      }
      const next = new URL("/sign-in", window.location.origin);
      next.searchParams.set("__clerk_ticket", payload.ticket);
      next.searchParams.set("redirect_url", redirectTo);
      window.location.assign(next.toString());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start a guest session",
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className={className}
        disabled={pending}
        onClick={() => void startGuest()}
        type="button"
      >
        {pending ? "Starting guest…" : label}
      </button>
      {error ? (
        <p className="text-center text-sm text-rose-800 xl:text-left">{error}</p>
      ) : null}
    </div>
  );
}
