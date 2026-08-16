export function MoleSvg({ squash = false }: { squash?: boolean }) {
  return (
    <svg
      aria-hidden
      className={squash ? "play-mole-svg play-mole-svg--hit" : "play-mole-svg"}
      viewBox="0 0 80 90"
    >
      <ellipse cx="40" cy="86" fill="#3d2a1a" opacity="0.35" rx="22" ry="5" />
      <ellipse cx="40" cy="52" fill="#6b3f24" rx="26" ry="28" />
      <ellipse cx="40" cy="48" fill="#8a5533" rx="22" ry="22" />
      <ellipse cx="28" cy="28" fill="#6b3f24" rx="10" ry="12" />
      <ellipse cx="52" cy="28" fill="#6b3f24" rx="10" ry="12" />
      <ellipse cx="28" cy="28" fill="#c98a6a" rx="5" ry="6" />
      <ellipse cx="52" cy="28" fill="#c98a6a" rx="5" ry="6" />
      <circle cx="32" cy="46" fill="#1a120c" r="4" />
      <circle cx="48" cy="46" fill="#1a120c" r="4" />
      <circle cx="33" cy="45" fill="#fff" r="1.4" />
      <circle cx="49" cy="45" fill="#fff" r="1.4" />
      <ellipse cx="40" cy="56" fill="#e89aa8" rx="6" ry="4" />
      <path d="M34 63 Q40 70 46 63" fill="none" stroke="#3d2a1a" strokeWidth="2" />
      <path d="M18 70 L8 62 M18 74 L6 74 M18 78 L10 86" stroke="#c98a6a" strokeWidth="3" />
      <path d="M62 70 L72 62 M62 74 L74 74 M62 78 L70 86" stroke="#c98a6a" strokeWidth="3" />
    </svg>
  );
}

export function BalloonSvg({
  color,
  popped,
}: {
  color: string;
  popped?: boolean;
}) {
  return (
    <svg
      aria-hidden
      className={popped ? "play-balloon-svg play-balloon-svg--pop" : "play-balloon-svg"}
      viewBox="0 0 70 120"
    >
      <path d="M35 8 C18 8 8 28 8 44 C8 66 22 82 35 82 C48 82 62 66 62 44 C62 28 52 8 35 8Z" fill={color} />
      <ellipse cx="26" cy="32" fill="#fff" opacity="0.35" rx="8" ry="14" />
      <path d="M35 82 L32 88 L38 88 Z" fill={color} />
      <path d="M35 88 Q28 100 35 110 Q42 100 35 88" fill="none" stroke="#cbd5e1" strokeWidth="2" />
    </svg>
  );
}

export function PlaneSvg() {
  return (
    <svg aria-hidden className="play-plane-svg" viewBox="0 0 120 48">
      <ellipse cx="58" cy="24" fill="#f4f1ea" rx="48" ry="10" />
      <path d="M20 24 L70 10 L108 22 L70 34 Z" fill="#e8c56b" />
      <path d="M70 22 L118 18 L118 26 Z" fill="#c45c4a" />
      <path d="M48 22 L62 4 L78 22 Z" fill="#6f9f8a" />
      <path d="M48 24 L62 44 L78 24 Z" fill="#4f7d6b" />
      <circle cx="42" cy="22" fill="#1c1f1e" r="4" />
    </svg>
  );
}

export function ChestSvg({ open = false }: { open?: boolean }) {
  return (
    <svg aria-hidden className="play-chest-svg" viewBox="0 0 88 72">
      {open ? (
        <path d="M10 28 L10 8 Q44 -6 78 8 L78 28" fill="#c4a574" stroke="#3d2a1a" strokeWidth="3" />
      ) : null}
      <rect fill="#b45309" height="36" rx="6" stroke="#3d2a1a" strokeWidth="3" width="68" x="10" y="28" />
      <rect fill="#fbbf24" height="10" width="68" x="10" y="40" />
      <circle cx="44" cy="45" fill="#fde68a" r="6" stroke="#3d2a1a" strokeWidth="2" />
      {!open ? (
        <path d="M10 28 Q44 12 78 28" fill="#d4a017" stroke="#3d2a1a" strokeWidth="3" />
      ) : (
        <ellipse cx="44" cy="34" fill="#fde68a" opacity="0.85" rx="14" ry="6" />
      )}
    </svg>
  );
}

