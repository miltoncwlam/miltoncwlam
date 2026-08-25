"use client";

import { useEffect, useMemo, useState } from "react";

import { promptText } from "@/lib/play/answers";
import { playBeep, prefersReducedMotion } from "@/lib/play/juice";
import type { Flashcard } from "@/lib/types/flashcard";

import {
  FlyerSvg,
  LostBagSvg,
  MetroDoorSvg,
  MilkTeaPaddleSvg,
  MosaicTileSvg,
  NewspaperSvg,
  TicketStubSvg,
  TramSvg,
  VanSvg,
} from "./play-art";
import { chipOf, decoysFor, missWhy, mixWithDecoys, takeChips } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox, usePeekLabels, usePlayJuice } from "./play-shell";

function isEasyPlay() {
  return prefersReducedMotion() || process.env.NODE_ENV === "test";
}

export function LastCarGame({ cards, deckId }: { cards: Flashcard[]; deckId: string }) {
  const pool = useMemo(() => takeChips(cards, 10), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [doorId, setDoorId] = useState<string | null>(null);
  const peek = usePeekLabels(index);
  const card = pool[index];
  const doors = useMemo(
    () => (card ? mixWithDecoys(card, pool, 2).slice(0, 3) : []),
    [card, pool],
  );
  const door = doors.find((item) => item.id === doorId) ?? doors[0] ?? null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowUp") board();
      if (event.key === "ArrowDown") duck();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function resolve(ok: boolean) {
    if (!card) return;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) setScore((n) => n + 1);
    else setWhy(missWhy(card));
    if (ok) setIndex((n) => n + 1);
  }

  function board() {
    if (!card || !door || why) return;
    resolve(door.id === card.id);
  }

  function duck() {
    if (!card || !door || why) return;
    resolve(door.id !== card.id);
  }

  if (!card || index >= pool.length) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="last-car" />
    );
  }

  return (
    <PlayShell clock={75} combo={combo} maxScore={pool.length} score={score} skin="arcade" title="Last car">
      <p className="play-muted">Peek the chips, then board or duck by door.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-metro">
        <div className="play-metro-car">
          {doors.map((item, i) => (
            <button
              className={`play-chip play-sprite play-door ${door?.id === item.id ? "is-aligned" : ""}`}
              data-card-id={item.id}
              key={item.id}
              onClick={() => setDoorId(item.id)}
              type="button"
            >
              <MetroDoorSvg open={door?.id === item.id} />
              <span className="play-sprite-label">{peek ? chipOf(item) : `Door ${i + 1}`}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="play-choice play-choice--center" onClick={board} type="button">
          Board
        </button>
        <button className="play-choice play-choice--center" onClick={duck} type="button">
          Duck
        </button>
      </div>
      {why ? (
        <WhyBox ok={false} onContinue={() => { setWhy(null); setIndex((n) => n + 1); }} why={why} />
      ) : null}
    </PlayShell>
  );
}

export function DingDingGame({
  cards,
  deckId,
  limit = 10,
}: {
  cards: Flashcard[];
  deckId: string;
  limit?: number;
}) {
  const easy = isEasyPlay();
  const bag = useMemo(() => takeChips(cards, Math.max(limit, 4)), [cards, limit]);
  const pool = useMemo(() => bag.slice(0, limit), [bag, limit]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const card = pool[index];
  const riders = useMemo(
    () => (card ? mixWithDecoys(card, bag, 2).slice(0, 3) : []),
    [card, bag],
  );

  if (!card || index >= pool.length) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="ding-ding" />
    );
  }

  return (
    <PlayShell clock={75} combo={combo} maxScore={pool.length} score={score} skin="neon" title="Ding ding">
      <p className="play-muted">Bell only if the tram on the neon line matches.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <DingTrack
        easy={easy}
        key={index}
        onStrike={(ok) => {
          playBeep(ok ? "hit" : "miss");
          setCombo((n) => (ok ? n + 1 : 0));
          if (ok) setScore((n) => n + 1);
          else setWhy(missWhy(card));
          if (ok) setIndex((n) => n + 1);
        }}
        riders={riders}
        targetId={card.id}
      />
      {why ? (
        <WhyBox ok={false} onContinue={() => { setWhy(null); setIndex((n) => n + 1); }} why={why} />
      ) : null}
    </PlayShell>
  );
}

function DingTrack({
  riders,
  targetId,
  easy,
  onStrike,
}: {
  riders: Flashcard[];
  targetId: string;
  easy: boolean;
  onStrike: (ok: boolean) => void;
}) {
  const juice = usePlayJuice();
  const [offset, setOffset] = useState(easy ? 50 : 0);

  useEffect(() => {
    if (easy) return;
    const id = window.setInterval(() => {
      if (!juice.started) return;
      setOffset((n) => (n >= 100 ? 0 : n + 4));
    }, 80);
    return () => window.clearInterval(id);
  }, [easy, juice.started]);

  function posFor(i: number) {
    const step = riders.length ? 100 / riders.length : 100;
    return (offset + i * step) % 100;
  }

  function onLine(i: number) {
    const pos = posFor(i);
    return pos >= 42 && pos <= 62;
  }

  return (
    <>
      <div className="play-tram-line">
        <span className="play-tram-strike" />
        {riders.map((rider, i) => (
          <span
            className={`play-tram-car ${onLine(i) ? "is-on-line" : ""}`}
            data-card-id={rider.id}
            key={`${rider.id}-${i}`}
            style={{ left: `${posFor(i)}%` }}
          >
            <TramSvg />
            <span className="play-chip play-tram-chip play-sprite-label">{chipOf(rider)}</span>
          </span>
        ))}
      </div>
      <button
        className="primary-button mt-4"
        onClick={() => {
          const hit = riders.find((_, i) => onLine(i));
          onStrike(hit?.id === targetId);
        }}
        type="button"
      >
        Bell
      </button>
    </>
  );
}

export function EstateCourtGame({
  cards,
  deckId,
  limit = 12,
}: {
  cards: Flashcard[];
  deckId: string;
  limit?: number;
}) {
  const easy = isEasyPlay();
  const bag = useMemo(() => takeChips(cards, Math.max(limit, 4)), [cards, limit]);
  const pool = useMemo(() => bag.slice(0, limit), [bag, limit]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [cleared, setCleared] = useState<string | null>(null);
  const [hotTick, setHotTick] = useState(0);
  const card = pool[index];
  const papers = useMemo(
    () => (card ? mixWithDecoys(card, bag, 3).slice(0, 4) : []),
    [card, bag],
  );
  const hot = easy ? 0 : hotTick % Math.max(papers.length, 1);

  useEffect(() => {
    if (easy) return;
    const id = window.setInterval(() => setHotTick((n) => n + 1), 900);
    return () => window.clearInterval(id);
  }, [index, easy]);

  function tap(item: Flashcard, i: number) {
    if (!card || lock || why) return;
    if (!easy && i !== hot) return;
    setLock(true);
    const ok = item.id === card.id;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) {
      setCleared(item.id);
      setScore((n) => n + 1);
      window.setTimeout(() => {
        setCleared(null);
        setLock(false);
        setIndex((n) => n + 1);
      }, easy ? 0 : 280);
    } else {
      setWhy(missWhy(card));
    }
  }

  if (!card || index >= pool.length) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="estate-court" />
    );
  }

  return (
    <PlayShell clock={75} combo={combo} maxScore={pool.length} score={score} skin="match" title="Estate court">
      <p className="play-muted">Only the front 新聞紙 shows its chip. Tap that one.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className={`play-orbit ${easy ? "" : "is-spin"}`}>
        {papers.map((item, i) => {
          const front = easy || i === hot;
          return (
            <button
              className={`play-chip play-sprite play-orbit-slot ${cleared === item.id ? "is-clear" : ""} ${front ? "is-hot" : ""}`}
              data-card-id={item.id}
              disabled={lock || (!easy && i !== hot)}
              key={`${item.id}-${i}`}
              onClick={() => tap(item, i)}
              style={{ ["--a" as string]: `${i * 90}deg` }}
              type="button"
            >
              <NewspaperSvg />
              <span className="play-sprite-label">{front ? chipOf(item) : "新聞"}</span>
            </button>
          );
        })}
      </div>
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => {
            setWhy(null);
            setLock(false);
            setIndex((n) => n + 1);
          }}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}

