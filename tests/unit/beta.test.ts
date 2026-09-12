import { describe, expect, it } from "vitest";

import {
  BETA_COOKIE,
  BETA_VERSION,
  STABLE_VERSION,
  displayAppVersion,
  hasV4BetaAccess,
  isVercelPreviewEnv,
} from "@/lib/beta";

describe("v4 beta gate", () => {
  it("shows 3.9.3 until the beta cookie or a Vercel preview", () => {
    expect(STABLE_VERSION).toBe("3.9.3");
    expect(BETA_VERSION).toBe("4.0.0");
    expect(BETA_COOKIE).toBe("hkstudya-beta");
    expect(displayAppVersion(false)).toBe("3.9.3");
    expect(displayAppVersion(true)).toBe("4.0.0");
    expect(hasV4BetaAccess(undefined, "production")).toBe(false);
    expect(hasV4BetaAccess("1", "production")).toBe(true);
    expect(hasV4BetaAccess(undefined, "preview")).toBe(true);
    expect(isVercelPreviewEnv("preview")).toBe(true);
    expect(isVercelPreviewEnv("production")).toBe(false);
  });
});
