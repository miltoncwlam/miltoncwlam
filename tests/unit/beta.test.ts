import { describe, expect, it } from "vitest";

import {
  BETA_COOKIE,
  BETA_VERSION,
  STABLE_VERSION,
  displayAppVersion,
  hasV4BetaAccess,
  isVercelPreviewEnv,
  persistBetaChoice,
} from "@/lib/beta";

describe("v4 beta gate", () => {
  it("shows 3.9.3 until persist-enter, a session header, or a Vercel preview", () => {
    expect(STABLE_VERSION).toBe("3.9.3");
    expect(BETA_VERSION).toBe("4.0.0 beta");
    expect(BETA_COOKIE).toBe("hkstudya-beta");
    expect(displayAppVersion(false)).toBe("3.9.3");
    expect(displayAppVersion(true)).toBe("4.0.0 beta");
    expect(persistBetaChoice(undefined)).toBe(null);
    expect(persistBetaChoice("1")).toBe("enter");
    expect(persistBetaChoice("enter")).toBe("enter");
    expect(persistBetaChoice("hide")).toBe("hide");
    expect(hasV4BetaAccess(undefined, "production")).toBe(false);
    expect(hasV4BetaAccess("hide", "production")).toBe(false);
    expect(hasV4BetaAccess("1", "production")).toBe(true);
    expect(hasV4BetaAccess("enter", "production")).toBe(true);
    expect(hasV4BetaAccess(undefined, "production", "1")).toBe(true);
    expect(hasV4BetaAccess(undefined, "preview")).toBe(true);
    expect(isVercelPreviewEnv("preview")).toBe(true);
    expect(isVercelPreviewEnv("production")).toBe(false);
  });

  it("does not set a cookie from /beta", async () => {
    const { readFile } = await import("node:fs/promises");
    const page = await readFile("app/beta/page.tsx", "utf8");
    expect(page).toMatch(/enterBetaSession/);
    expect(page).not.toMatch(/cookies\.set/);
  });

  it("keeps one Version 4.0.0 beta heading in the changelog", async () => {
    const { readFile } = await import("node:fs/promises");
    const changelog = await readFile("CHANGELOG.md", "utf8");
    expect(changelog).toMatch(/## Version 4.0.0 beta/);
    expect(changelog).not.toMatch(/## Version 4.0.1/);
    expect(changelog).not.toMatch(/## Version 4.0.2/);
  });
});

describe("beta reports", () => {
  it("fingerprints and ignores noisy browser errors", async () => {
    const {
      betaFingerprint,
      isBetaReportKind,
      shouldIgnoreBetaError,
    } = await import("@/lib/beta-report");
    expect(isBetaReportKind("bug")).toBe(true);
    expect(isBetaReportKind("toast")).toBe(false);
    expect(shouldIgnoreBetaError("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(shouldIgnoreBetaError("Cannot read properties of undefined")).toBe(false);
    expect(betaFingerprint("error", "x", "/decks")).toBe(
      betaFingerprint("error", "x", "/decks"),
    );
    expect(betaFingerprint("error", "x", "/decks")).not.toBe(
      betaFingerprint("bug", "x", "/decks"),
    );
  });
});