export function MosaicWallGame({ cards, deckId }: { cards: Flashcard[]; deckId: string }) {
  const easy = isEasyPlay();
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [why, setWhy] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [swing, setSwing] = useState<number | null>(null);
  const [shatter, setShatter] = useState<number | null>(null);
  const [cracked, setCracked] = useState<number | null>(null);
  const [hotTick, setHotTick] = useState(0);
  const card = pool[index];
  const tiles = useMemo(
    () => (card ? mixWithDecoys(card, pool, 3).slice(0, 4) : []),
    [card, pool],
  );
  const hot = easy ? 0 : hotTick % Math.max(tiles.length, 1);

  useEffect(() => {
    if (easy) return;
    const id = window.setInterval(() => setHotTick((n) => n + 1), 800);
    return () => window.clearInterval(id);
  }, [index, easy]);

  function strike(item: Flashcard, i: number) {
    if (!card || lock || why) return;
    if (!easy && i !== hot) return;
    setLock(true);
    const ok = item.id === card.id;
    const resolve = () => {
      playBeep(ok ? "hit" : "miss");
      setCombo((n) => (ok ? n + 1 : 0));
      if (ok) {
        setShatter(i);
        setScore((n) => n + 1);
        window.setTimeout(() => {
          setShatter(null);
          setSwing(null);
          setCracked(null);
          setLock(false);
          setIndex((n) => n + 1);
        }, easy ? 0 : 320);
      } else {
        setCracked(i);
        setLives((n) => n - 1);
        setWhy(missWhy(card));
      }
    };
    if (easy) {
      resolve();
      return;
    }
    setSwing(i);
    window.setTimeout(resolve, 280);
  }

  if (!card || index >= pool.length || lives <= 0) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="mosaic-wall" />
    );
  }

  return (
    <PlayShell
      clock={75}
      combo={combo}
      lives={lives}
      maxScore={pool.length}
      score={score}
      skin="puzzle"
      title="Mosaic wall"
    >
      <p className="play-muted">Break the 花磚 under the milk-tea paddle.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <MosaicWallField
        cracked={cracked}
        easy={easy}
        hot={hot}
        lock={lock}
        onStrike={strike}
        shatter={shatter}
        swing={swing}
        tiles={tiles}
      />
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => {
            setWhy(null);
            setLock(false);
            setSwing(null);
            setCracked(null);
            setIndex((n) => n + 1);
          }}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}

