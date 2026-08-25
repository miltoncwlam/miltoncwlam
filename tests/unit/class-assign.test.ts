import { describe, expect, it } from "vitest";

import {
  activityFromQuery,
  classAssignFromQuery,
  classInviteSearch,
  classJoinPath,
  playAssignSearch,
} from "@/lib/play/activity";

describe("class assignment query", () => {
  it("parses activity, due, lock, and class id", () => {
    expect(activityFromQuery("quiz")).toBeNull();
    expect(activityFromQuery("match-up")).toBe("match-up");
    expect(
      classAssignFromQuery({
        activity: "match-up",
        due: "1",
        lock: "1",
        class: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      activity: "match-up",
      dueOnly: true,
      locked: true,
      classLinkId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("ignores lock without an activity and bad class ids", () => {
    expect(classAssignFromQuery({ lock: "1", class: "nope" })).toEqual({
      activity: null,
      dueOnly: false,
      locked: false,
      classLinkId: null,
    });
  });

  it("builds invite and join URLs", () => {
    const assign = classAssignFromQuery({
      activity: "whack-a-mole",
      due: "1",
      lock: "1",
    });
    expect(classInviteSearch(assign)).toBe(
      "?activity=whack-a-mole&due=1&lock=1",
    );
    expect(
      classJoinPath("22222222-2222-4222-8222-222222222222", {
        ...assign,
        classLinkId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(
      "/decks/22222222-2222-4222-8222-222222222222/play/matching-pairs?due=1&lock=1&class=11111111-1111-4111-8111-111111111111",
    );
  });

  it("sends any-play joins to the activity picker with due cards", () => {
    const assign = classAssignFromQuery({ due: "1" });
    expect(classInviteSearch(assign)).toBe("?due=1");
    expect(classJoinPath("deck-1", assign)).toBe("/decks/deck-1/play?due=1");
    expect(playAssignSearch({ dueOnly: true, classLinkId: "abc" })).toBe(
      "?due=1&class=abc",
    );
  });
});
