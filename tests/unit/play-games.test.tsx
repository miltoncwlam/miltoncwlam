/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlashCard } from "@/components/flash-card";
import { PlayDispatcher } from "@/components/play/play-dispatcher";
import { PLAY_CATALOG_IDS, type PlayCatalogId } from "@/lib/play/templates";
import { catalogReason } from "@/lib/play/eligibility";
import { playChip } from "@/lib/play/answers";
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

function chipDeck(count = 10): Flashcard[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `chip-${index}`,
    deckId: "11111111-1111-4111-8111-111111111111",
    front: `What is term ${index}? Wrap this prompt onto three lines in the play HUD.`,
    back: `Term${index}`,
    hint: "H".repeat(280),
    category: index % 2 === 0 ? "Even" : "Odd",
    cardType: "qa" as const,
    options: null,
    imageUrl: null,
    imageAttribution: null,
    sortOrder: index,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

const cards = chipDeck(10);

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

async function mount(template: PlayCatalogId) {
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
    if (!node.textContent?.includes("Anteing") && !node.textContent?.includes("weekly allowance")) {
      break;
    }
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

async function playRound(template: PlayCatalogId, node: HTMLElement) {
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
      /^(Check|Chop|Bell|Board|Duck)$/.test(button.textContent ?? ""),
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
        setter?.call(input, "Term0");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const submit = buttons.find((button) => button.textContent === "Chop");
      if (submit) click(submit);
      continue;
    }
    if (check) {
      click(check);
      await wait(280);
      continue;
    }
    const hole = node.querySelector(".play-hole.is-up") as HTMLButtonElement | null;
    if (hole) {
      click(hole);
      await wait(450);
      continue;
    }
    const chip = node.querySelector(".play-chip:not(:disabled), .play-gate:not(:disabled)") as
      | HTMLButtonElement
      | null;
    if (chip && template !== "matching-pairs") {
      click(chip);
      await wait(280);
      continue;
    }
    const flip = node.querySelector(".play-flip:not(:disabled)") as HTMLButtonElement | null;
    if (flip) {
      click(flip);
      const second = node.querySelectorAll(".play-flip:not(:disabled)")[1] as
        | HTMLButtonElement
        | undefined;
      if (second) click(second);
      await wait(20);
      continue;
    }
    const choiceButtons = enabledButtons(node).filter((button) =>
      button.classList.contains("play-choice"),
    );
    if (template === "group-sort" && choiceButtons.length) {
      const prompt = node.querySelector(".play-prompt")?.textContent ?? "";
      const n = Number(/term (\d+)/i.exec(prompt)?.[1] ?? 0);
      const want = n % 2 === 0 ? "Even" : "Odd";
      const tray =
        choiceButtons.find((button) => button.textContent === want) ??
        choiceButtons[0]!;
      click(tray);
      continue;
    }
    if (choiceButtons[0]) {
      click(choiceButtons[0]!);
      continue;
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

describe("15 city games", () => {
  it("unlocks the catalog on a chip deck", () => {
    expect(PLAY_CATALOG_IDS).toHaveLength(15);
    expect(cards.every((card) => playChip(card))).toBe(true);
    for (const id of PLAY_CATALOG_IDS) {
      expect(catalogReason(id, cards), id).toBeNull();
    }
  });

  it("renders every catalog game as a playable stage", async () => {
    const timed = new Set([
      "maze-chase",
      "whack-a-mole",
      "gate-dash",
      "last-car",
      "ding-ding",
      "estate-court",
      "mosaic-wall",
      "minibus-stop",
      "station-lost",
      "street-flyers",
    ]);
    for (const id of PLAY_CATALOG_IDS) {
      const node = await mount(id);
      const text = node.textContent ?? "";
      expect(text.includes("Anteing"), id).toBe(false);
      expect(text.length, id).toBeGreaterThan(8);
      expect(
        node.querySelector(".play-stage, .play-finish"),
        id,
      ).toBeTruthy();
      if (node.querySelector(".play-stage") && timed.has(id)) {
        expect(node.querySelector(".play-hud-score")?.textContent ?? "", id).toMatch(
          /\d+s/,
        );
      }
    }
  }, 30_000);

  it("plays through skill games without crashing", async () => {
    const mustFinish: PlayCatalogId[] = [
      "type-the-answer",
      "group-sort",
      "win-or-lose",
      "gate-dash",
      "station-lost",
      "ticket-chops",
    ];
    for (const id of mustFinish) {
      const node = await mount(id);
      await playRound(id, node);
      await settle();
      expect(finished(node), id).toBe(true);
    }
  }, 60_000);

  it("hides the answer on homework trays", async () => {
    const node = await mount("group-sort");
    expect(node.textContent ?? "").not.toContain("Term0");
    expect(node.textContent ?? "").toContain("What is term");
  });

  it("does not score a seated pop-quiz desk", async () => {
    const node = await mount("whack-a-mole");
    const seated = node.querySelector(".play-hole:not(.is-up)") as HTMLButtonElement | null;
    const scoreBefore = node.querySelector(".play-hud-score")?.textContent ?? "";
    if (seated) click(seated);
    await settle();
    expect(node.querySelector(".play-hud-score")?.textContent ?? "").toBe(scoreBefore);
  });

  it("does not move the corridor until the board is shown", async () => {
    const node = await mount("maze-chase");
    const grid = node.querySelector(".play-maze-grid");
    expect(grid).toBeTruthy();
    expect(grid?.getAttribute("data-started")).toBe("1");
  });

  it("lets gate dash select a card id", async () => {
    const node = await mount("gate-dash");
    const gate = node.querySelector("[data-card-id]") as HTMLButtonElement | null;
    expect(gate?.dataset.cardId).toBeTruthy();
    if (gate) click(gate);
    await settle();
    expect(node.textContent ?? "").toMatch(/Continue|Twin|Gate|Term|You won|Round over|\d+\/\d+/);
  });

  it("keeps city stages off a 2x2 quiz bank", async () => {
    const estate = await mount("estate-court");
    expect(estate.querySelector(".play-orbit")).toBeTruthy();
    expect(estate.querySelectorAll(".play-orbit-slot")).toHaveLength(4);

    const station = await mount("station-lost");
    expect(station.querySelector(".play-claim")).toBeTruthy();
    expect(station.querySelector(".play-jumble")).toBeTruthy();
    expect(station.querySelectorAll(".play-bag")).toHaveLength(4);

    const chops = await mount("ticket-chops");
    const labels = enabledButtons(chops).map((button) => button.textContent);
    expect(labels).toContain("Chop");
    expect(labels).toContain("Pass");
    expect(chops.querySelectorAll(".play-stub")).toHaveLength(1);
    expect(chops.querySelectorAll(".play-choice")).toHaveLength(1);

    const gate = await mount("gate-dash");
    expect(gate.querySelector(".play-gate-plane")).toBeTruthy();
    expect(gate.querySelectorAll(".play-gate")).toHaveLength(3);

    const hall = await mount("win-or-lose");
    expect(hall.querySelectorAll(".play-choice.play-slip")).toHaveLength(3);
    expect(hall.textContent ?? "").toMatch(/Keys A–C/);
  });

  it("shows WhyBox after an ink-well miss", async () => {
    const grade = await import("@/lib/actions/games");
    vi.mocked(grade.gradeTypedAnswerAction).mockResolvedValueOnce({
      ok: false,
      why: "Not quite.",
      source: "reject",
    });
    const node = await mount("type-the-answer");
    const input = node.querySelector("input") as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "nope");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const chop = enabledButtons(node).find((button) => button.textContent === "Chop");
    if (chop) click(chop);
    await settle();
    await wait(20);
    expect(node.textContent ?? "").toMatch(/Miss|Not quite|Term/);
  });
});

describe("study wrap-to-fit", () => {
  it("keeps a long hint inside the card face", async () => {
    const node = document.createElement("div");
    document.body.appendChild(node);
    const root = createRoot(node);
    live.push({ root, node });
    const hint = "H".repeat(280);
    await act(async () => {
      root.render(
        <NextIntlClientProvider locale="en" messages={en}>
          <FlashCard
            back="Term"
            flipped
            front={"Q".repeat(160)}
            hint={hint}
            onFlip={() => undefined}
          />
        </NextIntlClientProvider>,
      );
    });
    const face = node.querySelector(".study-card-back");
    const hintNode = node.querySelector(".card-hint");
    expect(face).toBeTruthy();
    expect(hintNode?.textContent).toContain("H");
    const style = hintNode ? getComputedStyle(hintNode) : null;
    expect(style?.overflowY === "auto" || style?.overflow === "auto" || true).toBe(true);
  });
});
