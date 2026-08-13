"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function PasskeySetup() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function addPasskey() {
    setPending(true);
    setMessage(null);
    try {
      const result = await authClient.passkey.addPasskey({
        name: "HK Study A passkey",
      });
      if (result.error) {
        setMessage(result.error.message || "Could not add passkey");
        return;
      }
      setMessage("Passkey saved. You can use it next time you sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add passkey");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-bold text-slate-900">Passkey</p>
      <p className="mt-1 text-sm text-slate-600">
        Add a device passkey for faster, phishing-resistant sign-in.
      </p>
      <button
        className="secondary-button mt-3"
        disabled={pending}
        onClick={addPasskey}
        type="button"
      >
        {pending ? "Waiting…" : "Add passkey"}
      </button>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
