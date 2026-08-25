import { describe, expect, it } from "vitest";

import {
  formatImageCredit,
  isPublicDomainOrCc0,
  licenseIsConfirmed,
} from "@/lib/images/license";
import {
  imageSearchQueryForCard,
  isAllowedImageMime,
  queryFallbacks,
  titleMatchScore,
} from "@/lib/images/search-licensed-image";

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

describe("image search queries", () => {
  it("ranks Commons titles by overlap with the query", () => {
    expect(titleMatchScore("File:Mars Hubble.jpg", "Mars planet")).toBeGreaterThan(
      titleMatchScore("File:Random street.jpg", "Mars planet"),
    );
    expect(titleMatchScore("File:Random street.jpg", "Mars planet")).toBe(0);
    expect(queryFallbacks("Saturn rings photo")[0]).toBe("Saturn rings photo");
  });

  it("never uses a long question as the search query", () => {
    expect(
      imageSearchQueryForCard({
        front: "What is the fourth planet from the Sun?",
        back: "Mars",
      }),
    ).toBe("Mars");
    expect(
      imageSearchQueryForCard({
        imageSearchQuery: "What is photosynthesis?",
        front: "What is photosynthesis?",
        back: "The process plants use to make food from sunlight",
      }),
    ).toBeNull();
    expect(
      imageSearchQueryForCard({
        imageSearchQuery: "Mars planet",
        front: "What is the fourth planet from the Sun?",
        back: "Mars",
      }),
    ).toBe("Mars planet");
    expect(
      imageSearchQueryForCard({
        artKey: "ency-solar/mars",
        front: "What is the fourth planet from the Sun?",
        back: "The red planet that is fourth from the Sun in our solar system",
      }),
    ).toBe("mars");
  });
});
