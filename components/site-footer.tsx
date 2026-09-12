import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { LEGAL } from "@/lib/legal";
import {
  BETA_COOKIE,
  displayAppVersion,
  hasV4BetaAccess,
} from "@/lib/beta";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const version = displayAppVersion(
    hasV4BetaAccess((await cookies()).get(BETA_COOKIE)?.value),
  );

  return (
    <footer className="site-footer mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--ink)]">
          © {new Date().getFullYear()} {LEGAL.productName}.{" "}
          <span className="app-version">Version {version}</span>
          {" · "}
          {t("rights")}
        </p>
        <nav className="site-footer-nav flex flex-wrap gap-4 font-sans text-[13px] font-medium">
          <Link className="link-accent" href="/privacy">
            {t("privacy")}
          </Link>
          <Link className="link-accent" href="/terms">
            {t("terms")}
          </Link>
          <Link className="link-accent" href="/cookies">
            {t("cookies")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
