'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Dimension, Neighborhood, UserVector } from '@content/types';
import { decodeFingerprint } from '@/lib/engine/vector';
import { rankNeighborhoods } from '@/lib/engine/score';
import { neighborhoods as allNeighborhoods } from '@content/neighborhoods';
import { neighborhoodPopulations } from '@content/neighborhood-populations';

type Props = {
  neighborhood: Neighborhood;
  dimensions: readonly Dimension[];
};

type DimFit = {
  dim: Dimension;
  userValue: number;
  nbhdValue: number;
  contribution: number;
};

function computeDimensionalFit(
  user: UserVector,
  neighborhood: Neighborhood,
  dimensions: readonly Dimension[],
): DimFit[] {
  return dimensions.map((d) => {
    const userValue = user[d.id] ?? 0;
    const nbhdValue = neighborhood.scores[d.id] ?? 0;
    let contribution: number;
    if (d.kind === 'asymmetric_need') {
      // Penalty only when nbhd under-delivers vs user need.
      const shortfall = Math.max(0, userValue - nbhdValue);
      contribution = shortfall * shortfall;
    } else {
      contribution = (userValue - nbhdValue) * (userValue - nbhdValue);
    }
    return { dim: d, userValue, nbhdValue, contribution };
  });
}

// Translate a (user, nbhd) score pair into a plain-language phrase about
// what they "agree" or "disagree" on.
function describeAgreement(fit: DimFit): string {
  const { dim, userValue, nbhdValue } = fit;
  const userPole = userValue > 0.15 ? dim.poles.high : userValue < -0.15 ? dim.poles.low : null;
  const nbhdPole = nbhdValue > 0.15 ? dim.poles.high : nbhdValue < -0.15 ? dim.poles.low : null;
  // Strip trailing periods on the pole sentences for inline use.
  const userPhrase = userPole ? userPole.split('.')[0].trim().toLowerCase() : 'no strong preference';
  const nbhdPhrase = nbhdPole ? nbhdPole.split('.')[0].trim().toLowerCase() : 'mixed';
  return `You: ${userPhrase}. ${fit.dim.name}: ${nbhdPhrase}.`;
}

export function NeighborhoodFitExplanation({ neighborhood, dimensions }: Props) {
  const searchParams = useSearchParams();
  const f = searchParams.get('f');

  const result = useMemo(() => {
    if (!f) return null;
    try {
      const decoded = decodeFingerprint(f);
      // Per-user max-normalized Bayesian score: pull this nbhd's relative
      // ranking against the full corpus. Matches the percentages the user
      // sees elsewhere (results page, neighborhood cards).
      const ranked = rankNeighborhoods(decoded.vector, allNeighborhoods, dimensions, {
        topN: allNeighborhoods.length,
        selectedTags: decoded.selectedTags,
        softPrefs: decoded.softPrefs,
        populationsByNeighborhood: neighborhoodPopulations,
      });
      const overallScore = ranked.find((r) => r.neighborhood.id === neighborhood.id)?.score ?? 0;
      const fits = computeDimensionalFit(decoded.vector, neighborhood, dimensions);
      const alignments = [...fits].sort((a, b) => a.contribution - b.contribution).slice(0, 3);
      const gaps = [...fits].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
      return { overallScore, alignments, gaps };
    } catch {
      return null;
    }
  }, [f, neighborhood, dimensions]);

  if (!result) return null;

  return (
    <section className="mt-14 pt-10 border-t border-[var(--color-line)]">
      <h2 className="font-serif text-2xl">How {neighborhood.name} fits you</h2>
      <div className="mt-6 flex items-baseline gap-4">
        <span className="font-mono text-4xl tabular-nums text-[var(--color-ink)]">
          {Math.round(result.overallScore * 100)}%
        </span>
        <span className="text-sm text-[var(--color-muted)]">
          overall match based on your quiz answers
        </span>
      </div>

      <div className="mt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Where you align
        </p>
        <ul className="mt-4 space-y-3">
          {result.alignments.map((fit) => (
            <li key={fit.dim.id} className="text-sm leading-relaxed">
              <span className="text-[var(--color-accent)]">●</span>{' '}
              <span className="font-medium">{fit.dim.name}.</span>{' '}
              <span className="text-[var(--color-muted)]">{describeAgreement(fit)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Where you might feel friction
        </p>
        <ul className="mt-4 space-y-3">
          {result.gaps.map((fit) => (
            <li key={fit.dim.id} className="text-sm leading-relaxed">
              <span className="text-[var(--color-muted)]">○</span>{' '}
              <span className="font-medium">{fit.dim.name}.</span>{' '}
              <span className="text-[var(--color-muted)]">{describeAgreement(fit)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-xs text-[var(--color-muted)] italic leading-relaxed max-w-xl">
        These are the dimensions where your answers and {neighborhood.name}&rsquo;s profile
        agree or disagree most. The overall match is a weighted blend of all
        dimensions, plus any cultural-tag boost.
      </p>
    </section>
  );
}
