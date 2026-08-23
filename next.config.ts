import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Dev HMR when a tab is opened on the other loopback host
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["@napi-rs/canvas", "unpdf", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/city/:path*", destination: "/decks", permanent: false },
      { source: "/play-lab", destination: "/decks", permanent: false },
      {
        source: "/decks/:deckId/play/:path*",
        destination: "/decks/:deckId",
        permanent: false,
      },
      {
        source: "/decks/:deckId/play",
        destination: "/decks/:deckId",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
