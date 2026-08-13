import { describe, expect, it } from "vitest";

import { ENCYCLOPEDIA_FEATURED_PACKS } from "@/lib/data/community-packs/encyclopedia-featured";
import { mcqStyleRules } from "@/lib/llm/parse-deck-json";
import { parseGeneratedDeck } from "@/lib/llm/parse-deck-json";
import {
  buildQuizChoices,
  quizExplanation,
  resolveCorrectChoice,
  selectQuizDistractors,
} from "@/lib/quiz/choices";

const mexicoWhy =
  "Mexico City is the capital of Mexico, built on the ancient Aztec city of Tenochtitlán.";

function mexicoCard() {
  return {
    id: "1",
    front: "What is the capital of Mexico?",
    back: mexicoWhy,
    options: ["Mexico City", "Monterrey", "Puebla", mexicoWhy],
  };
}

describe("buildQuizChoices", () => {
  it("does not inject a long explanation as a tap-able option", () => {
    const choices = buildQuizChoices(mexicoCard(), [], () => 0);
    expect(choices).toContain("Mexico City");
    expect(choices.some((choice) => choice.includes("Tenochtitlán"))).toBe(
      false,
    );
    expect(choices.every((choice) => choice.split(/\s+/).length <= 4)).toBe(
      true,
    );
  });

  it("prefers the matching short option as the correct choice", () => {
    expect(resolveCorrectChoice(mexicoCard())).toBe("Mexico City");
    expect(quizExplanation(mexicoCard())).toBe(mexicoWhy);
  });

  it("drops options that contain the correct answer as a substring", () => {
    const choices = buildQuizChoices(
      {
        id: "1",
        front: "What is the capital of France?",
        back: "Paris",
        options: ["Paris", "Lyon", "Paris is the capital of France.", "Marseille"],
      },
      [],
      () => 0,
    );
    expect(choices).toContain("Paris");
    expect(choices.some((choice) => choice.includes("capital"))).toBe(false);
  });

  it("uses same-kind distractors instead of random backs from the deck", () => {
    const basin = {
      id: "basin",
      front: "What is a drainage basin?",
      back: "The land that sheds water into one river system.",
      category: "Water",
    };
    const deck = [
      basin,
      {
        id: "sahara",
        front: "What is the world’s largest hot desert, in Africa?",
        back: "The Sahara.",
        category: "Africa",
      },
      {
        id: "asia",
        front: "Which is Earth’s largest continent by area?",
        back: "Asia.",
        category: "Asia",
      },
      {
        id: "island",
        front: "What is an island?",
        back: "Land with water all around it.",
        category: "Land",
      },
      {
        id: "river",
        front: "What is a river?",
        back: "Fresh water flowing toward a sea, lake, or another river.",
        category: "Water",
      },
      {
        id: "equator",
        front: "What is the equator?",
        back: "An imaginary line around Earth’s middle.",
        category: "Earth",
      },
    ];
    const distractors = selectQuizDistractors(basin, deck, 3);
    expect(distractors).toContain("Land with water all around it.");
    expect(distractors.some((entry) => /sahara|asia/i.test(entry))).toBe(false);
    const choices = buildQuizChoices(basin, deck, () => 0);
    expect(choices).toContain(basin.back);
    expect(choices.some((entry) => /sahara|^Asia\.?$/i.test(entry))).toBe(
      false,
    );
  });
});

describe("MCQ generation parse", () => {
  it("moves a long why from back into hint and keeps a short matching option", () => {
    const deck = parseGeneratedDeck({
      title: "Mexico",
      cards: [
        {
          front: "What is the capital of Mexico?",
          back: mexicoWhy,
          type: "mcq",
          options: ["Mexico City", "Monterrey", "Puebla", mexicoWhy],
        },
        {
          front: "What is the capital of France?",
          back: "Paris",
          type: "mcq",
          options: ["Paris", "Lyon", "Marseille", "Nice"],
        },
        {
          front: "What is the capital of Japan?",
          back: "Tokyo",
          type: "mcq",
          options: ["Tokyo", "Osaka", "Kyoto", "Nagoya"],
        },
      ],
    });
    const card = deck.cards[0];
    expect(card.back).toBe("Mexico City");
    expect(card.hint).toBe(mexicoWhy);
    expect(card.options).not.toContain(mexicoWhy);
    expect(card.options).toContain("Mexico City");
  });

  it("tells the model to put why in hint, not in back", () => {
    const rules = mcqStyleRules();
    expect(rules).toMatch(/hint/i);
    expect(rules).not.toMatch(/back = correct option text \(and brief why\)/);
    expect(rules).toMatch(/match one option exactly/i);
  });
});

describe("featured encyclopedia quizzes", () => {
  it("does not offer continent names for a drainage-basin definition", () => {
    const pack = ENCYCLOPEDIA_FEATURED_PACKS.find(
      (entry) => entry.slug === "ency-continents-senior",
    );
    const basin = pack?.cards.find((card) =>
      card.front.toLowerCase().includes("drainage basin"),
    );
    expect(basin?.options?.length).toBeGreaterThanOrEqual(2);
    expect(
      basin?.options?.some((option) => /^(africa|asia|the sahara)\.?$/i.test(option)),
    ).toBe(false);
  });
});
