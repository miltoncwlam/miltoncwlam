import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import { AuthProviders } from "@/components/auth-providers";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { getSession } from "@/lib/auth-server";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const sans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "HK Study A · AI Flashcards",
    template: "%s · HK Study A",
  },
  description: "A Sayo Academy study tool. Turn notes and documents into interactive flashcards.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("study-a-theme");if(t!=="dark"&&t!=="light"){t="dark";}document.documentElement.dataset.theme=t;}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          <AuthProviders>
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
