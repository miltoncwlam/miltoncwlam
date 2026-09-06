import { describe, expect, it } from "vitest";

import {
  clerkHostedAuthUrl,
  resolvePublicAppUrl,
  safeAppPath,
  withBrowserOrigin,
} from "@/lib/app-url";
import {
  createShareToken,
  hashShareToken,
} from "@/lib/security/share-token";

describe("share tokens", () => {
  it("creates high-entropy URL-safe tokens", () => {
    const first = createShareToken();
    const second = createShareToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(second).not.toBe(first);
  });

  it("hashes deterministically without retaining the token", () => {
    const token = "private-token";
    const hash = hashShareToken(token);

    expect(hash).toHaveLength(64);
    expect(hashShareToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });
});

describe("public app urls", () => {
  it("keeps a configured production url", () => {
    expect(resolvePublicAppUrl("https://hkstudya.vercel.app")).toBe(
      "https://hkstudya.vercel.app",
    );
  });

  it("replaces localhost with the Vercel production host", () => {
    expect(
      resolvePublicAppUrl("http://localhost:3000", {
        env: "production",
        productionUrl: "hkstudya.vercel.app",
        url: "hkstudya-git-preview.vercel.app",
      }),
    ).toBe("https://hkstudya.vercel.app");
  });

  it("rewrites a copied localhost share link to the current origin", () => {
    expect(
      withBrowserOrigin(
        "http://localhost:3000/share/abc",
        "https://hkstudya.vercel.app",
      ),
    ).toBe("https://hkstudya.vercel.app/share/abc");
  });

  it("only allows in-app paths after sign-in", () => {
    expect(safeAppPath("/decks")).toBe("/decks");
    expect(safeAppPath("/decks/abc")).toBe("/decks/abc");
    expect(safeAppPath("https://evil.example/phish")).toBe("/decks");
    expect(safeAppPath("//evil.example")).toBe("/decks");
  });

  it("sends sign-in to Clerk Account Portal with an absolute return url", () => {
    const key =
      "pk_test_" +
      Buffer.from("premium-fawn-7.clerk.accounts.dev$").toString("base64");
    expect(
      clerkHostedAuthUrl(
        "sign-in",
        "https://hkstudya.vercel.app/decks",
        key,
      ),
    ).toBe(
      "https://premium-fawn-7.accounts.dev/sign-in?redirect_url=https%3A%2F%2Fhkstudya.vercel.app%2Fdecks",
    );
  });

  it("sends live keys to the production Account Portal host", () => {
    const key =
      "pk_live_" +
      Buffer.from("clerk.hkstudya.vercel.app$").toString("base64");
    expect(
      clerkHostedAuthUrl(
        "sign-in",
        "http://localhost:3000/decks",
        key,
      ),
    ).toBe(
      "https://accounts.hkstudya.vercel.app/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fdecks",
    );
  });
});
