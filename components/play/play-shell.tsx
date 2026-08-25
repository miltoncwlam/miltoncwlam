"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  completeGameRunAction,
  startGameRunAction,
} from "@/lib/actions/games";
import { PLAY_STAKE } from "@/lib/credits/play";
import {
  clockSecondsForSkin,
  playBeep,
  prefersReducedMotion,
} from "@/lib/play/juice";
import {
  isPublicPlayCatalog,
  PLAY_TEMPLATES,
  resolvePlayTemplate,
  type PlayTemplateId,
} from "@/lib/play/templates";
import type { PlaySkin } from "@/lib/play/worlds";

export type PlayOptions = {
  readOnly?: boolean;
  homeHref?: string;
  replayHref?: string;
  clientKey?: string;
  stake?: number;
  deckId?: string;
  template?: PlayTemplateId;
  classLinkId?: string | null;
};

type PlayJuiceValue = {
  remaining: number;
  started: boolean;
  addTime: (delta: number) => void;
};

const PlayOptionsContext = createContext<PlayOptions>({});
const PlayJuiceContext = createContext<PlayJuiceValue>({
  remaining: 90,
  started: true,
  addTime: () => undefined,
});

export function usePlayJuice() {
  return useContext(PlayJuiceContext);
}

function isTestEnv() {
  return process.env.NODE_ENV === "test";
}

