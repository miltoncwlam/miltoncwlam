"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              autoComplete="name"
              disabled={pending}
              id="name"
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="username webauthn"
            disabled={pending}
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password webauthn"
            }
            disabled={pending}
            id="password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button className="w-full" disabled={pending} type="submit">
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
        {mode === "sign-in" ? (
          <Button
            className="w-full"
            disabled={pending}
            onClick={onPasskey}
            type="button"
            variant="secondary"
          >
            Sign in with passkey
          </Button>
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
