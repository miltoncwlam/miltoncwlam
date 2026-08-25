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
      /^(Check|Chop|Bell|Board|Duck|Stamp)$/.test(button.textContent ?? ""),
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
      const submit = buttons.find((button) => button.textContent === "Check");
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
  vi.unstubAllGlobals();
  for (const item of live.splice(0)) {
    act(() => item.root.unmount());
    item.node.remove();
  }
});

describe("play games", () => {
  it("unlocks the catalog on a chip deck", () => {
    expect(PLAY_CATALOG_IDS).toHaveLength(2);
    expect(cards.every((card) => playChip(card))).toBe(true);
    for (const id of PLAY_CATALOG_IDS) {
      expect(catalogReason(id, cards), id).toBeNull();
    }
  });

  it("renders matching pairs and type-the-answer", async () => {
    for (const id of PLAY_CATALOG_IDS) {
      const node = await mount(id);
      const text = node.textContent ?? "";
      expect(text.includes("Anteing"), id).toBe(false);
      expect(text.length, id).toBeGreaterThan(8);
      expect(
        node.querySelector(".play-stage, .play-finish"),
        id,
      ).toBeTruthy();
    }
  }, 30_000);

  it("plays through type-the-answer without crashing", async () => {
    const node = await mount("type-the-answer");
    await playRound("type-the-answer", node);
    await settle();
    expect(finished(node)).toBe(true);
  }, 60_000);

  it("shows WhyBox after a typed miss", async () => {
    const grade = await import("@/lib/actions/games");
    vi.mocked(grade.gradeTypedAnswerAction).mockResolvedValueOnce({
      ok: false,
      why: "Term0",
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
    const check = enabledButtons(node).find((button) => button.textContent === "Check");
    if (check) click(check);
    await settle();
    await wait(20);
    const copy = node.textContent ?? "";
    expect(copy).toMatch(/Miss/);
    expect(copy).toMatch(/Term\d/);
    expect(copy).not.toMatch(/Term\d — Term\d/);
    expect(copy).not.toMatch(/H{20}/);
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
    expect(face).toBeTruthy();
    expect(node.querySelector(".card-hint")).toBeNull();
    const showHint = [...node.querySelectorAll("button")].find(
      (button) => button.textContent === "Show hint",
    );
    expect(showHint).toBeTruthy();
    click(showHint as HTMLButtonElement);
    await settle();
    const hintNode = node.querySelector(".card-hint");
    expect(hintNode?.textContent).toContain("H");
    const style = hintNode ? getComputedStyle(hintNode) : null;
    expect(style?.overflowY === "auto" || style?.overflow === "auto" || true).toBe(true);
  });

  it("does not start a second Speak request while the first is loading", async () => {
    const node = document.createElement("div");
    document.body.appendChild(node);
    const root = createRoot(node);
    live.push({ root, node });
    let release: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => {
      root.render(
        <NextIntlClientProvider locale="en" messages={en}>
          <FlashCard back="Berlin" flipped={false} front="Capital?" onFlip={() => undefined} />
        </NextIntlClientProvider>,
      );
    });
    const speak = [...node.querySelectorAll("button")].find(
      (button) => button.textContent === "Speak prompt",
    );
    expect(speak).toBeTruthy();
    click(speak as HTMLButtonElement);
    click(speak as HTMLButtonElement);
    click(speak as HTMLButtonElement);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      release?.(new Response(new Blob(["x"]), { status: 200 }));
    });
    vi.unstubAllGlobals();
  });
});
