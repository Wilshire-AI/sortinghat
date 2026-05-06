import type { Borough } from '@content/types';

type Props = {
  borough: Borough;
  variantSeed?: string;
  className?: string;
};

// A unique editorial illustration per borough, rendered as inline SVG.
// Same primitive vocabulary across boroughs (rect, circle, path) but composed
// to express character: vertical skyline for Manhattan, brownstones for
// Brooklyn, elevated lines + low-rise for Queens, hills + trees for the
// Bronx, ferry + horizon for SI, distant skyline across water for NJ.
//
// `variantSeed` (e.g., neighborhood id) lightly varies element positions so
// neighborhoods of the same borough don't render identically.

export function BoroughHero({ borough, variantSeed = 'a', className }: Props) {
  // Cheap deterministic 0..1 variation from the seed
  const v = (() => {
    let h = 0;
    for (let i = 0; i < variantSeed.length; i++) {
      h = (h * 31 + variantSeed.charCodeAt(i)) | 0;
    }
    return Math.abs(h % 1000) / 1000;
  })();

  const composition = (() => {
    switch (borough) {
      case 'manhattan': return <ManhattanHero v={v} />;
      case 'brooklyn': return <BrooklynHero v={v} />;
      case 'queens': return <QueensHero v={v} />;
      case 'bronx': return <BronxHero v={v} />;
      case 'staten-island': return <StatenIslandHero v={v} />;
      case 'nj': return <NJHero v={v} />;
    }
  })();

  return (
    <svg
      viewBox="0 0 320 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      {composition}
    </svg>
  );
}

// ---------- Manhattan: dramatic vertical skyline ----------
function ManhattanHero({ v }: { v: number }) {
  // Layered skyscrapers, varying widths, with scattered "windows."
  const cols = [
    { x: 0, w: 28, h: 240 + v * 30 },
    { x: 30, w: 22, h: 180 + v * 40 },
    { x: 54, w: 38, h: 300 + v * 30 },
    { x: 94, w: 26, h: 210 + v * 50 },
    { x: 122, w: 32, h: 270 + v * 20 },
    { x: 156, w: 24, h: 200 + v * 60 },
    { x: 182, w: 36, h: 320 + v * 20 },
    { x: 220, w: 28, h: 230 + v * 40 },
    { x: 250, w: 22, h: 180 + v * 30 },
    { x: 274, w: 46, h: 280 + v * 20 },
  ];
  const baseline = 400;
  return (
    <>
      <defs>
        <linearGradient id="m-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4a574" />
          <stop offset="0.6" stopColor="#8b5a3c" />
          <stop offset="1" stopColor="#3e2618" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#m-bg)" />
      {/* Distant wash of buildings (lighter) */}
      <g opacity="0.35">
        {cols.map((c, i) => (
          <rect
            key={`d${i}`}
            x={c.x - 2}
            y={baseline - c.h * 0.7}
            width={c.w + 4}
            height={c.h * 0.7}
            fill="#5a3a26"
          />
        ))}
      </g>
      {/* Foreground skyline */}
      {cols.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={baseline - c.h}
          width={c.w}
          height={c.h}
          fill="#2b1a10"
        />
      ))}
      {/* Scattered window dots */}
      {cols.flatMap((c, ci) =>
        Array.from({ length: 6 }).map((_, ri) => {
          const wx = c.x + 4 + ((ri * 7 + ci * 5) % (c.w - 8));
          const wy = baseline - c.h + 18 + ri * 32 + ((ci * 11) % 12);
          if (wy > baseline - 8) return null;
          return <rect key={`w${ci}-${ri}`} x={wx} y={wy} width="3" height="4" fill="#f4ede2" opacity="0.55" />;
        }),
      )}
      {/* Moon */}
      <circle cx={258 + v * 20} cy={70 + v * 30} r="14" fill="#f4ede2" opacity="0.85" />
    </>
  );
}

