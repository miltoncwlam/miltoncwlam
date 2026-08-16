import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android WebView shell only. `server.url` is the live site, so a Vercel
 * deploy updates every installed APK without a new download. Rebuild the
 * APK only for native changes (icons, permissions, app id, this config).
 */
const config: CapacitorConfig = {
  appId: "app.hkstudya",
  appName: "HK Study A",
  webDir: "www",
  server: {
    url: process.env.CAPACITOR_SERVER_URL?.trim() || "https://hkstudya.vercel.app",
    androidScheme: "https",
    allowNavigation: [
      "hkstudya.vercel.app",
      "*.vercel.app",
      "*.clerk.accounts.dev",
      "*.clerk.com",
      "*.accounts.dev",
      "*.supabase.co",
      "accounts.google.com",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f172a",
  },
};

export default config;
