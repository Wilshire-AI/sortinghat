import Link from 'next/link';
import type { Neighborhood } from '@content/types';
import type { ResolvedCardProse } from '@/lib/engine/explain';
import { BoroughHero } from './BoroughHero';

type Props = {
  rank: number;
  neighborhood: Neighborhood;
  prose: ResolvedCardProse;
  score: number;
  matchedTags?: string[];
  fingerprint?: string;
};

const boroughLabel: Record<string, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'The Bronx',
  'staten-island': 'Staten Island',
  nj: 'New Jersey',
  westchester: 'Westchester',
  'long-island': 'Long Island',
  ct: 'Connecticut',
};

const tagLabel: Record<string, string> = {
  'east-asian': 'East Asian',
  'south-asian': 'South Asian',
  'latin-american': 'Latin American',
  caribbean: 'Caribbean',
  'middle-eastern': 'Middle Eastern',
  mediterranean: 'Mediterranean',
  'eastern-european': 'Eastern European',
  jewish: 'Jewish',
  'african-american': 'African American',
  'west-african': 'West African',
  lgbtq: 'LGBTQ+',
};

export function NeighborhoodCard({ rank, neighborhood, prose, score, matchedTags = [], fingerprint }: Props) {
  const detailHref = fingerprint
    ? `/nyc/n/${neighborhood.slug}?f=${fingerprint}`
    : `/nyc/n/${neighborhood.slug}`;
  return (
    <article className="border-t border-[var(--color-line)] first:border-t-0 py-12 sm:py-16">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] gap-8 sm:gap-12 items-start">
        <div className="aspect-[4/5] rounded-sm overflow-hidden relative shadow-md">
          <BoroughHero
            borough={neighborhood.borough}
            variantSeed={neighborhood.id}
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-[#f4ede2]">
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-90">
              № {String(rank).padStart(2, '0')}
            </p>
            <p className="mt-2 font-serif text-3xl sm:text-4xl leading-[1.05]">
              {neighborhood.shortName ?? neighborhood.name}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-75">
              {boroughLabel[neighborhood.borough]}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Match {Math.round(score * 100)}%
            {matchedTags.length > 0 && (
              <>
                <span className="mx-2">·</span>
                <span className="text-[var(--color-accent)]">
                  Cultural fit: {matchedTags.map((t) => tagLabel[t] ?? t).join(', ')}
                </span>
              </>
            )}
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl leading-[1.05]">
            <Link href={detailHref} className="hover:text-[var(--color-accent)] transition">
              {neighborhood.name}
            </Link>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[var(--color-ink)]/85">{prose.fitProse}</p>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">The tradeoffs</p>
            <ul className="mt-3 space-y-2">
              {prose.tradeoffs.map((t, i) => (
                <li key={i} className="text-sm leading-relaxed text-[var(--color-ink)]/75">· {t}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Who thrives here</p>
            <p className="mt-3 text-sm leading-relaxed">{prose.whoThrivesHere}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--color-muted)]">
            <span><b className="text-[var(--color-ink)]/70 font-medium">Transit</b> · {neighborhood.anchors.transit.slice(0, 3).join(' · ')}</span>
            <span><b className="text-[var(--color-ink)]/70 font-medium">Parks</b> · {neighborhood.anchors.parks.slice(0, 2).join(' · ')}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
