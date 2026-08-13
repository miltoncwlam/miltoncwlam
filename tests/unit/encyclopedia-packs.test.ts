import { describe, expect, it } from "vitest";

import { COMMUNITY_SEED_PACKS } from "@/lib/data/community-packs";
import { ENCYCLOPEDIA_FEATURED_PACKS } from "@/lib/data/community-packs/encyclopedia-featured";
import { ENCYCLOPEDIA_GENERAL_PACKS } from "@/lib/data/community-packs/encyclopedia-general";

describe("encyclopedia community packs", () => {
  it("adds about 40 topic packs plus featured band variants", () => {
    expect(ENCYCLOPEDIA_FEATURED_PACKS).toHaveLength(15);
    expect(ENCYCLOPEDIA_GENERAL_PACKS.length).toBeGreaterThanOrEqual(20);
    expect(COMMUNITY_SEED_PACKS.length).toBeGreaterThanOrEqual(80);
  });

  it("gives featured topics three bands and shared art keys", () => {
    const solar = ENCYCLOPEDIA_FEATURED_PACKS.filter((pack) =>
      pack.slug.startsWith("ency-solar-"),
    );
    expect(solar.map((pack) => pack.gradeTag).sort()).toEqual(["p3", "s2", "s5"]);
    expect(solar.every((pack) => pack.featured)).toBe(true);
    const keys = new Set(
      solar.flatMap((pack) => pack.cards.map((card) => card.artKey)),
    );
    expect(keys.size).toBeGreaterThan(5);
    expect(solar[0]?.cards[0]?.artKey).toBe(solar[1]?.cards[0]?.artKey);
  });

  it("keeps general encyclopedia packs ungraded", () => {
    expect(ENCYCLOPEDIA_GENERAL_PACKS.every((pack) => !pack.gradeTag)).toBe(true);
  });
});