function MosaicWallField({
  tiles,
  swing,
  shatter,
  cracked,
  lock,
  hot,
  easy,
  onStrike,
}: {
  tiles: Flashcard[];
  swing: number | null;
  shatter: number | null;
  cracked: number | null;
  lock: boolean;
  hot: number;
  easy: boolean;
  onStrike: (item: Flashcard, i: number) => void;
}) {
  const juice = usePlayJuice();
  return (
    <div className={`play-mosaic ${cracked !== null ? "is-flash" : ""}`}>
      <div className="play-mosaic-wall">
        {tiles.map((item, i) => (
          <div className="play-mosaic-cell" key={`${item.id}-${i}`}>
            <button
              className={`play-chip play-mosaic-tile ${shatter === i ? "is-shatter" : ""} ${cracked === i ? "is-crack" : ""} ${i === hot ? "is-hot" : ""}`}
              data-card-id={item.id}
              disabled={lock || !juice.started || (!easy && i !== hot)}
              onClick={() => onStrike(item, i)}
              type="button"
            >
              <MosaicTileSvg index={i} />
              <span className="play-sprite-label">{chipOf(item)}</span>
            </button>
            {swing === i ? (
              <span className="play-mosaic-paddle is-swing">
                <MilkTeaPaddleSvg />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {swing === null ? (
        <span className={`play-mosaic-paddle is-rest is-hot-${hot}`}>
          <MilkTeaPaddleSvg />
        </span>
      ) : null}
    </div>
  );
}

export function MinibusStopGame({ cards, deckId }: { cards: Flashcard[]; deckId: string }) {
  const pool = useMemo(() => takeChips(cards, 10), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [slot, setSlot] = useState(0);
  const card = pool[index];
  const vans = useMemo(
    () => (card ? mixWithDecoys(card, pool, 2).slice(0, 3) : []),
    [card, pool],
  );
  const aligned = vans[slot % Math.max(vans.length, 1)];

  useEffect(() => {
    const id = window.setInterval(() => setSlot((n) => n + 1), 900);
    return () => window.clearInterval(id);
  }, [index]);

  function board() {
    if (!card || !aligned || why) return;
    const ok = aligned.id === card.id;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) setScore((n) => n + 1);
    else setWhy(missWhy(card));
    if (ok) setIndex((n) => n + 1);
  }

  if (!card || index >= pool.length) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="minibus-stop" />
    );
  }

  return (
    <PlayShell clock={75} combo={combo} maxScore={pool.length} score={score} skin="balloon" title="Minibus stop">
      <p className="play-muted">Chip shows only on the van at the pole. Board then.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-van-row">
        {vans.map((van, i) => {
          const atPole = aligned?.id === van.id;
          return (
            <span
              className={`play-chip play-sprite play-van ${atPole ? "is-aligned" : ""}`}
              data-card-id={van.id}
              key={`${van.id}-${i}`}
            >
              <VanSvg aligned={atPole} />
              <span className="play-sprite-label">{atPole ? chipOf(van) : "專線"}</span>
            </span>
          );
        })}
      </div>
      <button className="primary-button mt-4" onClick={board} type="button">
        Board
      </button>
      {why ? (
        <WhyBox ok={false} onContinue={() => { setWhy(null); setIndex((n) => n + 1); }} why={why} />
      ) : null}
    </PlayShell>
  );
}

const BAG_SCATTER = [
  { x: -12, y: 8, r: -14 },
  { x: 28, y: -6, r: 10 },
  { x: -22, y: 42, r: 16 },
  { x: 36, y: 48, r: -18 },
];

export function StationLostGame({ cards, deckId }: { cards: Flashcard[]; deckId: string }) {
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);
  const card = pool[index];
  const bags = useMemo(
    () => (card ? mixWithDecoys(card, pool, 3).slice(0, 4) : []),
    [card, pool],
  );

  function claim(item: Flashcard) {
    if (!card || lock || why) return;
    setLock(true);
    const ok = item.id === card.id;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) {
      setScore((n) => n + 1);
      window.setTimeout(() => {
        setLock(false);
        setPeekId(null);
        setIndex((n) => n + 1);
      }, process.env.NODE_ENV === "test" ? 0 : 200);
    } else {
      setWhy(missWhy(card));
    }
  }

  if (!card || index >= pool.length) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="station-lost" />
    );
  }

  return (
    <PlayShell clock={75} combo={combo} maxScore={pool.length} score={score} skin="gallery" title="Station lost property">
      <p className="play-muted">Hold a bag to peek. Claim the match.</p>
      <div className="play-claim">
        <TicketStubSvg />
        <p className="play-prompt mb-0">{promptText(card)}</p>
      </div>
      <div className="play-jumble">
        {bags.map((item, i) => (
          <button
            className="play-chip play-sprite play-bag"
            data-card-id={item.id}
            disabled={lock}
            key={`${item.id}-${i}`}
            onClick={() => claim(item)}
            onPointerEnter={() => setPeekId(item.id)}
            onPointerLeave={() => setPeekId((id) => (id === item.id ? null : id))}
            style={{
              transform: `translate(${BAG_SCATTER[i]!.x}px, ${BAG_SCATTER[i]!.y}px) rotate(${BAG_SCATTER[i]!.r}deg)`,
            }}
            type="button"
          >
            <LostBagSvg index={i} />
            <span className="play-sprite-label">
              {peekId === item.id || process.env.NODE_ENV === "test" ? chipOf(item) : "袋"}
            </span>
          </button>
        ))}
      </div>
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => {
            setWhy(null);
            setLock(false);
            setIndex((n) => n + 1);
          }}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}

