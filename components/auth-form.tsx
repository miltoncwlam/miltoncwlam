"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

export function AuthForm({
  mode,
  nextPath = "/decks",
}: {
  mode: "sign-in" | "sign-up";
  nextPath?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode !== "sign-in") return;
    if (
      !PublicKeyCredential.isConditionalMediationAvailable ||
      !PublicKeyCredential.isConditionalMediationAvailable()
    ) {
      return;
    }
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess() {
          router.push(nextPath);
          router.refresh();
        },
      },
    });
  }, [mode, nextPath, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "sign-up") {
        const displayName =
          name.trim() || email.split("@")[0] || "Learner";
        const result = await authClient.signUp.email({
          email,
          password,
          name: displayName,
        });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message || "Sign in failed");
          return;
        }
      }
      router.push(nextPath);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : mode === "sign-up"
            ? "Sign up failed"
            : "Sign in failed",
      );
    } finally {
      setPending(false);
    }
  }

  async function onPasskey() {
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) {
        setError(result.error.message || "Passkey sign-in failed");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Passkey sign-in failed",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 w-full max-w-sm space-y-4">
      <form className="space-y-4" onSubmit={onSubmit}>
        {mode === "sign-up" ? (
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">Name</span>
            <input
              autoComplete="name"
              className="field"
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </label>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Email</span>
          <input
            autoComplete="username webauthn"
            className="field"
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">Password</span>
          <input
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password webauthn"
            }
            className="field"
            disabled={pending}
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
        <button className="primary-button w-full" disabled={pending} type="submit">
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
        {mode === "sign-in" ? (
          <button
            className="secondary-button w-full"
            disabled={pending}
            onClick={onPasskey}
            type="button"
          >
            Sign in with passkey
          </button>
        ) : null}
      </form>
      <p className="text-center text-sm text-slate-600">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link className="font-bold text-indigo-700 underline" href="/sign-in">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link className="font-bold text-indigo-700 underline" href="/sign-up">
              Sign up
            </Link>
            {" · "}
            Admins can also provision users in{" "}
            <Link className="font-bold text-indigo-700 underline" href="/admin">
              /admin
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
