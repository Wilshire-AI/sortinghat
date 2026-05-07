import Link from 'next/link';
import type { Neighborhood } from '@content/types';

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

type RankedEntry = { neighborhood: Neighborhood; score: number };

type Props = {
  ranked: RankedEntry[];
  excluded?: RankedEntry[];
  startRank?: number;
};

function Row({ entry, rank, dimmed }: { entry: RankedEntry; rank: number; dimmed?: boolean }) {
  return (
    <li className="border-b border-[var(--color-line)] last:border-b-0">
      <Link
        href={`/nyc/n/${entry.neighborhood.slug}`}
        className={
          'flex items-baseline justify-between py-3 sm:py-4 hover:bg-[var(--color-ink)]/[0.03] transition px-2 -mx-2 rounded-sm ' +
          (dimmed ? 'opacity-60' : '')
        }
      >
        <div className="flex items-baseline gap-4 sm:gap-6 min-w-0">
          <span className="font-mono text-xs text-[var(--color-muted)] w-8 shrink-0 tabular-nums">
            {String(rank).padStart(2, '0')}
          </span>
          <span className="font-serif text-xl sm:text-2xl leading-tight truncate">
            {entry.neighborhood.name}
          </span>
          <span className="hidden sm:inline text-xs text-[var(--color-muted)] uppercase tracking-[0.18em] shrink-0">
            {boroughLabel[entry.neighborhood.borough] ?? entry.neighborhood.borough}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <span
            aria-hidden
            className="hidden sm:block w-24 h-px bg-[var(--color-line)] relative"
          >
            <span
              className="absolute left-0 top-0 h-px bg-[var(--color-accent)]"
              style={{ width: `${Math.round(entry.score * 100)}%` }}
            />
          </span>
          <span className="font-mono text-sm tabular-nums">
            {Math.round(entry.score * 100)}%
          </span>
        </div>
      </Link>
    </li>
  );
}

export function AllMatchesList({ ranked, excluded = [], startRank = 6 }: Props) {
  if (ranked.length === 0 && excluded.length === 0) return null;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Every neighborhood, ranked
      </p>
      <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">
        Where else you might fit
      </h2>
      <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
        The same engine scored every neighborhood we cover, not just the top five.
        High scores aren&rsquo;t the whole story. A 70% match on one dimension can still feel
        like home if it&rsquo;s the one that matters most to you.
      </p>
      {ranked.length > 0 && (
        <ol className="mt-10">
          {ranked.map((r, i) => (
            <Row key={r.neighborhood.id} entry={r} rank={startRank + i} />
          ))}
        </ol>
      )}
      {excluded.length > 0 && (
        <>
          <div className="mt-14 pt-8 border-t border-[var(--color-line)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Ruled out by your non-negotiables
            </p>
            <p className="mt-3 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
              These scored well on the soft preferences but failed at least one of your
              hard filters. Worth knowing in case you&rsquo;d flex one.
            </p>
          </div>
          <ol className="mt-6">
            {excluded.map((r, i) => (
              <Row key={r.neighborhood.id} entry={r} rank={ranked.length + startRank + i} dimmed />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