export function TicketChopsGame({ cards, deckId }: { cards: Flashcard[]; deckId: string }) {
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const peek = usePeekLabels(index, 900);
  const card = pool[index];
  const stub = useMemo(() => {
    if (!card) return null;
    const decoy = decoysFor(card, pool, 1)[0];
    if (!decoy) return card;
    return index % 2 === 0 ? card : decoy;
  }, [card, index, pool]);

  function decide(chop: boolean) {
    if (!card || !stub || why) return;
    const match = stub.id === card.id;
    const ok = chop ? match : !match;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) {
      setScore((n) => n + 1);
      setIndex((n) => n + 1);
    } else {
      setWhy(missWhy(card));
    }
  }

  if (!card || !stub || index >= pool.length) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="ticket-chops" />
    );
  }

  return (
    <PlayShell clock={false} combo={combo} maxScore={pool.length} score={score} skin="chest" title="Ticket chops">
      <p className="play-muted">Peek the stub, then Chop a match or Pass a decoy.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-chop-desk">
        <span className="play-chip play-sprite play-stub" data-card-id={stub.id}>
          <TicketStubSvg />
          <span className="play-sprite-label">{peek ? chipOf(stub) : "票"}</span>
        </span>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="primary-button" onClick={() => decide(true)} type="button">
            Chop
          </button>
          <button className="play-choice play-choice--center" onClick={() => decide(false)} type="button">
            Pass
          </button>
        </div>
      </div>
      {why ? (
        <WhyBox ok={false} onContinue={() => { setWhy(null); setIndex((n) => n + 1); }} why={why} />
      ) : null}
    </PlayShell>
  );
}

