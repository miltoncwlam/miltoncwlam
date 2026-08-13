import { LegalBlocks, LegalPageShell } from "@/components/legal-page";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { legalValues, privacyBlocks } from "@/lib/legal";

export default function PrivacyPage() {
  const values = legalValues(LOCALE_COOKIE);
  return (
    <LegalPageShell titleKey="privacyTitle">
      <LegalBlocks blocks={privacyBlocks(values)} />
    </LegalPageShell>
  );
}
