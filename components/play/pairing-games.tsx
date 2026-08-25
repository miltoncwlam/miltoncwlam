"use client";

import { useMemo, useState } from "react";

import { playBeep } from "@/lib/play/juice";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { chipOf, missWhy, promptOf, takeChips } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

function faceText(value: string) {
  const text = value.trim();
  if (text.length <= 32) return text;
  return `${text.slice(0, 30).trim()}…`;
}

type Tile = {
  id: string;
  cardId: string;
  text: string;
};

export function MatchingPairsGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pairs = useMemo(() => takeChips(cards, 6), [cards]);
  const [tiles] = useState<Tile[]>(() =>
    shuffleList(
      pairs.flatMap((card) => [
        { id: `${card.id}-a`, cardId: card.id, text: faceText(promptOf(card)) },
        { id: `${card.id}-b`, cardId: card.id, text: faceText(chipOf(card)) },
      ]),
    ),
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [why, setWhy] = useState<string | null>(null);

  if (matched.size >= pairs.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pairs.length}
        score={Math.max(0, pairs.length - misses)}
        template="matching-pairs"
      />
    );
  }

  return (
    <PlayShell
      clock={false}
      extra={`${misses} misses`}
      maxScore={pairs.length}
      score={matched.size}
      skin="flip"
      title="Matching pairs"
    >
      <p className="play-prompt">Flip two cards. Pair prompt with answer.</p>
      <div className="play-flip-grid">
        {tiles.map((tile) => {
          const show = open.includes(tile.id) || matched.has(tile.cardId);
          return (
            <button
              className={`play-flip ${show ? "is-open" : ""} ${matched.has(tile.cardId) ? "is-matched" : ""} ${wrong.includes(tile.id) ? "is-wrong" : ""}`}
              disabled={show || Boolean(why)}
              key={tile.id}
              onClick={() => {
                if (open.length === 2) return;
                if (open.length === 1) {
                  const first = tiles.find((item) => item.id === open[0]);
                  if (first?.cardId === tile.cardId && first.id !== tile.id) {
                    playBeep("hit");
                    setMatched(new Set(matched).add(tile.cardId));
                    setOpen([]);
                    setWhy(null);
                  } else {
                    playBeep("miss");
                    const missCard =
                      pairs.find((item) => item.id === first?.cardId) ?? pairs[0]!;
                    setOpen([open[0]!, tile.id]);
                    setWrong([open[0]!, tile.id]);
                    setMisses((value) => value + 1);
                    setWhy(missWhy(missCard));
                    window.setTimeout(() => {
                      setOpen([]);
                      setWrong([]);
                    }, 700);
                  }
                } else {
                  setOpen([tile.id]);
                }
              }}
              type="button"
            >
              <span className="play-flip-inner">
                <span className="play-flip-face play-flip-back">★</span>
                <span className="play-flip-face play-flip-front">{tile.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      {why ? (
        <WhyBox ok={false} onContinue={() => setWhy(null)} why={why} />
      ) : null}
    </PlayShell>
  );
}
