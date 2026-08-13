import Link from "next/link";

import { requireAdminSession } from "@/lib/auth-server";
import { listCreditLedger } from "@/lib/data/credits";

export default async function AdminEnergyPage() {
  await requireAdminSession();
  const rows = await listCreditLedger(200);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-10">
      <header className="space-y-2">
        <Link className="text-sm font-semibold text-indigo-700" href="/admin">
          ← Admin
        </Link>
        <h1 className="text-3xl font-black tracking-tight">Energy ledger</h1>
        <p className="text-slate-600">Recent grants, spends, and admin adjustments.</p>
      </header>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Delta</th>
              <th className="px-4 py-3">Pool</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-slate-100" key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {row.created_at.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-4 py-3">{row.email ?? row.user_id}</td>
                <td className="px-4 py-3 font-semibold">{row.delta}</td>
                <td className="px-4 py-3">{row.pool}</td>
                <td className="px-4 py-3">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
