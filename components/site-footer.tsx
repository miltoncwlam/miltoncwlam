import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LEGAL } from "@/lib/legal";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="site-footer mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} {LEGAL.productName}. {t("rights")}
        </p>
        <nav className="site-footer-nav flex flex-wrap gap-4 text-sm font-semibold">
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
