import Link from 'next/link';
import type { Neighborhood } from '@content/types';

type Props = {
  ranked: { neighborhood: Neighborhood; score: number }[];
};

// Approximate stylized geographic positions in a 1000x800 viewBox.
// Not pixel-perfect — schematic. The goal is "this looks like NYC enough
// that you can locate where you're scoring well at a glance."
const POSITIONS: Record<string, { x: number; y: number }> = {
  // Bronx (top)
  riverdale: { x: 305, y: 95 },

  // Manhattan (vertical, slightly tilted)
  'central-harlem': { x: 335, y: 195 },
  'upper-west-side': { x: 305, y: 270 },
  'upper-east-side': { x: 360, y: 280 },
  'hells-kitchen': { x: 310, y: 340 },
  chelsea: { x: 295, y: 395 },
  gramercy: { x: 345, y: 405 },
  'west-village': { x: 295, y: 445 },
  'east-village': { x: 350, y: 445 },
  tribeca: { x: 295, y: 495 },
  fidi: { x: 320, y: 545 },

  // NJ (left of Manhattan)
  hoboken: { x: 195, y: 405 },
  'jersey-city': { x: 180, y: 470 },

  // Queens (east of Manhattan)
  astoria: { x: 425, y: 290 },
  'long-island-city': { x: 405, y: 340 },
  flushing: { x: 645, y: 290 },
  'forest-hills': { x: 555, y: 385 },

  // Brooklyn (south + east)
  dumbo: { x: 360, y: 480 },
  'brooklyn-heights': { x: 340, y: 510 },
  'cobble-hill': { x: 360, y: 555 },
  williamsburg: { x: 405, y: 455 },
  bushwick: { x: 460, y: 480 },
  'bed-stuy': { x: 445, y: 530 },
  'park-slope': { x: 410, y: 575 },
  'sheepshead-bay': { x: 500, y: 695 },
  'brighton-beach': { x: 470, y: 720 },

  // Staten Island
  'st-george': { x: 195, y: 685 },

  // NJ — additional Bergen waterfront
  'fort-lee': { x: 170, y: 290 },
  edgewater: { x: 160, y: 355 },
  'palisades-park': { x: 130, y: 270 },
};

const boroughLabel: Record<string, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'The Bronx',
  'staten-island': 'Staten Island',
  nj: 'New Jersey',
};

