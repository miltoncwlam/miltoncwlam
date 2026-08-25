import { describe, expect, it } from "vitest";

import {
  resolvePublicAppUrl,
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
});
