import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AppHeader } from "@/components/app-header";
import { AuthProviders } from "@/components/auth-providers";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { clerkAuthConfigured, getSession } from "@/lib/auth-server";
import "./globals.css";

const display = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Study A · AI Flashcards",
    template: "%s · Study A",
  },
  description: "Turn notes, documents, and photos into interactive flashcards.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const locale = await getLocale();
  const messages = await getMessages();
  const clerkEnabled = clerkAuthConfigured();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("study-a-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <AuthProviders clerkEnabled={clerkEnabled}>
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
