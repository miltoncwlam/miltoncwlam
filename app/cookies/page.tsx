import { LegalBlocks, LegalPageShell } from "@/components/legal-page";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { cookieRows, cookiesBlocks, legalValues } from "@/lib/legal";

export default function CookiesPage() {
  const values = legalValues(LOCALE_COOKIE);
  const rows = cookieRows(values);

  return (
    <LegalPageShell titleKey="cookiesTitle">
      <LegalBlocks blocks={cookiesBlocks(values).slice(0, 2)} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-black text-slate-950">Cookie</th>
              <th className="py-2 pr-3 font-black text-slate-950">Purpose</th>
              <th className="py-2 font-black text-slate-950">How long</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-slate-100 align-top" key={row.name}>
                <td className="py-2 pr-3 font-mono text-xs">{row.name}</td>
                <td className="py-2 pr-3">{row.purpose}</td>
                <td className="py-2">{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LegalBlocks blocks={cookiesBlocks(values).slice(2)} />
    </LegalPageShell>
  );
}
