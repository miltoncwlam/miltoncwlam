import type { Metadata } from "next";
import { Fraunces, Inter, Montserrat } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import { AuthProviders } from "@/components/auth-providers";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { getSession } from "@/lib/auth-server";
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
          <AuthProviders appUrl={env.NEXT_PUBLIC_APP_URL}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ToastProvider>
                <AppHeader session={session} />
                <div className="flex-1">{children}</div>
                <SiteFooter />
              </ToastProvider>
            </NextIntlClientProvider>
          </AuthProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
