import { describe, expect, it } from "vitest";

import { parseChatMakeIntent } from "@/lib/llm/chat-intent";
import { chatRepliesInTraditionalChinese } from "@/lib/llm/chat-language";
import { CHAT_OPENROUTER_MODEL } from "@/lib/llm/models";

describe("notebook chat", () => {
  it("pins chat to DeepSeek 0731 and never Qwen or V4.1", async () => {
    const { readFile } = await import("node:fs/promises");
    expect(CHAT_OPENROUTER_MODEL).toBe("deepseek/deepseek-v4-flash-0731");
    const route = await readFile("app/api/decks/[deckId]/chat/route.ts", "utf8");
    const prompt = await readFile("lib/llm/notebook-chat.ts", "utf8");
    expect(route).toMatch(/CHAT_OPENROUTER_MODEL/);
    expect(route).not.toMatch(/DEFAULT_OPENROUTER_MODEL/);
    expect(route).not.toMatch(/qwen/i);
    expect(route).not.toMatch(/v4\.1/);
    expect(prompt).toMatch(/CHAT_OPENROUTER_MODEL/);
    expect(prompt).not.toMatch(/qwen/i);
    expect(prompt).not.toMatch(/v4\.1/);
    expect(prompt).not.toMatch(/DEFAULT_OPENROUTER_MODEL/);
    expect(prompt).not.toMatch(/openrouter\/auto/);
    expect(prompt).toMatch(/chatRepliesInTraditionalChinese/);
    expect(prompt).not.toMatch(/examSystem === "dse"/);
  });

  it("keeps an English notebook in English even when the source has Chinese", () => {
    const source = "Photosynthesis converts light. 葉綠素 absorbs sunlight. " + "x".repeat(20);
    expect(
      chatRepliesInTraditionalChinese({ language: "en", source }),
    ).toBe(false);
    expect(
      chatRepliesInTraditionalChinese({ language: "zh-Hant", source: "Photosynthesis only." }),
    ).toBe(true);
    expect(
      chatRepliesInTraditionalChinese({
        source: "光合作用把光能轉成化學能。葉綠素吸收陽光。植物需要水和二氧化碳。",
      }),
    ).toBe(true);
  });

  it("strips a MAKE line from the tutor reply", () => {
    expect(parseChatMakeIntent("Glucose is stored as starch.\nMAKE: cards")).toEqual({
      reply: "Glucose is stored as starch.",
      make: "cards",
    });
    expect(parseChatMakeIntent("I cannot tell from this source.")).toEqual({
      reply: "I cannot tell from this source.",
      make: null,
    });
  });
});
