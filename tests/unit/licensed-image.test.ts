import { describe, expect, it } from "vitest";

import {
  formatImageCredit,
  isPublicDomainOrCc0,
  licenseIsConfirmed,
} from "@/lib/images/license";
import { isAllowedImageMime } from "@/lib/images/search-licensed-image";

describe("licenseIsConfirmed", () => {
  it("accepts CC0 and public domain without an artist", () => {
    expect(licenseIsConfirmed({ license: "CC0" })).toBe(true);
    expect(licenseIsConfirmed({ license: "Public Domain" })).toBe(true);
    expect(isPublicDomainOrCc0("pdm")).toBe(true);
  });

  it("accepts CC BY only with artist and license URL", () => {
    expect(
      licenseIsConfirmed({
        license: "CC BY 4.0",
        artist: "Ada",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      }),
    ).toBe(true);
    expect(
      licenseIsConfirmed({
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      }),
    ).toBe(false);
  });

  it("rejects NC, fair use, and missing license", () => {
    expect(licenseIsConfirmed({ license: "CC BY-NC 4.0", artist: "Ada" })).toBe(
      false,
    );
    expect(licenseIsConfirmed({ license: "fair use" })).toBe(false);
    expect(licenseIsConfirmed({ license: "" })).toBe(false);
  });

  it("allows jpeg/png/webp only for storage", () => {
    expect(isAllowedImageMime("image/jpeg")).toBe(true);
    expect(isAllowedImageMime("image/png; charset=binary")).toBe(true);
    expect(isAllowedImageMime("image/gif")).toBe(false);
    expect(isAllowedImageMime("image/svg+xml")).toBe(false);
  });

  it("formats credits", () => {
    expect(
      formatImageCredit({
        source: "commons",
        license: "CC0",
        author: "NASA",
      }),
    ).toBe("NASA · CC0");
    expect(
      formatImageCredit({ source: "ai", license: "AI-generated" }),
    ).toBe("AI-generated");
  });
});
