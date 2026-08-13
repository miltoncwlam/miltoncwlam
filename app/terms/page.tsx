import { LegalBlocks, LegalPageShell } from "@/components/legal-page";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { legalValues, termsBlocks } from "@/lib/legal";

export default function TermsPage() {
  const values = legalValues(LOCALE_COOKIE);
  return (
    <LegalPageShell titleKey="termsTitle">
      <LegalBlocks blocks={termsBlocks(values)} />
    </LegalPageShell>
  );
}
