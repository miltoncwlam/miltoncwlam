import Link from "next/link";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth-server";
import { listAuditLog } from "@/lib/data/audit";

export default async function AdminAuditPage() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/decks");
  const rows = await listAuditLog(150);

  return (
    <main className="page-shell">
      <Link className="text-button" href="/admin">
        ← Admin
      </Link>
      <h1 className="page-title mt-6 text-4xl">Audit log</h1>
      <p className="page-subtitle">
        Shares, generates, and other sensitive actions.
      </p>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-100" key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">{row.email || row.user_id || "—"}</td>
                <td className="px-4 py-3 font-semibold">{row.action}</td>
                <td className="px-4 py-3">
                  {row.entity_type}:{row.entity_id?.slice(0, 8)}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No audit events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