export function GhostSvg() {
  return (
    <svg aria-hidden className="play-ghost-svg" viewBox="0 0 48 56">
      <path
        d="M8 24 Q8 6 24 6 Q40 6 40 24 L40 48 L33 42 L24 48 L15 42 L8 48 Z"
        fill="#9b7ed9"
      />
      <circle cx="18" cy="24" fill="#1c1f1e" r="4" />
      <circle cx="30" cy="24" fill="#1c1f1e" r="4" />
      <circle cx="19" cy="23" fill="#fff" r="1.3" />
    </svg>
  );
}

export function HeroSvg() {
  return (
    <svg aria-hidden className="play-hero-svg" viewBox="0 0 40 40">
      <circle cx="20" cy="20" fill="#9ec9b4" r="16" />
      <circle cx="20" cy="20" fill="#c5e0d3" r="9" />
      <circle cx="20" cy="20" fill="#fff" r="3" />
    </svg>
  );
}

export function HangmanSvg({ misses }: { misses: number }) {
  return (
    <svg aria-hidden className="play-hang-svg" viewBox="0 0 140 168">
      <ellipse cx="70" cy="158" fill="#1a120c" opacity="0.35" rx="48" ry="6" />
      <path d="M18 152 L122 152" stroke="#c4a574" strokeLinecap="round" strokeWidth="10" />
      <path d="M40 152 L40 18" stroke="#c4a574" strokeLinecap="round" strokeWidth="10" />
      <path d="M36 18 L102 18" stroke="#c4a574" strokeLinecap="round" strokeWidth="10" />
      <path d="M96 18 L96 38" stroke="#e8c56b" strokeLinecap="round" strokeWidth="5" />
      {misses >= 1 ? (
        <g>
          <circle cx="96" cy="52" fill="#f6e7c8" r="13" stroke="#1c1f1e" strokeWidth="3" />
          <circle cx="91" cy="50" fill="#1c1f1e" r="2" />
          <circle cx="101" cy="50" fill="#1c1f1e" r="2" />
          <path d="M91 58 Q96 61 101 58" fill="none" stroke="#1c1f1e" strokeWidth="2" />
        </g>
      ) : null}
      {misses >= 2 ? (
        <path d="M96 65 L96 104" stroke="#1c1f1e" strokeLinecap="round" strokeWidth="5" />
      ) : null}
      {misses >= 3 ? (
        <path d="M96 76 L78 92" stroke="#1c1f1e" strokeLinecap="round" strokeWidth="5" />
      ) : null}
      {misses >= 4 ? (
        <path d="M96 76 L114 92" stroke="#1c1f1e" strokeLinecap="round" strokeWidth="5" />
      ) : null}
      {misses >= 5 ? (
        <path d="M96 104 L80 132" stroke="#1c1f1e" strokeLinecap="round" strokeWidth="5" />
      ) : null}
      {misses >= 6 ? (
        <path d="M96 104 L112 132" stroke="#1c1f1e" strokeLinecap="round" strokeWidth="5" />
      ) : null}
    </svg>
  );
}

export function MicSvg() {
  return (
    <svg aria-hidden className="play-mic-svg" viewBox="0 0 72 96">
      <rect fill="#1c1f1e" height="18" rx="4" width="10" x="31" y="62" />
      <path d="M18 48 Q18 72 36 78 Q54 72 54 48" fill="none" stroke="#c4a574" strokeWidth="4" />
      <rect fill="#c4a574" height="8" rx="2" width="28" x="22" y="76" />
      <rect fill="#f6e7c8" height="44" rx="16" stroke="#1c1f1e" strokeWidth="3" width="28" x="22" y="10" />
      <path d="M28 20 H44 M28 28 H44 M28 36 H44" stroke="#c4a574" strokeWidth="2" />
    </svg>
  );
}

export const BALLOON_COLORS = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#c77dff", "#f4a261"];

