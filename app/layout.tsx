import type { Metadata } from "next";
import { Fraunces, Inter, Montserrat } from "next/font/google";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import { AuthProviders } from "@/components/auth-providers";
import { BetaErrorRecorder } from "@/components/beta-error-recorder";
import { BetaFeedback } from "@/components/beta-feedback";
import { GenerationJobsProvider } from "@/components/generation-jobs";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { isLocalAppHost } from "@/lib/auth-local";
import { getSession } from "@/lib/auth-server";
import { BETA_COOKIE, hasV4BetaAccess } from "@/lib/beta";
import { env } from "@/lib/env";
import "./globals.css";

const display = Fraunces({
  variable: "--font-instrument",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
});

const sans = Inter({
  variable: "--font-dm",
  subsets: ["latin"],
});

const label = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "HK Study A · AI Flashcards",
    template: "%s · HK Study A",
  },
  description: "Turn notes and documents into interactive flashcards with AI.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const locale = await getLocale();
  const messages = await getMessages();
  const localDev = isLocalAppHost((await headers()).get("host"));
  const beta = hasV4BetaAccess((await cookies()).get(BETA_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme="light"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${label.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{localStorage.setItem("study-a-theme","light");}catch(e){}document.documentElement.dataset.theme="light";})();`}
        </Script>
        <ThemeProvider>
          <AuthProviders appUrl={env.NEXT_PUBLIC_APP_URL} skipClerk={localDev}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ToastProvider>
                <GenerationJobsProvider>
                <AppHeader localDev={localDev} session={session} />
                <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                {beta ? <BetaErrorRecorder /> : null}
                {beta ? <BetaFeedback /> : null}
                <SiteFooter />
                </GenerationJobsProvider>
              </ToastProvider>
            </NextIntlClientProvider>
          </AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