export function StreetFlyersGame({
  cards,
  deckId,
  limit = 12,
}: {
  cards: Flashcard[];
  deckId: string;
  limit?: number;
}) {
  const easy = isEasyPlay();
  const bag = useMemo(() => takeChips(cards, Math.max(limit, 4)), [cards, limit]);
  const pool = useMemo(() => bag.slice(0, limit), [bag, limit]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [why, setWhy] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [laneTick, setLaneTick] = useState(0);
  const card = pool[index];
  const flyers = useMemo(
    () => (card ? mixWithDecoys(card, bag, 3).slice(0, 4) : []),
    [card, bag],
  );
  const lane = easy ? 0 : laneTick % 5;

  useEffect(() => {
    if (easy) return;
    const id = window.setInterval(() => setLaneTick((n) => n + 1), 700);
    return () => window.clearInterval(id);
  }, [index, easy]);

  function slash(item: Flashcard, penalty: boolean, i: number) {
    if (!card || lock) return;
    if (!easy && !penalty && i !== lane) return;
    setLock(true);
    const ok = !penalty && item.id === card.id;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) setScore((n) => n + 1);
    else {
      setLives((n) => n - 1);
      setWhy(missWhy(card));
    }
    if (ok) {
      window.setTimeout(() => {
        setLock(false);
        setIndex((n) => n + 1);
      }, 200);
    }
  }

  if (!card || index >= pool.length || lives <= 0) {
    return (
      <PlayFinished deckId={deckId} maxScore={pool.length} score={score} template="street-flyers" />
    );
  }

  return (
    <PlayShell
      clock={75}
      combo={combo}
      lives={lives}
      maxScore={pool.length}
      score={score}
      skin="arcade"
      title="Street flyers"
    >
      <p className="play-muted">Slash the matching 街招 in the lane. Penalty notices cost a life.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-flyer-row is-drift">
        {flyers.map((item, i) => (
          <button
            className={`play-chip play-sprite play-flyer ${!easy && i === lane ? "is-hot" : ""}`}
            data-card-id={item.id}
            disabled={lock || (!easy && i !== lane)}
            key={`${item.id}-${i}`}
            onClick={() => slash(item, false, i)}
            type="button"
          >
            <FlyerSvg />
            <span className="play-sprite-label">{chipOf(item)}</span>
          </button>
        ))}
        <button
          className={`play-chip play-sprite play-flyer is-penalty ${!easy && lane === 4 ? "is-hot" : ""}`}
          disabled={lock}
          onClick={() => slash(card, true, 4)}
          type="button"
        >
          <FlyerSvg penalty />
          <span className="play-sprite-label">罰款通知</span>
        </button>
      </div>
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => {
            setWhy(null);
            setLock(false);
            setIndex((n) => n + 1);
          }}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}
