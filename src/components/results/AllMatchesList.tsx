'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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

// Chip ordering (matches typical user mental model — NYC core first, then
// outer regions). Boroughs with <3 entries in the dataset are folded into
// nearby siblings rather than shown as their own chip.
const CHIP_ORDER: Array<{ key: string; label: string; matches: (b: string) => boolean }> = [
  { key: 'all', label: 'All', matches: () => true },
  { key: 'manhattan', label: 'Manhattan', matches: (b) => b === 'manhattan' },
  { key: 'brooklyn', label: 'Brooklyn', matches: (b) => b === 'brooklyn' },
  { key: 'queens', label: 'Queens', matches: (b) => b === 'queens' },
  { key: 'nj', label: 'NJ', matches: (b) => b === 'nj' },
  { key: 'westchester', label: 'Westchester', matches: (b) => b === 'westchester' },
  { key: 'long-island', label: 'Long Island', matches: (b) => b === 'long-island' },
  { key: 'ct', label: 'CT', matches: (b) => b === 'ct' },
  // Bronx + Staten Island folded together since each has only 1 nbhd
  { key: 'other', label: 'Bronx / SI', matches: (b) => b === 'bronx' || b === 'staten-island' },
];

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
  const [filter, setFilter] = useState<string>('all');

  const activeChip = CHIP_ORDER.find((c) => c.key === filter) ?? CHIP_ORDER[0];

  // Count entries per chip across both ranked + excluded so users can see
  // which regions actually have entries before clicking.
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const chip of CHIP_ORDER) {
      counts[chip.key] = [...ranked, ...excluded].filter((r) =>
        chip.matches(r.neighborhood.borough),
      ).length;
    }
    return counts;
  }, [ranked, excluded]);

  // Filter while preserving original ranks (so #45 stays #45 even when
  // filtered to just Manhattan).
  const filteredRanked = useMemo(
    () => ranked.map((r, i) => ({ entry: r, rank: startRank + i })).filter((x) => activeChip.matches(x.entry.neighborhood.borough)),
    [ranked, startRank, activeChip],
  );
  const filteredExcluded = useMemo(
    () =>
      excluded
        .map((r, i) => ({ entry: r, rank: ranked.length + startRank + i }))
        .filter((x) => activeChip.matches(x.entry.neighborhood.borough)),
    [excluded, ranked.length, startRank, activeChip],
  );

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

      <div className="mt-8 flex flex-wrap gap-2">
        {CHIP_ORDER.filter((c) => c.key === 'all' || chipCounts[c.key] > 0).map((chip) => {
          const isActive = chip.key === activeChip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={
                'rounded-full border px-3.5 py-1.5 text-xs tracking-wide transition ' +
                (isActive
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-bg)]'
                  : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/50')
              }
            >
              {chip.label}
              <span className={'ml-1.5 ' + (isActive ? 'opacity-60' : 'text-[var(--color-muted)]')}>
                {chipCounts[chip.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filteredRanked.length > 0 && (
        <ol className="mt-8">
          {filteredRanked.map(({ entry, rank }) => (
            <Row key={entry.neighborhood.id} entry={entry} rank={rank} fingerprint={fingerprint} />
          ))}
        </ol>
      )}
      {filteredExcluded.length > 0 && (
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
            {filteredExcluded.map(({ entry, rank }) => (
              <Row
                key={entry.neighborhood.id}
                entry={entry}
                rank={rank}
                dimmed
                reason={describeFailures((entry as ExcludedEntry).failedMustHaves)}
                fingerprint={fingerprint}
              />
            ))}
          </ol>
        </>
      )}

      {filteredRanked.length === 0 && filteredExcluded.length === 0 && (
        <p className="mt-8 text-sm text-[var(--color-muted)] italic">
          No neighborhoods in this region matched your filter criteria.
        </p>
      )}
    </section>
  );
}
