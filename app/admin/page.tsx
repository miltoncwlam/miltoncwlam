import Link from "next/link";

import {
  adminCreateUserAction,
  adminResolveReportAction,
  adminSetFeaturedAction,
  adminUpdateEnergyAction,
} from "@/lib/actions/admin";
import { requireAdminSession } from "@/lib/auth-server";
import { listUsersWithCredits } from "@/lib/data/credits";
import { pool } from "@/lib/db";
import { PasskeySetup } from "@/components/passkey-setup";

export default async function AdminPage() {
  await requireAdminSession();
  const [users, reports, featuredCandidates] = await Promise.all([
    listUsersWithCredits(),
    pool.query<{
      id: string;
      deck_id: string;
      reporter_user_id: string;
      reason: string;
      details: string | null;
      status: string;
      created_at: Date;
      title: string | null;
    }>(
      `select r.*, d.title
       from moderation_reports r
       left join decks d on d.id = r.deck_id
       where r.status = 'open'
       order by r.created_at desc
       limit 50`,
    ),
    pool.query<{ id: string; title: string; is_featured: boolean }>(
      `select id, title, is_featured from decks
       where visibility = 'public' and moderation_status = 'approved'
       order by is_featured desc, listed_at desc nulls last
       limit 40`,
    ),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Admin</h1>
        <p className="text-slate-600">
          Create accounts, set energy limits, and moderate community.
        </p>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link className="text-indigo-700 underline" href="/admin/energy">
            Energy ledger
          </Link>
          <Link className="text-indigo-700 underline" href="/admin/audit">
            Audit log
          </Link>
          <Link className="text-indigo-700 underline" href="/decks">
            Back to decks
          </Link>
        </div>
      </header>

      <PasskeySetup />

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Create user</h2>
        <form action={adminCreateUserAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-bold">Email</span>
            <input className="field" name="email" required type="email" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-bold">Name</span>
            <input className="field" defaultValue="Learner" name="name" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-bold">Temp password</span>
            <input className="field" minLength={8} name="password" required type="text" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-bold">Weekly energy grant</span>
            <input className="field" defaultValue={100} min={0} name="periodGrant" type="number" />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
            <input name="isUnlimited" type="checkbox" />
            Unlimited energy
          </label>
          <button className="primary-button sm:col-span-2" type="submit">
            Create account
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Users</h2>
        <ul className="space-y-3">
          {users.map((user) => (
            <li
              className="rounded-2xl border border-slate-200 bg-white p-4"
              key={user.id}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-bold">{user.email}</p>
                  <p className="text-sm text-slate-500">
                    {user.name} · {user.role ?? "user"} · balance{" "}
                    {user.is_unlimited ? "unlimited" : (user.balance ?? 0)}
                  </p>
                </div>
              </div>
              <form
                action={adminUpdateEnergyAction}
                className="mt-3 grid gap-2 sm:grid-cols-4"
              >
                <input name="userId" type="hidden" value={user.id} />
                <label className="block space-y-1">
                  <span className="text-xs font-bold">Weekly grant</span>
                  <input
                    className="field"
                    defaultValue={user.period_grant ?? 100}
                    name="periodGrant"
                    type="number"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold">Set balance</span>
                  <input
                    className="field"
                    defaultValue={user.balance ?? 100}
                    name="balance"
                    type="number"
                  />
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                  <input
                    defaultChecked={Boolean(user.is_unlimited)}
                    name="isUnlimited"
                    type="checkbox"
                  />
                  Unlimited
                </label>
                <button className="secondary-button mt-5" type="submit">
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Open reports</h2>
        {!reports.rows.length ? (
          <p className="text-sm text-slate-500">No open reports.</p>
        ) : (
          <ul className="space-y-3">
            {reports.rows.map((report) => (
              <li
                className="rounded-2xl border border-slate-200 bg-white p-4"
                key={report.id}
              >
                <p className="font-bold">{report.title ?? report.deck_id}</p>
                <p className="text-sm text-slate-600">
                  {report.reason}
                  {report.details ? ` — ${report.details}` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={adminResolveReportAction}>
                    <input name="reportId" type="hidden" value={report.id} />
                    <input name="status" type="hidden" value="resolved" />
                    <button className="secondary-button" type="submit">
                      Resolve
                    </button>
                  </form>
                  <form action={adminResolveReportAction}>
                    <input name="reportId" type="hidden" value={report.id} />
                    <input name="status" type="hidden" value="dismissed" />
                    <button className="text-button" type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Feature community decks</h2>
        <ul className="space-y-2">
          {featuredCandidates.rows.map((deck) => (
            <li
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              key={deck.id}
            >
              <span className="font-semibold">{deck.title}</span>
              <form action={adminSetFeaturedAction}>
                <input name="deckId" type="hidden" value={deck.id} />
                <input
                  name="featured"
                  type="hidden"
                  value={deck.is_featured ? "false" : "true"}
                />
                <button className="secondary-button" type="submit">
                  {deck.is_featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
