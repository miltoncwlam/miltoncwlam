import { describe, expect, it } from "vitest";

import {
  BETA_COOKIE,
  BETA_VERSION,
  GA_VERSION,
  STABLE_VERSION,
  V41_VERSION,
  V42_VERSION,
  V43_VERSION,
  V44_VERSION,
  displayAppVersion,
  hasV4BetaAccess,
  isVercelPreviewEnv,
  persistBetaChoice,
} from "@/lib/beta";
import {
  CAMPAIGN_ENDS_AT,
  FREE_MODEL_CAMPAIGN_RATE,
  V41_RELEASES_AT,
  V42_RELEASES_AT,
  V43_RELEASES_AT,
  V44_RELEASES_AT,
  isFreeModelCampaignActive,
  isV4GenerallyAvailable,
  isV41Released,
  isV42Released,
  isV43Released,
  isV44Released,
} from "@/lib/campaign";

const DURING_CAMPAIGN = Date.UTC(2026, 8, 13, 3, 0, 0);

describe("v4 beta gate", () => {
  it("shows 3.9.3 until persist-enter, a session header, or a Vercel preview", () => {
    expect(STABLE_VERSION).toBe("3.9.3");
    expect(BETA_VERSION).toBe("4.0.0 beta");
    expect(GA_VERSION).toBe("4.0.0");
    expect(V41_VERSION).toBe("4.1.0");
    expect(V42_VERSION).toBe("4.2.0");
    expect(V43_VERSION).toBe("4.3.0");
    expect(V44_VERSION).toBe("4.4.0");
    expect(BETA_COOKIE).toBe("hkstudya-beta");
    expect(displayAppVersion(false, DURING_CAMPAIGN)).toBe("3.9.3");
    expect(displayAppVersion(true, DURING_CAMPAIGN)).toBe("4.0.0 beta");
    expect(persistBetaChoice(undefined)).toBe(null);
    expect(persistBetaChoice("1")).toBe("enter");
    expect(persistBetaChoice("enter")).toBe("enter");
    expect(persistBetaChoice("hide")).toBe("hide");
    expect(hasV4BetaAccess(undefined, "production", null, DURING_CAMPAIGN)).toBe(
      false,
    );
    expect(hasV4BetaAccess("hide", "production", null, DURING_CAMPAIGN)).toBe(
      false,
    );
    expect(hasV4BetaAccess("1", "production", null, DURING_CAMPAIGN)).toBe(true);
    expect(hasV4BetaAccess("enter", "production", null, DURING_CAMPAIGN)).toBe(
      true,
    );
    expect(hasV4BetaAccess(undefined, "production", "1", DURING_CAMPAIGN)).toBe(
      true,
    );
    expect(hasV4BetaAccess(undefined, "preview", null, DURING_CAMPAIGN)).toBe(true);
    expect(isVercelPreviewEnv("preview")).toBe(true);
    expect(isVercelPreviewEnv("production")).toBe(false);
  });

  it("leaves beta when the free-model campaign ends", () => {
    expect(CAMPAIGN_ENDS_AT).toBe(Date.UTC(2026, 8, 23, 0, 0, 0));
    expect(FREE_MODEL_CAMPAIGN_RATE).toBe(0.6);
    expect(isFreeModelCampaignActive(Date.UTC(2026, 8, 22, 23, 59, 59))).toBe(
      true,
    );
    expect(isFreeModelCampaignActive(CAMPAIGN_ENDS_AT)).toBe(false);
    expect(isV4GenerallyAvailable(CAMPAIGN_ENDS_AT)).toBe(true);
    expect(hasV4BetaAccess(undefined, "production", null, CAMPAIGN_ENDS_AT)).toBe(
      true,
    );
    expect(displayAppVersion(false, CAMPAIGN_ENDS_AT)).toBe("4.0.0");
    expect(displayAppVersion(true, CAMPAIGN_ENDS_AT)).toBe("4.0.0");
  });

  it("flips the header to 4.1.0 on 25 Sep 2026 10:00 UTC", () => {
    expect(V41_RELEASES_AT).toBe(Date.UTC(2026, 8, 25, 10, 0, 0));
    expect(isV41Released(Date.UTC(2026, 8, 25, 9, 59, 59))).toBe(false);
    expect(isV41Released(V41_RELEASES_AT)).toBe(true);
    expect(displayAppVersion(false, Date.UTC(2026, 8, 25, 9, 59, 59))).toBe(
      "4.0.0",
    );
    expect(displayAppVersion(false, V41_RELEASES_AT)).toBe("4.1.0");
    expect(displayAppVersion(true, V41_RELEASES_AT)).toBe("4.1.0");
  });

  it("flips the header to 4.2.0 on 13 Oct 2026 10:00 UTC", () => {
    expect(V42_RELEASES_AT).toBe(Date.UTC(2026, 9, 13, 10, 0, 0));
    expect(isV42Released(Date.UTC(2026, 9, 13, 9, 59, 59))).toBe(false);
    expect(isV42Released(V42_RELEASES_AT)).toBe(true);
    expect(displayAppVersion(false, Date.UTC(2026, 9, 13, 9, 59, 59))).toBe(
      "4.1.0",
    );
    expect(displayAppVersion(false, V42_RELEASES_AT)).toBe("4.2.0");
    expect(displayAppVersion(true, V42_RELEASES_AT)).toBe("4.2.0");
  });

  it("flips the header to 4.3.0 on 31 Oct 2026 10:00 UTC", () => {
    expect(V43_RELEASES_AT).toBe(Date.UTC(2026, 9, 31, 10, 0, 0));
    expect(isV43Released(Date.UTC(2026, 9, 31, 9, 59, 59))).toBe(false);
    expect(isV43Released(V43_RELEASES_AT)).toBe(true);
    expect(displayAppVersion(false, Date.UTC(2026, 9, 31, 9, 59, 59))).toBe(
      "4.2.0",
    );
    expect(displayAppVersion(false, V43_RELEASES_AT)).toBe("4.3.0");
    expect(displayAppVersion(true, V43_RELEASES_AT)).toBe("4.3.0");
  });

  it("flips the header to 4.4.0 on 18 Nov 2026 10:00 UTC", () => {
    expect(V44_RELEASES_AT).toBe(Date.UTC(2026, 10, 18, 10, 0, 0));
    expect(isV44Released(Date.UTC(2026, 10, 18, 9, 59, 59))).toBe(false);
    expect(isV44Released(V44_RELEASES_AT)).toBe(true);
    expect(displayAppVersion(false, Date.UTC(2026, 10, 18, 9, 59, 59))).toBe(
      "4.3.0",
    );
    expect(displayAppVersion(false, V44_RELEASES_AT)).toBe("4.4.0");
    expect(displayAppVersion(true, V44_RELEASES_AT)).toBe("4.4.0");
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

describe("legal pages", () => {
  it("describes the notebook, guest trial, and cookies without calling models free", async () => {
    const {
      LEGAL,
      cookieRows,
      cookiesBlocks,
      legalValues,
      privacyBlocks,
      termsBlocks,
    } = await import("@/lib/legal");
    const values = legalValues("NEXT_LOCALE");
    const flatten = (
      blocks: { paragraphs: string[]; bullets?: string[] }[],
    ) =>
      blocks
        .flatMap((block) => [...block.paragraphs, ...(block.bullets ?? [])])
        .join("\n");
    const privacy = flatten(privacyBlocks(values));
    const terms = flatten(termsBlocks(values));
    const cookies = [
      flatten(cookiesBlocks(values)),
      ...cookieRows(values).map((row) => `${row.name} ${row.purpose}`),
    ].join("\n");
    const all = `${privacy}\n${terms}\n${cookies}`;

    expect(LEGAL.lastUpdated).toBe("13 September 2026");
    expect(privacy).toMatch(/study notebook/i);
    expect(privacy).toMatch(/notebook chat/i);
    expect(privacy).toMatch(/hk_guest_uid/);
    expect(privacy).toMatch(/HKDSE/);
    expect(privacy).toMatch(/hashed IP/i);
    expect(terms).toMatch(/Try as guest/);
    expect(terms).toMatch(/60% energy/);
    expect(terms).toMatch(/notebook chat/i);
    expect(cookies).toMatch(/hk_guest_uid/);
    expect(cookies).toMatch(/hkstudya-beta/);
    expect(cookies).toMatch(/hkstudya-beta-session/);
    expect(cookieRows(values).map((row) => row.name)).toEqual(
      expect.arrayContaining(["hk_guest_uid", "hkstudya-beta", "NEXT_LOCALE"]),
    );
    expect(all).not.toMatch(/free model/i);
    expect(all).not.toMatch(/:free\b/);
    expect(all).not.toMatch(/OpenRouter free/i);
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