// ---------- Brooklyn: brownstone facade row ----------
function BrooklynHero({ v }: { v: number }) {
  const houses = Array.from({ length: 5 }).map((_, i) => ({
    x: i * 64,
    w: 60,
    facadeStart: 80 + ((i + Math.floor(v * 5)) % 3) * 4,
  }));
  return (
    <>
      <defs>
        <linearGradient id="b-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c97e5e" />
          <stop offset="0.6" stopColor="#7d3f2c" />
          <stop offset="1" stopColor="#3e1d14" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#b-bg)" />
      {/* Sky ornament: faint tree silhouette behind */}
      <g opacity="0.3">
        <circle cx="40" cy="80" r="40" fill="#5a2a1a" />
        <circle cx="280" cy="60" r="36" fill="#5a2a1a" />
      </g>
      {/* Brownstone row */}
      {houses.map((h, i) => (
        <g key={i}>
          {/* Facade */}
          <rect x={h.x + 2} y={h.facadeStart} width={h.w - 4} height={400 - h.facadeStart} fill="#2a130a" />
          {/* Cornice */}
          <rect x={h.x} y={h.facadeStart - 6} width={h.w} height="6" fill="#3a1a0e" />
          {/* Stoop */}
          <rect x={h.x + 18} y={400 - 30} width={h.w - 36} height="30" fill="#4a2316" />
          {/* Door */}
          <rect x={h.x + 26} y={400 - 64} width="10" height="34" fill="#5a3422" />
          {/* Windows: 3 floors */}
          {[0, 1, 2].map((floor) => (
            <g key={floor}>
              <rect x={h.x + 12} y={h.facadeStart + 24 + floor * 60} width="14" height="22" fill="#d4a574" opacity={0.85 - floor * 0.15} />
              <rect x={h.x + 36} y={h.facadeStart + 24 + floor * 60} width="14" height="22" fill="#d4a574" opacity={0.85 - floor * 0.15} />
            </g>
          ))}
        </g>
      ))}
    </>
  );
}

// ---------- Queens: mid-rise + diagonal elevated track ----------
function QueensHero({ v }: { v: number }) {
  return (
    <>
      <defs>
        <linearGradient id="q-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4a07c" />
          <stop offset="0.6" stopColor="#876043" />
          <stop offset="1" stopColor="#3f2b1c" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#q-bg)" />
      {/* Diagonal elevated rail (suggests 7 train) */}
      <g opacity="0.7">
        <rect x="-20" y={140 + v * 30} width="380" height="6" fill="#2a1a0e" transform="rotate(-7 160 200)" />
        <rect x="-20" y={156 + v * 30} width="380" height="3" fill="#2a1a0e" transform="rotate(-7 160 200)" />
        {/* Pillars */}
        {[40, 110, 180, 250].map((x) => (
          <rect key={x} x={x} y={148 + v * 30} width="4" height={400 - 148 - v * 30} fill="#2a1a0e" transform="rotate(-7 160 200)" />
        ))}
      </g>
      {/* Mid-rise blocks in foreground */}
      <g>
        <rect x="0" y="240" width="80" height="160" fill="#1f1408" />
        <rect x="80" y="280" width="60" height="120" fill="#2a1a0e" />
        <rect x="140" y="220" width="100" height="180" fill="#1a0f06" />
        <rect x="240" y="270" width="80" height="130" fill="#2a1a0e" />
      </g>
      {/* Window grid on largest building */}
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <rect
            key={`${row}-${col}`}
            x={146 + col * 18}
            y={228 + row * 18}
            width="6"
            height="8"
            fill="#d4a574"
            opacity="0.6"
          />
        )),
      )}
    </>
  );
}

// ---------- Bronx: rolling hills + trees ----------
function BronxHero({ v }: { v: number }) {
  return (
    <>
      <defs>
        <linearGradient id="bx-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9eb582" />
          <stop offset="0.6" stopColor="#5a7548" />
          <stop offset="1" stopColor="#2c3a23" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#bx-bg)" />
      {/* Distant hills */}
      <path d="M0 220 Q 80 180 160 200 T 320 190 L 320 400 L 0 400 Z" fill="#3e5530" opacity="0.7" />
      <path d="M0 260 Q 100 220 200 240 T 320 235 L 320 400 L 0 400 Z" fill="#2c3e22" />
      {/* Tree clumps */}
      {[
        { x: 40, y: 220, r: 22 },
        { x: 90, y: 235, r: 16 },
        { x: 230, y: 215, r: 24 },
        { x: 280, y: 230, r: 18 },
        { x: 160, y: 250, r: 14 },
      ].map((t, i) => (
        <g key={i} transform={`translate(${t.x + (v - 0.5) * 8} ${t.y})`}>
          <circle r={t.r} fill="#1f2c14" />
          <circle r={t.r * 0.8} cx="-6" cy="-3" fill="#2c3e22" />
        </g>
      ))}
      {/* Single tall tree foreground */}
      <g transform="translate(54 280)">
        <rect x="-2" y="0" width="4" height="40" fill="#1a0f06" />
        <circle cx="0" cy="-6" r="22" fill="#1f2c14" />
      </g>
    </>
  );
}

