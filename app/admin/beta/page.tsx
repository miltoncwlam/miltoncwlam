import Link from "next/link";

import { requireAdminSession } from "@/lib/auth-server";
import { listBetaReports } from "@/lib/data/beta-reports";

export default async function AdminBetaPage() {
  await requireAdminSession();
  const rows = await listBetaReports(150);

  return (
    <main className="page-shell">
      <Link className="text-button" href="/admin">
        ← Admin
      </Link>
      <h1 className="page-title mt-6 text-4xl">Version 4.0.0 beta</h1>
      <p className="page-subtitle">
        Comments, bug reports, and auto-recorded errors from the beta.
      </p>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Path</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-100 align-top" key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-semibold">{row.kind}</td>
                <td className="px-4 py-3">{row.path || "—"}</td>
                <td className="px-4 py-3">
                  <p>{row.message}</p>
                  {row.user_id ? (
                    <p className="mt-1 text-xs text-slate-500">{row.user_id}</p>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No beta reports yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
