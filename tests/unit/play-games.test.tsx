/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayDispatcher } from "@/components/play/play-dispatcher";
import { ENCYCLOPEDIA_FEATURED_PACKS } from "@/lib/data/community-packs/encyclopedia-featured";
import { ENCYCLOPEDIA_GENERAL_PACKS } from "@/lib/data/community-packs/encyclopedia-general";
import { PLAY_CATALOG_IDS, type PlayTemplateId } from "@/lib/play/templates";
import { templateReason } from "@/lib/play/eligibility";
import type { CommunitySeedPack } from "@/lib/data/community-packs/types";
import type { Flashcard } from "@/lib/types/flashcard";

import en from "../../messages/en.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/games", () => ({
  startGameRunAction: vi.fn(async () => ({
    ok: true,
    stake: 20,
    clientKey: "11111111-1111-4111-8111-111111111111",
  })),
  completeGameRunAction: vi.fn(async () => ({
    ok: true,
    stake: 20,
    payout: 40,
    net: 20,
  })),
  gradeTypedAnswerAction: vi.fn(async ({ typed }: { typed: string }) => ({
    ok: typed.trim().length > 0,
    why: "Accepted as equivalent.",
    source: "ai",
  })),
}));

function asCards(pack: CommunitySeedPack, withImages = true): Flashcard[] {
  return pack.cards.map((card, index) => ({
    id: `${pack.slug}-${index}`,
    deckId: "11111111-1111-4111-8111-111111111111",
    front: card.front,
    back: card.back,
    hint: card.hint ?? null,
    category: card.category ?? null,
    cardType: card.type ?? "qa",
    options: card.options ?? null,
    imageUrl: withImages ? `https://example.com/${card.artKey ?? index}.jpg` : null,
    imageAttribution: null,
    sortOrder: index,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

const solar = ENCYCLOPEDIA_FEATURED_PACKS.find(
  (pack) => pack.slug === "ency-solar-primary",
)!;
const magnets = ENCYCLOPEDIA_GENERAL_PACKS.find(
  (pack) => pack.slug === "ency-magnets",
)!;

const cards = [
  ...asCards(solar, true),
  ...asCards(magnets, true).map((card) => ({
    ...card,
    id: `mix-${card.id}`,
  })),
];

const live: { root: Root; node: HTMLDivElement }[] = [];

async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mount(template: PlayTemplateId) {
  const node = document.createElement("div");
  document.body.appendChild(node);
  const root = createRoot(node);
  live.push({ root, node });
  await act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PlayDispatcher cards={cards} deckId={cards[0]!.deckId} template={template} />
      </NextIntlClientProvider>,
    );
  });
  for (let i = 0; i < 12; i += 1) {
    await settle();
    if (!node.textContent?.includes("Anteing")) break;
  }
  return node;
}

function enabledButtons(node: HTMLElement) {
  return [...node.querySelectorAll("button")].filter(
    (button) => !(button as HTMLButtonElement).disabled,
  );
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function finished(node: HTMLElement) {
  const text = node.textContent ?? "";
  return /You won|Round over|Stage clear/.test(text);
}

async function playRound(template: PlayTemplateId, node: HTMLElement) {
  for (let step = 0; step < 220; step += 1) {
    await settle();
    if (finished(node)) return;
    const buttons = enabledButtons(node);
    const cont = buttons.find((button) => button.textContent === "Continue");
    if (cont) {
      if (template === "type-the-answer") {
        expect(node.textContent ?? "").toMatch(/AI accepted|Exact match|Miss/);
      }
      click(cont);
      continue;
    }
    const check = buttons.find((button) =>
      /^(Check|Check crossword|Check order|Reveal|I got it)$/.test(
        button.textContent ?? "",
      ),
    );
    const input = node.querySelector("input:not([disabled])") as
      | HTMLInputElement
      | null;
    if (input && template === "type-the-answer") {
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "mars");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const submit = buttons.find((button) => button.textContent === "Check");
      if (submit) click(submit);
      continue;
    }
    if (input && (template === "crossword" || template === "rank-order")) {
      if (template === "crossword") {
        act(() => {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          setter?.call(input, "SUN");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }
      if (check) {
        click(check);
        continue;
      }
    }
    if (check && template !== "spell-the-word" && template !== "unjumble") {
      click(check);
      continue;
    }
    const hole = node.querySelector(".play-hole") as HTMLButtonElement | null;
    if (hole && !hole.disabled) {
      click(hole);
      await wait(450);
      continue;
    }
    const balloon = node.querySelector(".play-balloon-btn") as HTMLButtonElement | null;
    if (balloon) {
      click(balloon);
      await wait(420);
      continue;
    }
    const chest = node.querySelector(".play-chest-btn") as HTMLButtonElement | null;
    if (chest && !chest.disabled) {
      click(chest);
      continue;
    }
    const flip = node.querySelector(".play-flip:not(:disabled)") as HTMLButtonElement | null;
    if (flip) {
      click(flip);
      const second = node.querySelectorAll(".play-flip:not(:disabled)")[1] as
        | HTMLButtonElement
        | undefined;
      if (second) click(second);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      continue;
    }
    const polaroid = node.querySelector(".play-polaroid:not(:disabled)") as
      | HTMLButtonElement
      | null;
    const chip = node.querySelector(".play-chip:not(:disabled)") as HTMLButtonElement | null;
    if (polaroid && chip) {
      click(polaroid);
      click(chip);
      continue;
    }
    const key = node.querySelector(".play-key:not(:disabled)") as HTMLButtonElement | null;
    if (key && (template === "spell-the-word" || template === "unjumble")) {
      for (const letter of enabledButtons(node).filter((button) =>
        button.classList.contains("play-key"),
      )) {
        click(letter);
      }
      const submit = enabledButtons(node).find(
        (button) => button.textContent === "Check",
      );
      if (submit) click(submit);
      continue;
    }
    if (key && template === "hangman") {
      click(key);
      continue;
    }
    const choiceButtons = enabledButtons(node).filter((button) =>
      button.classList.contains("play-choice"),
    );
    if (template === "match-up" && choiceButtons.length >= 2) {
      const half = Math.ceil(choiceButtons.length / 2);
      for (let i = half; i < choiceButtons.length; i += 1) {
        click(choiceButtons[0]!);
        click(choiceButtons[i]!);
      }
      continue;
    }
    if (template === "find-the-match" && choiceButtons.length) {
      click(choiceButtons[step % choiceButtons.length]!);
      continue;
    }
    const choice = choiceButtons[0];
    if (choice) {
      click(choice);
      continue;
    }
    const ws = node.querySelector(".play-ws-cell") as HTMLButtonElement | null;
    if (ws) {
      click(ws);
      return;
    }
    if (buttons[0]) {
      click(buttons[0]);
      continue;
    }
    return;
  }
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  sessionStorage.clear();
});

afterEach(() => {
  for (const item of live.splice(0)) {
    act(() => item.root.unmount());
    item.node.remove();
  }
});

describe("core play games", () => {
  it("unlocks matching pairs and type the answer", () => {
    expect(PLAY_CATALOG_IDS).toHaveLength(2);
    for (const id of PLAY_CATALOG_IDS) {
      expect(templateReason(id, cards), id).toBeNull();
    }
  });

  it("renders the two catalog games as playable stages", async () => {
    for (const id of PLAY_CATALOG_IDS) {
      const node = await mount(id);
      const text = node.textContent ?? "";
      expect(text.includes("Anteing"), id).toBe(false);
      expect(text.length, id).toBeGreaterThan(8);
      expect(
        node.querySelector(".play-stage, .play-finish"),
        id,
      ).toBeTruthy();
      if (node.querySelector(".play-stage")) {
        expect(node.querySelector(".play-hud-score")?.textContent ?? "", id).toMatch(
          /\d+s/,
        );
      }
    }
  }, 30_000);

  it("plays through matching pairs and type the answer", async () => {
    const mustFinish: PlayTemplateId[] = ["type-the-answer"];
    for (const id of PLAY_CATALOG_IDS) {
      const node = await mount(id);
      await playRound(id, node);
      await settle();
      const text = node.textContent ?? "";
      expect(text.toLowerCase().includes("unknown activity"), id).toBe(false);
      if (mustFinish.includes(id)) {
        expect(finished(node), id).toBe(true);
      }
    }
  }, 60_000);

  it("sends retired rooms to a core game", async () => {
    const node = await mount("match-up");
    expect(node.querySelector(".play-stage, .play-finish")).toBeTruthy();
    expect(node.textContent ?? "").toMatch(/Matching pairs|0 misses/i);
  });
});