const LANTERN_HUES = {
  red: { body: "#d62828", rib: "#8b1515", glow: "#ffb347" },
  gold: { body: "#e0a325", rib: "#9a6b10", glow: "#ffe08a" },
  pink: { body: "#e85a7a", rib: "#9b1c40", glow: "#ffc2d1" },
} as const;

export function LanternSvg({
  lit = false,
  hue = "red",
}: {
  lit?: boolean;
  hue?: keyof typeof LANTERN_HUES;
}) {
  const c = LANTERN_HUES[hue];
  return (
    <svg aria-hidden className="play-lantern-svg" viewBox="0 0 80 128">
      <ellipse cx="40" cy="122" fill="#000" opacity="0.28" rx="16" ry="4" />
      <path d="M40 4 L40 14" stroke="#c4a574" strokeLinecap="round" strokeWidth="3" />
      <circle cx="40" cy="4" fill="#e8c56b" r="4" stroke="#7a5a20" strokeWidth="1.5" />
      <path d="M18 18 H62 L58 28 H22 Z" fill="#e8c56b" stroke="#7a5a20" strokeWidth="2" />
      {lit ? <ellipse cx="40" cy="62" fill={c.glow} opacity="0.55" rx="22" ry="28" /> : null}
      <path
        d="M22 28 Q12 62 22 96 H58 Q68 62 58 28 Z"
        fill={lit ? c.body : c.rib}
        stroke="#3d120c"
        strokeWidth="2.5"
      />
      <path d="M28 32 Q22 62 28 92" fill="none" stroke={c.rib} strokeWidth="2" />
      <path d="M40 30 L40 94" fill="none" stroke="#e8c56b" strokeWidth="1.6" opacity="0.7" />
      <path d="M52 32 Q58 62 52 92" fill="none" stroke={c.rib} strokeWidth="2" />
      <ellipse cx="40" cy="62" fill="#fff6d8" opacity={lit ? 0.22 : 0.08} rx="10" ry="16" />
      <path d="M22 96 H58 L52 104 H28 Z" fill="#e8c56b" stroke="#7a5a20" strokeWidth="2" />
      <path d="M40 104 L40 118" stroke="#e8c56b" strokeWidth="2" />
      <path d="M34 118 Q40 124 46 118" fill="none" stroke="#c45c4a" strokeWidth="3" />
      {!lit ? (
        <text
          fill="#e8c56b"
          fontFamily="serif"
          fontSize="18"
          fontWeight="700"
          textAnchor="middle"
          x="40"
          y="70"
        >
          福
        </text>
      ) : null}
    </svg>
  );
}

export function NewspaperSvg() {
  return (
    <svg aria-hidden className="play-prop-svg" viewBox="0 0 72 56">
      <rect fill="#f4ead0" height="48" rx="3" stroke="#1c1f1e" strokeWidth="2" width="62" x="5" y="4" />
      <rect fill="#d62828" height="8" width="62" x="5" y="4" />
      <text fill="#fff" fontSize="7" fontWeight="800" x="10" y="10">
        新聞
      </text>
      <path d="M12 20 H56 M12 26 H50 M12 32 H54 M12 38 H42" stroke="#1c1f1e" strokeWidth="2" />
    </svg>
  );
}

export function MosaicTileSvg({ index = 0 }: { index?: number }) {
  const fills = ["#1f8a80", "#c45c4a", "#e8c56b", "#2f6fed"];
  const fill = fills[index % fills.length]!;
  return (
    <svg aria-hidden className="play-prop-svg play-mosaic-svg" viewBox="0 0 72 72">
      <rect fill={fill} height="68" rx="8" stroke="#1c1f1e" strokeWidth="3" width="68" x="2" y="2" />
      <circle cx="36" cy="36" fill="#fff6d8" opacity="0.35" r="16" />
      <path d="M12 36 H60 M36 12 V60" stroke="#fff6d8" strokeWidth="3" />
      <circle cx="36" cy="36" fill="none" r="10" stroke="#1c1f1e" strokeWidth="2" />
      <path d="M18 18 L26 26 M54 18 L46 26 M18 54 L26 46 M54 54 L46 46" stroke="#fff6d8" strokeWidth="2" />
    </svg>
  );
}

