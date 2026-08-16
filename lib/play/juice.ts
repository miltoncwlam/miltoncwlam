export type PlayBeep = "hit" | "miss" | "combo" | "win" | "lose" | "go";

const TONES: Record<PlayBeep, { freq: number; dur: number; second?: number }> = {
  hit: { freq: 880, dur: 0.09 },
  miss: { freq: 180, dur: 0.16 },
  combo: { freq: 1174, dur: 0.08, second: 1568 },
  win: { freq: 523, dur: 0.22, second: 784 },
  lose: { freq: 140, dur: 0.28 },
  go: { freq: 660, dur: 0.12, second: 880 },
};

let ctx: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function playBeep(kind: PlayBeep) {
  if (process.env.NODE_ENV === "test") return;
  try {
    const audio = context();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();
    const tone = TONES[kind];
    const now = audio.currentTime;
    const speak = (freq: number, at: number, dur: number) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(at);
      osc.stop(at + dur);
    };
    speak(tone.freq, now, tone.dur);
    if (tone.second) speak(tone.second, now + 0.08, tone.dur);
  } catch {
    // Audio is optional juice — never block play.
  }
}

export const ARCADE_CLOCK = 75;

const ARCADE_SKINS = new Set([
  "mole",
  "balloon",
  "maze",
  "plane",
  "arcade",
  "neon",
  "match",
  "puzzle",
]);

export function clockSecondsForSkin(skin: string, timed?: boolean) {
  if (timed) return 60;
  if (ARCADE_SKINS.has(skin)) return ARCADE_CLOCK;
  return 0;
}