export function NeighborhoodMap({ ranked }: Props) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Geographic lens
      </p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">
        Your matches, mapped
      </h2>
      <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
        Same scores, geographically arranged. Saturated dots are stronger matches.
        Click any neighborhood to read its full profile.
      </p>

      <div className="mt-10 rounded-sm border border-[var(--color-line)] bg-[var(--color-ink)]/[0.02] overflow-hidden">
        <svg
          viewBox="0 0 1000 800"
          className="w-full h-auto block"
          role="img"
          aria-label="Map of NYC neighborhoods colored by match score"
        >
          {/* ---- Water ---- */}
          <rect width="1000" height="800" fill="transparent" />
          {/* Hudson */}
          <path
            d="M 0 0 L 230 0 L 245 100 L 240 200 L 250 350 L 235 500 L 250 650 L 0 720 Z"
            fill="var(--color-line)"
            opacity="0.4"
          />
          {/* East River + Harbor */}
          <path
            d="M 380 200 L 380 100 L 500 80 L 500 280 L 460 320 L 470 410 L 510 450 L 480 540 L 410 600 L 350 660 L 250 720 L 250 800 L 1000 800 L 1000 0 L 500 0 L 480 60 L 460 130 L 410 180 Z"
            fill="var(--color-line)"
            opacity="0.4"
          />

          {/* ---- Borough silhouettes ---- */}
          {/* Bronx */}
          <path
            d="M 250 0 L 480 0 L 480 130 L 460 180 L 380 200 L 280 180 L 245 100 Z"
            fill="var(--color-ink)"
            opacity="0.06"
          />
          {/* Manhattan */}
          <path
            d="M 280 180 L 380 200 L 410 600 L 320 620 L 250 500 L 240 200 Z"
            fill="var(--color-ink)"
            opacity="0.08"
          />
          {/* NJ */}
          <path
            d="M 0 200 L 230 200 L 240 350 L 235 500 L 250 650 L 0 700 Z"
            fill="var(--color-ink)"
            opacity="0.05"
          />
          {/* Queens */}
          <path
            d="M 410 180 L 750 220 L 800 380 L 700 460 L 510 460 L 470 410 L 460 320 L 500 280 L 500 220 Z"
            fill="var(--color-ink)"
            opacity="0.06"
          />
          {/* Brooklyn */}
          <path
            d="M 320 620 L 410 600 L 480 540 L 510 460 L 700 460 L 720 600 L 600 700 L 380 720 L 290 650 Z"
            fill="var(--color-ink)"
            opacity="0.07"
          />
          {/* Staten Island */}
          <path
            d="M 100 600 L 280 620 L 290 700 L 240 760 L 130 760 L 70 700 Z"
            fill="var(--color-ink)"
            opacity="0.05"
          />

          {/* ---- Borough labels (subtle) ---- */}
          <g fontFamily="var(--font-inter), sans-serif" fontSize="14" fill="var(--color-muted)" letterSpacing="2.5" opacity="0.65" style={{ textTransform: 'uppercase' }}>
            <text x="380" y="60" textAnchor="middle">BRONX</text>
            <text x="600" y="320" textAnchor="middle">QUEENS</text>
            <text x="540" y="660" textAnchor="middle">BROOKLYN</text>
            <text x="180" y="730" textAnchor="middle">STATEN ISLAND</text>
            <text x="100" y="320" textAnchor="middle">NEW JERSEY</text>
            <text x="240" y="430" textAnchor="middle" transform="rotate(-72 240 430)">MANHATTAN</text>
          </g>

          {/* ---- Neighborhood dots ---- */}
          {ranked.map(({ neighborhood, score }) => {
            const pos = POSITIONS[neighborhood.id];
            if (!pos) return null;
            // Saturation reflects score. Use accent color with opacity.
            // 0% → 0.15 opacity; 100% → 1.0 opacity.
            const opacity = 0.15 + score * 0.85;
            // Top 5 get a slightly larger circle + a halo
            const isTop = ranked.indexOf(ranked.find((r) => r.neighborhood.id === neighborhood.id)!) < 5;
            const r = isTop ? 13 : 9;
            return (
              <g key={neighborhood.id} className="cursor-pointer">
                <Link href={`/n/${neighborhood.slug}`} aria-label={`${neighborhood.name}, ${Math.round(score * 100)}% match`}>
                  {isTop && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r + 6}
                      fill="var(--color-accent)"
                      opacity={opacity * 0.25}
                    />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill="var(--color-accent)"
                    opacity={opacity}
                    stroke="var(--color-bg)"
                    strokeWidth="2"
                  />
                  <title>{neighborhood.name} · {Math.round(score * 100)}% match</title>
                </Link>
              </g>
            );
          })}

          {/* ---- Neighborhood labels (rendered after dots so they sit above) ---- */}
          <g fontFamily="var(--font-inter), sans-serif" fontSize="11" fill="var(--color-ink)">
            {ranked.map(({ neighborhood, score }, i) => {
              const pos = POSITIONS[neighborhood.id];
              if (!pos) return null;
              const isTop = i < 5;
              // Label position: nudge to the right of the dot, slightly down
              const lx = pos.x + (isTop ? 18 : 14);
              const ly = pos.y + 4;
              return (
                <text
                  key={neighborhood.id}
                  x={lx}
                  y={ly}
                  fontWeight={isTop ? 600 : 400}
                  opacity={isTop ? 1 : 0.65}
                >
                  {neighborhood.shortName ?? neighborhood.name}
                  {isTop && <tspan dx="6" fontSize="9" fill="var(--color-accent)" fontWeight="700">{Math.round(score * 100)}%</tspan>}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-baseline gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-25" />
            <span className="inline-block w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-55" />
            <span className="inline-block w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-90" />
          </span>
          <span>weaker → stronger match</span>
        </div>
        <span aria-hidden>·</span>
        <span>larger dots are your top 5</span>
      </div>

      {/* Boroughs sub-list for screen readers */}
      <p className="sr-only">
        Boroughs covered: {Object.values(boroughLabel).join(', ')}.
      </p>
    </section>
  );
}
