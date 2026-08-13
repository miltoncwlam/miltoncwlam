"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  completeGameRunAction,
  startGameRunAction,
} from "@/lib/actions/games";
import { PLAY_STAKE } from "@/lib/credits/play";
import type { PlayTemplateId } from "@/lib/play/templates";
import type { PlaySkin } from "@/lib/play/worlds";

export type PlayOptions = {
  readOnly?: boolean;
  homeHref?: string;
  replayHref?: string;
  clientKey?: string;
  stake?: number;
};

const PlayOptionsContext = createContext<PlayOptions>({});

export function PlayOptionsProvider({
  value,
  children,
}: {
  value: PlayOptions;
  children: React.ReactNode;
}) {
  return (
    <PlayOptionsContext.Provider value={value}>
      {children}
    </PlayOptionsContext.Provider>
  );
}

export function PlayStakeGate({
  deckId,
  template,
  children,
}: {
  deckId: string;
  template: PlayTemplateId;
  children: React.ReactNode;
}) {
  const parent = useContext(PlayOptionsContext);
  const [clientKey, setClientKey] = useState("");
  const [stake, setStake] = useState(parent.readOnly ? 0 : PLAY_STAKE);
  const [ready, setReady] = useState(Boolean(parent.readOnly));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parent.readOnly) {
      setReady(true);
      return;
    }
    const storageKey = `hk-play:${deckId}:${template}`;
    const key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    setClientKey(key);
    void startGameRunAction({ deckId, template, clientKey: key })
      .then((result) => {
        setStake(result.stake);
        setReady(true);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not start.");
      });
  }, [deckId, parent.readOnly, template]);

  if (error) {
    return (
      <section className="play-finish mx-auto max-w-lg">
        <p className="play-finish-cup" aria-hidden>
          ⚡
        </p>
        <h2 className="page-title mt-2">Need energy</h2>
        <p className="page-subtitle">{error}</p>
        <p className="play-muted mt-3">
          A round costs {PLAY_STAKE} energy. Score 50%+ to win it back; a
          perfect run doubles it.
        </p>
      </section>
    );
  }

  if (!ready) {
    return (
      <section className="play-finish mx-auto max-w-lg">
        <p className="play-muted">Anteing {PLAY_STAKE} energy…</p>
      </section>
    );
  }

  return (
    <PlayOptionsContext.Provider value={{ ...parent, clientKey, stake }}>
      {children}
    </PlayOptionsContext.Provider>
  );
}

export function PlayShell({
  title,
  score,
  maxScore,
  extra,
  lives,
  combo,
  skin = "arcade",
  children,
}: {
  title: string;
  score: number;
  maxScore: number;
  extra?: string;
  lives?: number;
  combo?: number;
  skin?: PlaySkin;
  children: React.ReactNode;
}) {
  return (
    <section className={`play-stage play-stage--${skin} study-mobile mx-auto max-w-xl`}>
      <div className="play-hud">
        <h2 className="play-hud-title">{title}</h2>
        <div className="flex items-center gap-2">
          {combo && combo > 1 ? (
            <span className="play-combo">x{combo}</span>
          ) : null}
          {typeof lives === "number" ? (
            <div className="play-hearts" aria-label={`${lives} lives`}>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i}>{i < lives ? "❤️" : "🖤"}</span>
              ))}
            </div>
          ) : null}
          <span className="play-hud-score">
            {score}/{maxScore}
            {extra ? ` · ${extra}` : ""}
          </span>
        </div>
      </div>
      {children}
    </section>
  );
}

export function PlayFinished({
  deckId,
  template,
  score,
  maxScore,
  message,
}: {
  deckId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
  message?: string;
}) {
  const router = useRouter();
  const options = useContext(PlayOptionsContext);
  const saved = useRef(false);
  const [payout, setPayout] = useState<{
    stake: number;
    payout: number;
    net: number;
  } | null>(null);

  useEffect(() => {
    if (options.readOnly || saved.current) return;
    saved.current = true;
    sessionStorage.removeItem(`hk-play:${deckId}:${template}`);
    void completeGameRunAction({
      deckId,
      template,
      score,
      maxScore,
      clientKey: options.clientKey,
    })
      .then((result) => {
        setPayout({
          stake: result.stake,
          payout: result.payout,
          net: result.net,
        });
        router.refresh();
      })
      .catch(() => undefined);
  }, [
    deckId,
    template,
    score,
    maxScore,
    options.readOnly,
    options.clientKey,
    router,
  ]);

  const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const home = options.homeHref ?? `/decks/${deckId}/play`;
  const replayBase = options.replayHref ?? `/decks/${deckId}/play/${template}`;
  const won = (payout?.payout ?? 0) > 0 || (maxScore > 0 && score / maxScore >= 0.5);

  return (
    <section className="play-finish mx-auto max-w-lg">
      <div className="play-finish-cup" aria-hidden>
        {won ? "🏆" : "💀"}
      </div>
      <p className="eyebrow mt-2">{won ? "You won" : "Round over"}</p>
      <h2 className="page-title mt-2">
        {score}/{maxScore}
      </h2>
      <p className="page-subtitle">
        {pct}% · {message ?? (won ? "Stake returned — nice run." : "The ante stays in the pot.")}
      </p>
      {payout && payout.stake > 0 ? (
        <p className="mt-3 font-black">
          {payout.net >= 0
            ? `+${payout.payout} energy back`
            : `${payout.stake} energy spent`}
          {payout.net > 0 ? ` · profit ${payout.net}` : ""}
        </p>
      ) : null}
      <div className="mt-8 flex justify-center gap-3">
        <button
          className="secondary-button"
          onClick={() => router.push(home)}
          type="button"
        >
          More activities
        </button>
        <button
          className="primary-button"
          onClick={() =>
            router.push(
              `${replayBase}${replayBase.includes("?") ? "&" : "?"}t=${Date.now()}`,
            )
          }
          type="button"
        >
          Play again
        </button>
      </div>
    </section>
  );
}

export function WhyBox({
  ok,
  why,
  onContinue,
}: {
  ok: boolean;
  why?: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="play-why space-y-3">
      <p className={ok ? "play-why-ok" : "play-why-miss"}>
        {ok ? "Nice hit" : "Miss"}
      </p>
      {why ? <p className="play-muted">{why}</p> : null}
      <button className="primary-button" onClick={onContinue} type="button">
        Continue
      </button>
    </div>
  );
}
