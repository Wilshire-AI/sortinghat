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

// Human-readable explanations for why a neighborhood failed each must-have.
// Phrased from the neighborhood's perspective ("missing X" / "needs Y") so
// the user reads "this place fails because [reason]," not "you fail."
const failedMustHaveLabel: Record<string, string> = {
  'subway-redundancy': 'only one transit line here',
  'walking-distance-park': 'no major park within walking distance',
  'house-or-townhouse': 'no houses or townhouses available',
  'luxury-highrise': 'no luxury high-rise stock',
  'top-schools': 'schools below your bar',
  'no-car': 'requires a car for daily life',
  'cultural-match': 'no cultural-community match',
  'quiet-blocks-available': 'no notable quiet residential blocks',
  'family-infrastructure': 'limited family-life infrastructure',
};

function describeFailures(keys: readonly string[]): string {
  if (keys.length === 0) return '';
  const labels = keys.map((k) => failedMustHaveLabel[k] ?? k);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}; ${labels[1]}`;
  return `${labels.slice(0, -1).join('; ')}; ${labels[labels.length - 1]}`;
}

type RankedEntry = { neighborhood: Neighborhood; score: number };
type ExcludedEntry = RankedEntry & { failedMustHaves: string[] };

type Props = {
  ranked: RankedEntry[];
  excluded?: ExcludedEntry[];
  startRank?: number;
  fingerprint?: string;
};

function Row({
  entry,
  rank,
  dimmed,
  reason,
  fingerprint,
}: {
  entry: RankedEntry;
  rank: number;
  dimmed?: boolean;
  reason?: string;
  fingerprint?: string;
}) {
  const href = fingerprint
    ? `/nyc/n/${entry.neighborhood.slug}?f=${fingerprint}`
    : `/nyc/n/${entry.neighborhood.slug}`;
  return (
    <li className="border-b border-[var(--color-line)] last:border-b-0">
      <Link
        href={href}
        className={
          'block py-3 sm:py-4 hover:bg-[var(--color-ink)]/[0.03] transition px-2 -mx-2 rounded-sm ' +
          (dimmed ? 'opacity-60' : '')
        }
      >
        <div className="flex items-baseline justify-between">
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
        </div>
        {reason && (
          <p className="mt-1 ml-12 text-xs italic text-[var(--color-muted)] leading-relaxed">
            Ruled out: {reason}.
          </p>
        )}
      </Link>
    </li>
  );
}

export function AllMatchesList({ ranked, excluded = [], startRank = 6, fingerprint }: Props) {
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
            <Row key={r.neighborhood.id} entry={r} rank={startRank + i} fingerprint={fingerprint} />
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
              <Row
                key={r.neighborhood.id}
                entry={r}
                rank={ranked.length + startRank + i}
                dimmed
                reason={describeFailures(r.failedMustHaves)}
                fingerprint={fingerprint}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
