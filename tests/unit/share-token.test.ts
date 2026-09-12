import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalAuthCookie,
  isLocalAppHost,
  isLocalDevUnlimitedUser,
  verifyLocalAuthCookie,
} from "@/lib/auth-local";
import { isOllamaAvailable, normalizeLLMProvider } from "@/lib/types/flashcard";

import {
  clerkFrontendProxyUrl,
  clerkHostedAuthUrl,
  clerkJsScriptUrl,
  notebookHref,
  resolvePublicAppUrl,
  rewriteClerkProxySetCookie,
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

  it("opens the notebook after create instead of the library", async () => {
    expect(notebookHref("abc-123")).toBe("/decks/abc-123");
    expect(notebookHref("../phish")).toBe("/decks");
    const { readFile } = await import("node:fs/promises");
    const form = await readFile("components/create-deck-form.tsx", "utf8");
    expect(form).toMatch(/router\.push\(notebookHref\(result\.deckId\)\)/);
    expect(form).not.toMatch(/router\.push\("\/decks"\)/);
  });

  it("lays out source beside studio and keeps class links off the notebook", async () => {
    const { readFile } = await import("node:fs/promises");
    const notebook = await readFile("app/decks/[deckId]/page.tsx", "utf8");
    const studio = await readFile("components/notebook-studio.tsx", "utf8");
    const classPage = await readFile("app/decks/[deckId]/class/page.tsx", "utf8");
    expect(notebook).toMatch(/notebook-workspace/);
    expect(notebook).not.toMatch(/ClassLinkControls/);
    expect(notebook).not.toMatch(/Class scores/);
    expect(classPage).toMatch(/ClassLinkControls/);
    expect(studio).not.toMatch(/Boolean\(busyKind\)/);
    expect(studio).toMatch(/busyKinds\.has\(tile\.kind\)/);
    expect(notebook).toMatch(/ExamLaneChips/);
    expect(notebook).toMatch(/NotebookChat/);
    expect(notebook).not.toMatch(/Study unavailable — no cards yet/);
    const notes = await readFile("lib/llm/generate-notes.ts", "utf8");
    expect(notes).not.toMatch(/unless the output language is English/);
    expect(notes).toMatch(/Do not discuss these instructions/);
  });

  it("drops class-link assign from the landing hero", async () => {
    const { readFile } = await import("node:fs/promises");
    const landing = await readFile("messages/en.json", "utf8");
    expect(landing).toMatch(/Stay in the notebook/);
    expect(landing).not.toMatch(/assign them with a class link/);
    const page = await readFile("app/page.tsx", "utf8");
    expect(page).toMatch(/sit this paper in the notebook/);
    expect(page).not.toMatch(/Flip to reveal the answer/);
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

  it("keeps the Clerk proxy on http for localhost", () => {
    expect(clerkFrontendProxyUrl("https://localhost:3000")).toBe(
      "http://localhost:3000/__clerk",
    );
    expect(clerkJsScriptUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/__clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js?v=3.2.4",
    );
    expect(clerkFrontendProxyUrl("https://hkstudya.vercel.app")).toBe(
      "https://hkstudya.vercel.app/__clerk",
    );
  });

  it("rewrites Clerk proxy cookies onto the app host", () => {
    const session = rewriteClerkProxySetCookie(
      "__client=abc; Path=/; Domain=.frontend-api.clerk.dev; HttpOnly; Secure; SameSite=Lax",
      { https: true },
    );
    expect(session).toContain("__client=abc");
    expect(session).not.toMatch(/Domain=/i);
    expect(session).toMatch(/;\s*Secure/i);

    expect(
      rewriteClerkProxySetCookie(
        "__cf_bm=bot; Domain=.frontend-api.clerk.dev; Secure",
        { https: true },
      ),
    ).toBeNull();
  });
});

describe("localhost auth cookie", () => {
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it("allows localhost and loopback only when not on Vercel", async () => {
    delete process.env.VERCEL;
    expect(isLocalAppHost("localhost:3000")).toBe(true);
    expect(isLocalAppHost("127.0.0.1:3000")).toBe(true);
    expect(isLocalAppHost("hkstudya.vercel.app")).toBe(false);
    process.env.VERCEL = "1";
    expect(isLocalAppHost("localhost:3000")).toBe(false);
  });

  it("signs a cookie that verifies for local_dev only", async () => {
    const value = await createLocalAuthCookie("test-secret");
    expect(await verifyLocalAuthCookie(value, "test-secret")).toBe(true);
    expect(await verifyLocalAuthCookie(value, "other-secret")).toBe(false);
    expect(await verifyLocalAuthCookie(value.replace("local_dev", "user_1"), "test-secret")).toBe(
      false,
    );
  });

  it("gives local_dev unlimited energy off Vercel only", () => {
    delete process.env.VERCEL;
    expect(isLocalDevUnlimitedUser("local_dev")).toBe(true);
    expect(isLocalDevUnlimitedUser("user_1")).toBe(false);
    process.env.VERCEL = "1";
    expect(isLocalDevUnlimitedUser("local_dev")).toBe(false);
  });
});

describe("localhost ollama", () => {
  it("stays ollama instead of being rewritten to OpenRouter", () => {
    expect(normalizeLLMProvider("ollama")).toBe("ollama");
    expect(normalizeLLMProvider("openrouter")).toBe("openrouter");
  });

  it("is available only off Vercel when a base URL is set", () => {
    expect(isOllamaAvailable({ baseUrl: "http://127.0.0.1:11434" })).toBe(true);
    expect(isOllamaAvailable({ baseUrl: "http://127.0.0.1:11434", vercel: "1" })).toBe(
      false,
    );
    expect(isOllamaAvailable({})).toBe(false);
  });
});
