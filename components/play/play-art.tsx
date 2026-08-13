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