export function MilkTeaPaddleSvg() {
  return (
    <svg aria-hidden className="play-paddle-svg" viewBox="0 0 48 120">
      <rect fill="#6b3f24" height="54" rx="3" stroke="#3d2a1a" strokeWidth="2.5" width="11" x="18.5" y="62" />
      <ellipse cx="24" cy="36" fill="#c4a574" rx="20" ry="30" stroke="#3d2a1a" strokeWidth="2.5" />
      <ellipse cx="24" cy="34" fill="#8a4a28" rx="13" ry="18" />
      <ellipse cx="24" cy="30" fill="#efe3cc" opacity="0.55" rx="8" ry="6" />
      <path d="M16 70 H32" stroke="#3d2a1a" strokeWidth="2" />
    </svg>
  );
}

export function TicketStubSvg() {
  return (
    <svg aria-hidden className="play-prop-svg" viewBox="0 0 88 52">
      <path
        d="M4 8 H70 Q78 8 78 16 Q84 20 78 26 Q78 34 70 34 H4 Q10 26 4 18 Z"
        fill="#f6e7c8"
        stroke="#1c1f1e"
        strokeWidth="2"
      />
      <path d="M58 8 V34" stroke="#c45c4a" strokeDasharray="3 3" strokeWidth="2" />
      <circle cx="66" cy="21" fill="#c45c4a" r="5" />
      <text fill="#1c1f1e" fontSize="8" fontWeight="800" x="10" y="24">
        票
      </text>
    </svg>
  );
}

export function FlyerSvg({ penalty = false }: { penalty?: boolean }) {
  return (
    <svg aria-hidden className="play-prop-svg" viewBox="0 0 64 80">
      <rect
        fill={penalty ? "#ffe2e0" : "#fff8e8"}
        height="74"
        rx="3"
        stroke="#1c1f1e"
        strokeWidth="2"
        width="54"
        x="5"
        y="3"
      />
      <rect fill={penalty ? "#c62828" : "#d62828"} height="10" width="54" x="5" y="3" />
      <path d="M12 24 H48 M12 32 H44 M12 40 H46 M12 48 H36" stroke="#1c1f1e" strokeWidth="2" />
    </svg>
  );
}

export function VanSvg({ aligned = false }: { aligned?: boolean }) {
  return (
    <svg aria-hidden className="play-prop-svg play-van-svg" viewBox="0 0 120 72">
      <rect fill={aligned ? "#ff4d4d" : "#d32f2f"} height="38" rx="6" stroke="#1c1f1e" strokeWidth="3" width="92" x="8" y="14" />
      <path d="M100 22 L114 22 L114 48 H100 Z" fill="#2b2b2b" stroke="#1c1f1e" strokeWidth="3" />
      <rect fill="#9ad4f0" height="16" width="22" x="18" y="22" />
      <rect fill="#9ad4f0" height="16" width="22" x="48" y="22" />
      <circle cx="28" cy="56" fill="#1c1f1e" r="8" />
      <circle cx="88" cy="56" fill="#1c1f1e" r="8" />
      <circle cx="28" cy="56" fill="#cbd5e1" r="3" />
      <circle cx="88" cy="56" fill="#cbd5e1" r="3" />
    </svg>
  );
}

export function TramSvg() {
  return (
    <svg aria-hidden className="play-prop-svg play-tram-svg" viewBox="0 0 140 64">
      <path d="M10 8 H130" stroke="#c4a574" strokeWidth="3" />
      <path d="M40 8 L48 18 M90 8 L82 18" stroke="#c4a574" strokeWidth="2" />
      <rect fill="#e85a7a" height="32" rx="6" stroke="#1c1f1e" strokeWidth="3" width="100" x="20" y="18" />
      <rect fill="#ffe08a" height="14" width="18" x="30" y="26" />
      <rect fill="#ffe08a" height="14" width="18" x="56" y="26" />
      <rect fill="#ffe08a" height="14" width="18" x="82" y="26" />
      <circle cx="40" cy="54" fill="#1c1f1e" r="6" />
      <circle cx="100" cy="54" fill="#1c1f1e" r="6" />
    </svg>
  );
}

