"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type AuthFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  action: (
    prevState: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  alternateHref: string;
  alternateLabel: string;
};

const initialState: AuthActionState = {};

export function AuthForm({
  title,
  description,
  submitLabel,
  passwordAutoComplete,
  action,
  alternateHref,
  alternateLabel,
}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
              placeholder="your_username"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={passwordAutoComplete}
              required
              minLength={6}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
              placeholder="••••••••"
            />
          </div>

          {state.error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
          >
            {isPending ? "Please wait..." : submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {alternateLabel}{" "}
          <Link
            href={alternateHref}
            className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Click here
          </Link>
        </p>
      </div>
    </div>
  );
}