// ---------- Staten Island: horizon + ferry ----------
function StatenIslandHero({ v }: { v: number }) {
  return (
    <>
      <defs>
        <linearGradient id="si-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8b5c4" />
          <stop offset="0.5" stopColor="#5d6d80" />
          <stop offset="1" stopColor="#2c343f" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#si-bg)" />
      {/* Distant Manhattan silhouette */}
      <g opacity="0.55" transform="translate(0 195)">
        {[0, 22, 34, 50, 70, 92, 108, 130, 148, 174, 196, 218, 240, 262, 280, 298].map((x, i) => (
          <rect key={i} x={x} y={-(((i * 7 + Math.floor(v * 13)) % 18) + 6)} width={i % 2 ? 14 : 18} height={50} fill="#1a1410" />
        ))}
      </g>
      <rect x="0" y="220" width="320" height="6" fill="#1a1410" opacity="0.5" />
      {/* Water bands */}
      <rect x="0" y="226" width="320" height="174" fill="#2c343f" opacity="0.4" />
      {[230, 250, 280, 320, 360].map((y) => (
        <rect key={y} x="0" y={y} width="320" height="2" fill="#a8b5c4" opacity="0.18" />
      ))}
      {/* Ferry */}
      <g transform={`translate(${110 + v * 20} 290)`}>
        <rect x="0" y="20" width="100" height="22" fill="#dcc89a" />
        <rect x="6" y="6" width="88" height="14" fill="#f4ede2" />
        <rect x="14" y="10" width="6" height="6" fill="#1a1410" />
        <rect x="28" y="10" width="6" height="6" fill="#1a1410" />
        <rect x="42" y="10" width="6" height="6" fill="#1a1410" />
        <rect x="56" y="10" width="6" height="6" fill="#1a1410" />
        <rect x="70" y="10" width="6" height="6" fill="#1a1410" />
        <rect x="84" y="10" width="6" height="6" fill="#1a1410" />
        <path d="M0 20 L -8 30 L 0 42 Z" fill="#dcc89a" />
        <path d="M100 20 L 108 30 L 100 42 Z" fill="#dcc89a" />
      </g>
    </>
  );
}

// ---------- NJ: distant Manhattan across the river ----------
function NJHero({ v }: { v: number }) {
  return (
    <>
      <defs>
        <linearGradient id="nj-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b89e8f" />
          <stop offset="0.5" stopColor="#6e5c50" />
          <stop offset="1" stopColor="#352c25" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#nj-bg)" />
      {/* Sun/moon */}
      <circle cx={70 + v * 40} cy="90" r="22" fill="#f4ede2" opacity="0.85" />
      {/* Distant Manhattan */}
      <g transform="translate(0 200)">
        {[
          { x: 6, w: 12, h: 36 },
          { x: 22, w: 16, h: 52 },
          { x: 42, w: 10, h: 30 },
          { x: 56, w: 22, h: 78 },
          { x: 82, w: 14, h: 44 },
          { x: 100, w: 18, h: 60 },
          { x: 122, w: 12, h: 38 },
          { x: 138, w: 26, h: 90 },
          { x: 168, w: 14, h: 50 },
          { x: 186, w: 18, h: 64 },
          { x: 208, w: 12, h: 32 },
          { x: 224, w: 22, h: 78 },
          { x: 250, w: 14, h: 46 },
          { x: 268, w: 18, h: 56 },
          { x: 290, w: 24, h: 70 },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={-b.h} width={b.w} height={b.h} fill="#2a1a10" />
        ))}
      </g>
      <rect x="0" y="200" width="320" height="3" fill="#1a1006" opacity="0.6" />
      {/* Water with reflections */}
      <rect x="0" y="203" width="320" height="197" fill="#2a221c" opacity="0.5" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect
          key={i}
          x={(i * 23 + (v * 100) | 0) % 320}
          y={210 + (i % 5) * 22}
          width={i % 3 === 0 ? 6 : 12}
          height="2"
          fill="#b89e8f"
          opacity="0.35"
        />
      ))}
      {/* Foreground promenade rail */}
      <rect x="0" y="370" width="320" height="2" fill="#1a1006" opacity="0.7" />
    </>
  );
}
