import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClerkSignInPanel } from "@/components/clerk-auth-panel";
import { safeAppPath } from "@/lib/app-url";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const t = await getTranslations("auth");
  const params = await searchParams;
  const redirectTo = safeAppPath(params.redirect_url ?? params.next);
  const { userId } = await auth();
  if (userId) redirect(redirectTo);

  return (
    <main className="page-shell flex max-w-lg flex-col items-center">
      <p className="eyebrow">{t("signInEyebrow")}</p>
      <h1 className="page-title text-center">{t("signInTitle")}</h1>
      <p className="page-subtitle text-center">{t("signInSubtitle")}</p>
      <section className="mt-8 w-full max-w-md">
        <ClerkSignInPanel redirectTo={redirectTo} />
      </section>
    </main>
  );
}
