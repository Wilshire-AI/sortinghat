import Link from 'next/link';
import type { Neighborhood } from '@content/types';
import polygonData from '@content/neighborhood-polygons.json';

type Props = {
  ranked: { neighborhood: Neighborhood; score: number }[];
};

type GeoFeature = {
  type: 'Feature';
  properties: { id: string; name?: string; borough?: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
};

const features = (polygonData as { features: GeoFeature[] }).features;

// Bounding box from the source data, with breathing room
const LNG_MIN = -74.265;
const LNG_MAX = -73.700;
const LAT_MIN = 40.495;
const LAT_MAX = 40.92;
const VIEW_W = 1000;
const VIEW_H = 800;
const PAD = 18;

const scaleX = (VIEW_W - 2 * PAD) / (LNG_MAX - LNG_MIN);
const scaleY = (VIEW_H - 2 * PAD) / (LAT_MAX - LAT_MIN);
const SCALE = Math.min(scaleX, scaleY);
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
    path += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path + 'Z';
}

function featureToPath(feat: GeoFeature): string {
  if (feat.geometry.type === 'Polygon') {
    return feat.geometry.coordinates.map(ringToPath).join(' ');
  }
  return feat.geometry.coordinates
    .map((poly) => poly.map(ringToPath).join(' '))
    .join(' ');
}

function scoreColor(score: number): string {
  // Green-red gradient via HSL hue interpolation. Muted to fit the editorial palette.
  const hue = Math.round(score * 110); // 0=red, 110=green
  return `hsl(${hue}, 50%, 50%)`;
}

function centroid(feat: GeoFeature): [number, number] {
  let sumX = 0, sumY = 0, n = 0;
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

export function NeighborhoodMap({ ranked }: Props) {
  const scoreById = new Map(ranked.map((r) => [r.neighborhood.id, r.score]));
  const neighborById = new Map(ranked.map((r) => [r.neighborhood.id, r.neighborhood]));
  const top5 = new Set(ranked.slice(0, 5).map((r) => r.neighborhood.id));

  const bgFeatures = features.filter((f) => f.properties.id === '_bg_');
  const coveredFeatures = features.filter((f) => f.properties.id !== '_bg_');

  // Count NJ neighborhoods not on map
  const njCount = ranked.filter((r) => r.neighborhood.borough === 'nj').length;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Geographic lens
      </p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">
        Your matches, mapped
      </h2>
      <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
        Real NYC neighborhood boundaries (NTAs from NYC Open Data, simplified). Colored
        ones are in our coverage and shaded by your match score. Grey ones are NYC
        neighborhoods we don&rsquo;t cover yet. Click any colored neighborhood to read its full
        profile.
      </p>

      <div className="mt-10 rounded-sm border border-[var(--color-line)] bg-[#dee5ec] overflow-hidden">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Map of NYC neighborhoods colored by match score"
        >
          {/* Soft water background — the rounded container shows blue where polygons aren't */}

          {/* Background NYC neighborhoods (uncovered) */}
          <g>
            {bgFeatures.map((feat, i) => (
              <path
                key={`bg-${i}`}
                d={featureToPath(feat)}
                fill="#e8e4d9"
                stroke="#d4cfc0"
                strokeWidth="0.6"
              />
            ))}
          </g>

          {/* Covered neighborhoods, score-colored */}
          <g>
            {coveredFeatures.map((feat) => {
              const id = feat.properties.id;
              const n = neighborById.get(id);
              if (!n) {
                // Render uncolored if no rank data (shouldn't happen)
                return (
                  <path
                    key={id}
                    d={featureToPath(feat)}
                    fill="#e8e4d9"
                    stroke="#d4cfc0"
                    strokeWidth="0.6"
                  />
                );
              }
              const score = scoreById.get(id) ?? 0;
              const isTop = top5.has(id);
              return (
                <Link
                  key={id}
                  href={`/n/${n.slug}`}
                  aria-label={`${n.name}, ${Math.round(score * 100)}% match`}
                >
                  <path
                    d={featureToPath(feat)}
                    fill={scoreColor(score)}
                    fillOpacity={isTop ? 0.95 : 0.78}
                    stroke="#fff"
                    strokeWidth={isTop ? 2 : 1}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{n.name} · {Math.round(score * 100)}% match</title>
                  </path>
                </Link>
              );
            })}
          </g>

          {/* Top 5 labels */}
          <g fontFamily="var(--font-inter), sans-serif">
            {ranked.slice(0, 5).map((r) => {
              const feat = coveredFeatures.find((f) => f.properties.id === r.neighborhood.id);
              if (!feat) return null;
              const [cx, cy] = centroid(feat);
              return (
                <g key={r.neighborhood.id}>
                  <text
                    x={cx}
                    y={cy - 1}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="#1a1410"
                    stroke="#fff"
                    strokeWidth="3.5"
                    paintOrder="stroke"
                  >
                    {r.neighborhood.shortName ?? r.neighborhood.name}
                  </text>
                  <text
                    x={cx}
                    y={cy + 13}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#1a1410"
                    stroke="#fff"
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

      {/* Legend + caveats */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-3 rounded overflow-hidden border border-[var(--color-line)]" style={{ width: 140 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ background: scoreColor(i / 13), width: 10, height: '100%' }} />
            ))}
          </span>
          <span>weak → strong match</span>
        </div>
        <span aria-hidden>·</span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#e8e4d9] border border-[#d4cfc0]" />
          <span>NYC neighborhood we don&rsquo;t cover yet</span>
        </span>
        {njCount > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>NJ neighborhoods aren&rsquo;t shown on the map yet ({njCount} in your results)</span>
          </>
        )}
      </div>
    </section>
  );
}
