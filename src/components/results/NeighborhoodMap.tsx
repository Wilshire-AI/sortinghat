import Link from 'next/link';
import type { Neighborhood } from '@content/types';
import polygonData from '@content/neighborhood-polygons.json';

type Props = {
  ranked: { neighborhood: Neighborhood; score: number }[];
};

type GeoFeature = {
  type: 'Feature';
  properties: { id: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
};

const features = (polygonData as { features: GeoFeature[] }).features;

// Bounding box from the source data (computed at build time of the JSON).
// Padding adds whitespace on all sides.
const LNG_MIN = -74.105;
const LNG_MAX = -73.79;
const LAT_MIN = 40.57;
const LAT_MAX = 40.92;
const VIEW_W = 1000;
const VIEW_H = 1000;
const PAD = 30;

const scaleX = (VIEW_W - 2 * PAD) / (LNG_MAX - LNG_MIN);
const scaleY = (VIEW_H - 2 * PAD) / (LAT_MAX - LAT_MIN);
// Use the smaller scale to preserve aspect ratio
const SCALE = Math.min(scaleX, scaleY);
// Center horizontally + vertically within the viewBox
const W_OFFSET = (VIEW_W - SCALE * (LNG_MAX - LNG_MIN)) / 2;
const H_OFFSET = (VIEW_H - SCALE * (LAT_MAX - LAT_MIN)) / 2;

function project(lng: number, lat: number): [number, number] {
  const x = (lng - LNG_MIN) * SCALE + W_OFFSET;
  const y = (LAT_MAX - lat) * SCALE + H_OFFSET;
  return [x, y];
}

function ringToPath(ring: number[][]): string {
  if (ring.length === 0) return '';
  const [x0, y0] = project(ring[0][0], ring[0][1]);
  let path = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = project(ring[i][0], ring[i][1]);
    path += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path + ' Z';
}

function featureToPath(feat: GeoFeature): string {
  if (feat.geometry.type === 'Polygon') {
    return feat.geometry.coordinates.map(ringToPath).join(' ');
  }
  return feat.geometry.coordinates
    .map((poly) => poly.map(ringToPath).join(' '))
    .join(' ');
}

// Score → fill color. Green-red gradient using HSL, lightly muted.
function scoreColor(score: number, hasScore: boolean): string {
  if (!hasScore) return 'hsl(35, 12%, 78%)'; // no data → neutral cream
  // hue 0 (red) at 0 → 110 (green) at 1
  const hue = Math.round(score * 110);
  const sat = 45;
  const lit = 52;
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

// Centroid of a set of rings — used to position the label.
function centroid(feat: GeoFeature): [number, number] {
  let sumX = 0;
  let sumY = 0;
  let n = 0;
  const rings: number[][][] =
    feat.geometry.type === 'Polygon'
      ? feat.geometry.coordinates
      : feat.geometry.coordinates.flat();
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      const [x, y] = project(lng, lat);
      sumX += x;
      sumY += y;
      n += 1;
    }
  }
  return n === 0 ? [VIEW_W / 2, VIEW_H / 2] : [sumX / n, sumY / n];
}

const boroughLabel: Record<string, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'The Bronx',
  'staten-island': 'Staten Island',
  nj: 'New Jersey',
};

export function NeighborhoodMap({ ranked }: Props) {
  // Map neighborhood id → score
  const scoreById = new Map(ranked.map((r) => [r.neighborhood.id, r.score]));
  const neighborById = new Map(ranked.map((r) => [r.neighborhood.id, r.neighborhood]));
  // Top 5 ids for emphasis
  const top5 = new Set(ranked.slice(0, 5).map((r) => r.neighborhood.id));

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Geographic lens
      </p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">
        Your matches, mapped
      </h2>
      <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
        Real neighborhood boundaries (NYC NTAs, simplified) colored by your match score.
        Green = strong fit, red = weak fit. Click any neighborhood to read its full profile.
      </p>

      <div className="mt-10 rounded-sm border border-[var(--color-line)] bg-[var(--color-ink)]/[0.02] overflow-hidden">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Map of NYC neighborhoods colored by match score"
        >
          {/* Polygons */}
          {features.map((feat) => {
            const id = feat.properties.id;
            const n = neighborById.get(id);
            if (!n) return null;
            const score = scoreById.get(id) ?? 0;
            const fill = scoreColor(score, true);
            const isTop = top5.has(id);
            return (
              <Link
                key={id}
                href={`/n/${n.slug}`}
                aria-label={`${n.name}, ${Math.round(score * 100)}% match`}
              >
                <path
                  d={featureToPath(feat)}
                  fill={fill}
                  fillOpacity={isTop ? 0.95 : 0.78}
                  stroke="var(--color-bg)"
                  strokeWidth={isTop ? 2.5 : 1.2}
                  className="transition-opacity hover:fill-opacity-100"
                  style={{ cursor: 'pointer' }}
                >
                  <title>{n.name} · {Math.round(score * 100)}% match</title>
                </path>
              </Link>
            );
          })}

          {/* Top 5 labels */}
          <g fontFamily="var(--font-inter), sans-serif" fontSize="14" fill="var(--color-ink)">
            {ranked.slice(0, 5).map((r) => {
              const feat = features.find((f) => f.properties.id === r.neighborhood.id);
              if (!feat) return null;
              const [cx, cy] = centroid(feat);
              return (
                <g key={r.neighborhood.id}>
                  {/* white halo for legibility */}
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    fontWeight="700"
                    stroke="var(--color-bg)"
                    strokeWidth="4"
                    paintOrder="stroke"
                  >
                    {r.neighborhood.shortName ?? r.neighborhood.name}
                  </text>
                  <text
                    x={cx}
                    y={cy + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--color-ink)"
                    stroke="var(--color-bg)"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {Math.round(r.score * 100)}%
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-3 rounded overflow-hidden border border-[var(--color-line)]" style={{ width: 140 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                style={{ background: scoreColor(i / 13, true), width: 10, height: '100%' }}
              />
            ))}
          </span>
          <span>weak match → strong match</span>
        </div>
        <span aria-hidden>·</span>
        <span>top 5 are labeled</span>
      </div>

      <p className="sr-only">
        Boroughs covered: {Object.values(boroughLabel).join(', ')}.
      </p>
    </section>
  );
}
