"use client";

import { FormEvent, useEffect, useState } from "react";

import { PasskeySetup } from "@/components/passkey-setup";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/toast-provider";

type SessionRow = {
  id: string;
  token?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export function AccountSettings({ email }: { email: string }) {
  const { pushToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions() {
    const result = await authClient.listSessions();
    if (result.error) {
      setError(result.error.message || "Could not load sessions");
      return;
    }
    setSessions((result.data as SessionRow[]) ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        const result = await authClient.listSessions();
        if (cancelled) return;
        if (result.error) {
          setError(result.error.message || "Could not load sessions");
          return;
        }
        setSessions((result.data as SessionRow[]) ?? []);
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message || "Could not change password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      pushToast("Password updated");
      await loadSessions();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not change password",
      );
    } finally {
      setPending(false);
    }
  }

  async function revokeOthers() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) {
        setError(result.error.message || "Could not revoke sessions");
        return;
      }
      pushToast("Other sessions signed out");
      await loadSessions();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not revoke sessions",
      );
    } finally {
      setPending(false);
    }
  }

  async function revokeOne(token: string) {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.revokeSession({ token });
      if (result.error) {
        setError(result.error.message || "Could not revoke session");
        return;
      }
      pushToast("Session revoked");
      await loadSessions();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not revoke session",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Profile</h2>
        <p className="mt-1 text-sm text-slate-600">{email}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Change password</h2>
        <form className="mt-4 space-y-3" onSubmit={onChangePassword}>
          <label className="block space-y-2">
            <span className="text-sm font-bold">Current password</span>
            <input
              className="field"
              minLength={8}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold">New password</span>
            <input
              className="field"
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>
          <button className="primary-button" disabled={pending} type="submit">
            Update password
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Passkeys</h2>
        <div className="mt-4">
          <PasskeySetup />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Sessions</h2>
          <button
            className="secondary-button"
            disabled={pending}
            onClick={() => void revokeOthers()}
            type="button"
          >
            Sign out other devices
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {sessions.map((session) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm"
              key={session.id}
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {session.userAgent?.slice(0, 80) || "Browser session"}
                </p>
                <p className="text-slate-500">
                  {session.ipAddress || "IP unknown"} ·{" "}
                  {session.updatedAt
                    ? new Date(session.updatedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              {session.token ? (
                <button
                  className="text-button text-rose-700"
                  disabled={pending}
                  onClick={() => void revokeOne(session.token!)}
                  type="button"
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
          {!sessions.length ? (
            <li className="text-sm text-slate-500">No sessions listed.</li>
          ) : null}
        </ul>
      </section>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