export function MetroDoorSvg({ open = false }: { open?: boolean }) {
  return (
    <svg aria-hidden className="play-prop-svg" viewBox="0 0 72 96">
      <rect fill="#1c2430" height="90" rx="6" stroke="#c4a574" strokeWidth="3" width="64" x="4" y="3" />
      <rect fill={open ? "#0b1c28" : "#2a3a4a"} height="70" width="24" x="10" y="12" />
      <rect fill={open ? "#0b1c28" : "#2a3a4a"} height="70" width="24" x="38" y="12" />
      {open ? null : <rect fill="#9ad4f0" height="18" width="16" x="14" y="20" />}
      {open ? null : <rect fill="#9ad4f0" height="18" width="16" x="42" y="20" />}
      <circle cx="34" cy="48" fill="#e8c56b" r="3" />
    </svg>
  );
}

export function ShopSignSvg({ n }: { n: number }) {
  const colors = ["#d62828", "#1f8a80", "#2f6fed"];
  return (
    <svg aria-hidden className="play-prop-svg play-sign-svg" viewBox="0 0 80 110">
      <rect fill="#3d2a1a" height="8" width="12" x="34" y="2" />
      <rect fill={colors[(n - 1) % colors.length]} height="88" rx="6" stroke="#1c1f1e" strokeWidth="3" width="64" x="8" y="10" />
      <text fill="#fff8e8" fontSize="22" fontWeight="900" textAnchor="middle" x="40" y="58">
        {n}
      </text>
    </svg>
  );
}

export function LostBagSvg({ index = 0 }: { index?: number }) {
  const fills = ["#6b4a2f", "#2f6fed", "#c45c4a", "#1f8a80"];
  return (
    <svg aria-hidden className="play-prop-svg" viewBox="0 0 72 72">
      <ellipse cx="36" cy="64" fill="#000" opacity="0.2" rx="18" ry="4" />
      <path d="M18 28 H54 L50 58 H22 Z" fill={fills[index % fills.length]} stroke="#1c1f1e" strokeWidth="3" />
      <path d="M28 28 Q36 12 44 28" fill="none" stroke="#1c1f1e" strokeWidth="3" />
      <circle cx="36" cy="42" fill="#e8c56b" r="5" />
    </svg>
  );
}

export function TraySvg() {
  return (
    <svg aria-hidden className="play-prop-svg play-tray-svg" viewBox="0 0 120 56">
      <rect fill="#c4a574" height="36" rx="6" stroke="#3d2a1a" strokeWidth="3" width="108" x="6" y="10" />
      <rect fill="#efe3cc" height="22" rx="3" width="92" x="14" y="18" />
      <path d="M6 38 L2 50 H118 L114 38" fill="#8a6a3a" stroke="#3d2a1a" strokeWidth="2" />
    </svg>
  );
}

export function LateSlipSvg({ letter }: { letter: string }) {
  return (
    <svg aria-hidden className="play-prop-svg" viewBox="0 0 72 88">
      <rect fill="#fff8e8" height="80" rx="4" stroke="#1c1f1e" strokeWidth="2" width="60" x="6" y="4" />
      <rect fill="#c62828" height="14" width="60" x="6" y="4" />
      <text fill="#fff" fontSize="11" fontWeight="800" textAnchor="middle" x="36" y="15">
        LATE
      </text>
      <text fill="#1c1f1e" fontSize="22" fontWeight="900" textAnchor="middle" x="36" y="52">
        {letter}
      </text>
    </svg>
  );
}

export function InkStoneSvg() {
  return (
    <svg aria-hidden className="play-prop-svg play-ink-svg" viewBox="0 0 120 48">
      <ellipse cx="60" cy="28" fill="#1c1f1e" rx="52" ry="16" />
      <ellipse cx="60" cy="24" fill="#2a3344" rx="36" ry="10" />
      <ellipse cx="48" cy="22" fill="#4a5560" opacity="0.7" rx="10" ry="4" />
      <rect fill="#6b3f24" height="8" rx="2" width="28" x="86" y="8" transform="rotate(18 100 12)" />
    </svg>
  );
}
