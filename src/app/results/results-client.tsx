'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { decodeFingerprint } from '@/lib/engine/vector';
import { rankNeighborhoods } from '@/lib/engine/score';
import { matchArchetype } from '@/lib/engine/archetype';
import { resolveCardProse } from '@/lib/engine/explain';
import { neighborhoods } from '@content/neighborhoods';
import { archetypes } from '@content/archetypes';
import { dimensions } from '@content/dimensions';
import { ArchetypeBanner } from '@/components/results/ArchetypeBanner';
import { NeighborhoodCard } from '@/components/results/NeighborhoodCard';
import { DimensionFingerprint } from '@/components/results/DimensionFingerprint';
import { ShareButton } from '@/components/results/ShareButton';
import { AllMatchesList } from '@/components/results/AllMatchesList';
import { NeighborhoodMap } from '@/components/results/NeighborhoodMap';

export function ResultsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const f = sp.get('f');

  const result = useMemo(() => {
    if (!f) return null;
    try {
      const decoded = decodeFingerprint(f);
      const dimIds = dimensions.map((d) => d.id);
      const archetype = matchArchetype(decoded.vector, archetypes, dimIds);
      const allRanked = rankNeighborhoods(
        decoded.vector,
        neighborhoods,
        dimensions,
        neighborhoods.length,
        decoded.selectedTags,
      );
      return {
        vector: decoded.vector,
        archetype,
        ranked: allRanked.slice(0, 5),
        rest: allRanked.slice(5),
        selectedTags: decoded.selectedTags,
      };
    } catch {
      return null;
    }
  }, [f]);

  useEffect(() => {
    if (!f || !result) router.replace('/quiz');
  }, [f, result, router]);

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <ArchetypeBanner archetype={result.archetype} />

      <div className="mx-auto max-w-3xl px-6 pb-2 flex flex-wrap items-center gap-4">
        <ShareButton archetypeName={result.archetype.name} />
        <Link
          href="/quiz"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
        >
          Retake the quiz
        </Link>
      </div>

      <section className="mx-auto max-w-3xl px-6 pt-12">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Your top five matches
        </p>
        {result.ranked.map((r, i) => {
          const prose = resolveCardProse(r.neighborhood, undefined);
          return (
            <NeighborhoodCard
              key={r.neighborhood.id}
              rank={i + 1}
              neighborhood={r.neighborhood}
              prose={prose}
              score={r.score}
              matchedTags={(r.neighborhood.culturalTags ?? []).filter((t) =>
                result.selectedTags.includes(t),
              )}
            />
          );
        })}
      </section>

      <NeighborhoodMap ranked={[...result.ranked, ...result.rest]} />

      <AllMatchesList ranked={result.rest} startRank={6} />

      <DimensionFingerprint dimensions={dimensions} vector={result.vector} />

      <footer className="mx-auto max-w-3xl px-6 py-12 text-xs text-[var(--color-muted)] border-t border-[var(--color-line)]">
        A{' '}
        <a href="https://wilshireai.com" className="hover:text-[var(--color-accent)] transition">
          Wilshire AI
        </a>{' '}
        project
      </footer>
    </main>
  );
}
