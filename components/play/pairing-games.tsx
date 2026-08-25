"use client";

import { useMemo, useState } from "react";

import { playChip } from "@/lib/play/answers";
import { playBeep } from "@/lib/play/juice";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { isPublicPlayCatalog } from "@/lib/play/templates";
import { LanternSvg } from "./play-art";
import { chipOf, missWhy, promptOf, takeChips } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

const LANTERN_HUES = ["red", "gold", "pink"] as const;

function faceText(value: string) {
  const text = value.trim();
  if (text.length <= 32) return text;
  return `${text.slice(0, 30).trim()}…`;
}

type Lantern = {
  id: string;
  cardId: string;
  text: string;
  decoy?: boolean;
};

export function MatchingPairsGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  if (isPublicPlayCatalog()) {
    return <MatchingPairsStudy cards={cards} deckId={deckId} />;
  }
  return <MatchingPairsLanterns cards={cards} deckId={deckId} />;
}

function MatchingPairsStudy({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pairs = useMemo(() => takeChips(cards, 8), [cards]);
  const [left] = useState(() => shuffleList(pairs));
  const [right] = useState(() => shuffleList(pairs));
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);

  if (matched.size >= pairs.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pairs.length}
        score={Math.max(0, pairs.length - wrong)}
        template="matching-pairs"
      />
    );
  }

  const openLeft = left.filter((card) => !matched.has(card.id));
  const openRight = right.filter((card) => !matched.has(card.id));

  return (
    <PlayShell
      clock={false}
      extra={`${wrong} misses`}
      maxScore={pairs.length}
      score={matched.size}
      skin="flip"
      title="Matching pairs"
    >
      <p className="play-prompt">Tap a question, then its answer. A match disappears.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="play-muted mb-0 text-center text-xs font-black uppercase tracking-widest">
            Questions
          </p>
          {openLeft.map((card) => (
            <button
              className={`play-choice w-full ${picked === card.id ? "is-picked" : ""}`}
              key={`l-${card.id}`}
              onClick={() => setPicked(card.id)}
              type="button"
            >
              {promptOf(card)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="play-muted mb-0 text-center text-xs font-black uppercase tracking-widest">
            Answers
          </p>
          {openRight.map((card) => (
            <button
              className="play-choice w-full"
              key={`r-${card.id}`}
              onClick={() => {
                if (!picked) return;
                if (picked === card.id) {
                  playBeep("hit");
                  setMatched(new Set(matched).add(card.id));
                  setPicked(null);
                } else {
                  playBeep("miss");
                  setWrong((n) => n + 1);
                  setPicked(null);
                }
              }}
              type="button"
            >
              {chipOf(card)}
            </button>
          ))}
        </div>
      </div>
    </PlayShell>
  );
}

function MatchingPairsLanterns({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pairs = useMemo(() => takeChips(cards, 6), [cards]);
  const leftover = useMemo(
    () => cards.filter((card) => playChip(card) && !pairs.some((item) => item.id === card.id)),
    [cards, pairs],
  );
  const [tiles, setTiles] = useState<Lantern[]>(() =>
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
      title="Twin lanterns"
    >
      <p className="play-prompt">Harbourfront lanterns. Flip a pair.</p>
      <div className="play-flip-grid play-lantern-grid">
        {tiles.map((tile, i) => {
          const show = open.includes(tile.id) || matched.has(tile.cardId);
          const hue = LANTERN_HUES[i % LANTERN_HUES.length]!;
          return (
            <button
              className={`play-flip play-lantern ${show ? "is-open" : ""} ${matched.has(tile.cardId) ? "is-matched is-lit" : ""} ${wrong.includes(tile.id) ? "is-wrong" : ""} ${tile.decoy ? "is-decoy" : ""}`}
              disabled={show || Boolean(why)}
              key={tile.id}
              onClick={() => {
                if (tile.decoy || open.length === 2) return;
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
                    const decoySrc = leftover[misses % Math.max(leftover.length, 1)];
                    if (decoySrc) {
                      const decoy: Lantern = {
                        id: `decoy-${misses}-${decoySrc.id}`,
                        cardId: `decoy-${decoySrc.id}`,
                        text: chipOf(decoySrc),
                        decoy: true,
                      };
                      setTiles((list) => [...list, decoy]);
                      window.setTimeout(() => {
                        setTiles((list) => list.filter((item) => item.id !== decoy.id));
                      }, 900);
                    }
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
              <span className="play-lantern-cord" />
              <span className="play-flip-inner">
                <span className="play-flip-face play-flip-back">
                  <LanternSvg hue={hue} />
                </span>
                <span className="play-flip-face play-flip-front">
                  <LanternSvg hue={hue} lit />
                  <span className="play-lantern-text">{tile.text}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => setWhy(null)}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}