/** Labels flash, then hide. Tests hide at once; reduced-motion keeps labels. */
export function usePeekLabels(resetKey: unknown, ms = 1200) {
  const reduce = prefersReducedMotion();
  const test = isTestEnv();
  const [hiddenFor, setHiddenFor] = useState<unknown>(null);
  useEffect(() => {
    if (reduce && !test) return;
    const id = window.setTimeout(() => setHiddenFor(resetKey), test ? 0 : ms);
    return () => window.clearTimeout(id);
  }, [resetKey, ms, reduce, test]);
  if (reduce && !test) return true;
  return hiddenFor !== resetKey;
}

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
  const t = useTranslations("play");
  const [clientKey, setClientKey] = useState("");
  const [stake, setStake] = useState(parent.readOnly ? 0 : PLAY_STAKE);
  const [ready, setReady] = useState(Boolean(parent.readOnly));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parent.readOnly) return;
    const storageKey = `hk-play:${deckId}:${template}`;
    const key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    void startGameRunAction({
      deckId,
      template,
      clientKey: key,
      classLinkId: parent.classLinkId ?? undefined,
    })
      .then((result) => {
        setClientKey(key);
        setStake(result.stake);
        setReady(true);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not start.");
      });
  }, [deckId, parent.readOnly, parent.classLinkId, template]);

  if (error) {
    return (
      <section className="play-finish mx-auto max-w-lg">
        <p className="play-finish-cup" aria-hidden>
          ⚡
        </p>
        <h2 className="page-title mt-2">
          {error.includes("Too many") ? t("slowDown") : t("needEnergy")}
        </h2>
        <p className="page-subtitle">{error}</p>
        <p className="play-muted mt-3">{t("anteHelp", { stake: PLAY_STAKE })}</p>
      </section>
    );
  }

  if (!ready) {
    return (
      <section className="play-finish mx-auto max-w-lg">
        <p className="play-muted">{t("anteing", { stake: PLAY_STAKE })}</p>
        <p className="play-muted mt-2">{t("quitWarning", { stake: PLAY_STAKE })}</p>
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
  clock,
  skin = "arcade",
  children,
}: {
  title: string;
  score: number;
  maxScore: number;
  extra?: string;
  lives?: number;
  combo?: number;
  clock?: number | false;
  skin?: PlaySkin;
  children: React.ReactNode;
}) {
  const options = useContext(PlayOptionsContext);
  const t = useTranslations("play");
  const skipCount = isTestEnv() || prefersReducedMotion() || Boolean(options.readOnly);
  const [count, setCount] = useState(skipCount ? 0 : 3);
  const [hidden, setHidden] = useState(false);
  const started = count <= 0;
  const initial = clock === false ? 0 : (clock ?? clockSecondsForSkin(skin));
  const catalogId = options.template
    ? resolvePlayTemplate(options.template)
    : null;
  const i18nId =
    catalogId && catalogId !== "study" ? catalogId : options.template;
  const publicCopy = isPublicPlayCatalog()
    ? PLAY_TEMPLATES.find((item) => item.id === catalogId)
    : null;
  const heading = publicCopy?.name ?? (i18nId ? t(`templates.${i18nId}.name`) : title);
  const [remaining, setRemaining] = useState(initial);
  const comboRef = useRef(combo ?? 0);
  const howKey = i18nId
    ? `${isPublicPlayCatalog() ? "play-how-public" : "hk-play-how"}:${i18nId}`
    : "";
  const [howTo, setHowTo] = useState(() => {
    if (isTestEnv() || options.readOnly || !howKey) return false;
    try {
      return !localStorage.getItem(howKey);
    } catch {
      return true;
    }
  });
  const expired = started && initial > 0 && remaining <= 0 && !howTo;

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (skipCount || count <= 0 || hidden) return;
    const id = window.setTimeout(() => {
      setCount((n) => n - 1);
      if (count === 1) playBeep("go");
    }, 400);
    return () => window.clearTimeout(id);
  }, [count, skipCount, hidden]);

  useEffect(() => {
    if (!started || initial <= 0 || remaining <= 0 || hidden || howTo) return;
    const id = window.setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [started, initial, remaining, hidden, howTo]);

  useEffect(() => {
    const next = combo ?? 0;
    if (next > comboRef.current && next > 1 && initial > 0) {
      setRemaining((n) => n + 2);
      playBeep("combo");
    }
    comboRef.current = next;
  }, [combo, initial]);

  const addTime = useCallback((delta: number) => {
    setRemaining((n) => Math.max(0, n + delta));
  }, []);
  const juice = useMemo(
    () => ({ remaining, started, addTime }),
    [remaining, started, addTime],
  );

  function dismissHowTo() {
    try {
      if (howKey) localStorage.setItem(howKey, "1");
    } catch {
      // ignore
    }
    setHowTo(false);
  }

  if (expired && options.deckId && options.template) {
    return (
      <PlayFinished
        deckId={options.deckId}
        maxScore={maxScore}
        message={t("timeUp")}
        score={score}
        template={options.template}
      />
    );
  }

  const howToText = publicCopy
    ? publicCopy.id === "matching-pairs"
      ? "Flip two cards. A match stays open. A miss closes both."
      : "Type the term, then check. An empty answer does not count."
    : i18nId
      ? t(`templates.${i18nId}.howTo`)
      : "";

  return (
    <PlayJuiceContext.Provider value={juice}>
      <section className={`play-stage play-stage--${skin} play-stage--activities study-mobile mx-auto max-w-2xl${isPublicPlayCatalog() ? " is-public" : ""}`}>
        <div className="play-hud">
          <h2 className="play-hud-title">{heading}</h2>
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
            <span className="play-hud-score play-allowance">
              {score}/{maxScore}
              {initial > 0 ? ` · ${remaining}s` : ""}
              {extra ? ` · ${extra}` : ""}
            </span>
          </div>
        </div>
        {!started ? (
          <div className="play-countdown" aria-live="assertive">
            {count}
          </div>
        ) : howTo ? (
          <div className="play-howto">
            <p className="play-howto-note">{howToText}</p>
            <button className="primary-button" onClick={dismissHowTo} type="button">
              {t("howToSkip")}
            </button>
          </div>
        ) : (
          children
        )}
      </section>
    </PlayJuiceContext.Provider>
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
  const t = useTranslations("play");
  const options = useContext(PlayOptionsContext);
  const saved = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [payout, setPayout] = useState<{
    stake: number;
    payout: number;
    net: number;
  } | null>(null);

  useEffect(() => {
    if (options.readOnly || saved.current) return;
    if (maxScore < 1) return;
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
      .catch((caught) => {
        setSaveError(
          caught instanceof Error ? caught.message : t("saveFailed"),
        );
      });
  }, [
    deckId,
    template,
    score,
    maxScore,
    options.readOnly,
    options.clientKey,
    router,
    t,
  ]);

  const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const home = options.homeHref ?? `/decks/${deckId}/play`;
  const replayBase = options.replayHref ?? `/decks/${deckId}/play/${template}`;
  const won = (payout?.payout ?? 0) > 0 || (maxScore > 0 && score / maxScore >= 0.5);
  const fanfare = useRef(false);
  useEffect(() => {
    if (fanfare.current) return;
    fanfare.current = true;
    playBeep(won ? "win" : "lose");
  }, [won]);

  return (
    <section className="play-finish mx-auto max-w-lg">
      <div className="play-finish-cup" aria-hidden>
        {won ? "🏆" : "💀"}
      </div>
      <p className="eyebrow mt-2">{won ? t("youWon") : t("roundOver")}</p>
      <h2 className="page-title mt-2">
        {score}/{maxScore}
      </h2>
      <p className="page-subtitle">
        {pct}% · {message ?? (won ? t("stakeReturned") : t("anteKept"))}
      </p>
      {saveError ? <p className="play-why-miss mt-3">{saveError}</p> : null}
      {payout && payout.stake > 0 ? (
        <p className="mt-3 font-black">
          {payout.net > 0
            ? t("payoutProfit", { payout: payout.payout, net: payout.net })
            : payout.net === 0
              ? t("payoutEven", { payout: payout.payout })
              : t("payoutLoss", { stake: payout.stake })}
        </p>
      ) : null}
      <div className="mt-8 flex justify-center gap-3">
        <button
          className="secondary-button"
          onClick={() => router.push(home)}
          type="button"
        >
          {t("moreActivities")}
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
          {t("playAgain")}
        </button>
      </div>
    </section>
  );
}

export function WhyBox({
  ok,
  why,
  source,
  onContinue,
}: {
  ok: boolean;
  why?: string | null;
  source?: "exact" | "ai" | "reject";
  onContinue: () => void;
}) {
  const t = useTranslations("play");
  const heard = useRef(false);
  useEffect(() => {
    if (heard.current) return;
    heard.current = true;
    playBeep(ok ? "hit" : "miss");
  }, [ok]);

  const label =
    source === "exact"
      ? t("exactMatch")
      : source === "ai"
        ? t("aiAccepted")
        : ok
          ? t("niceHit")
          : t("miss");

  return (
    <div className="play-why space-y-3">
      <p className={ok ? "play-why-ok" : "play-why-miss play-stamp"}>
        {ok ? label : `${label} · 印`}
      </p>
      {why ? <p className="play-muted">{why}</p> : null}
      <button className="primary-button" onClick={onContinue} type="button">
        {t("continue")}
      </button>
    </div>
  );
}
