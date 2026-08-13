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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" required type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input defaultValue="Learner" id="name" name="name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Temp password</Label>
            <Input id="password" minLength={8} name="password" required type="text" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="periodGrant">Weekly text energy</Label>
            <Input defaultValue={600} id="periodGrant" min={0} name="periodGrant" type="number" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imagePeriodGrant">Weekly image energy</Label>
            <Input defaultValue={0} id="imagePeriodGrant" min={0} name="imagePeriodGrant" type="number" />
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
            <input name="isUnlimited" type="checkbox" />
            Unlimited energy
          </label>
          <Button className="sm:col-span-2" type="submit">
            Create account
          </Button>
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
                    {user.name} · {user.role ?? "user"} · text{" "}
                    {user.is_unlimited ? "unlimited" : (user.balance ?? 0)} ·
                    images{" "}
                    {user.is_unlimited ? "unlimited" : (user.image_balance ?? 0)}
                  </p>
                </div>
              </div>
              <form
                action={adminUpdateEnergyAction}
                className="mt-3 grid gap-2 sm:grid-cols-3"
              >
                <input name="userId" type="hidden" value={user.id} />
                <label className="block space-y-1">
                  <span className="text-xs font-bold">Text grant</span>
                  <Input
                    defaultValue={user.period_grant ?? 600}
                    name="periodGrant"
                    type="number"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold">Image grant</span>
                  <Input
                    defaultValue={user.image_period_grant ?? 0}
                    name="imagePeriodGrant"
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
                <label className="block space-y-1">
                  <span className="text-xs font-bold">Text balance</span>
                  <Input
                    defaultValue={user.balance ?? 600}
                    name="balance"
                    type="number"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold">Image balance</span>
                  <Input
                    defaultValue={user.image_balance ?? 0}
                    name="imageBalance"
                    type="number"
                  />
                </label>
                <Button className="mt-5" type="submit" variant="secondary">
                  Save
                </Button>
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
                    <Button type="submit" variant="secondary">
                      Resolve
                    </Button>
                  </form>
                  <form action={adminResolveReportAction}>
                    <input name="reportId" type="hidden" value={report.id} />
                    <input name="status" type="hidden" value="dismissed" />
                    <Button type="submit" variant="ghost">
                      Dismiss
                    </Button>
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
                <Button type="submit" variant="secondary">
                  {deck.is_featured ? "Unfeature" : "Feature"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
