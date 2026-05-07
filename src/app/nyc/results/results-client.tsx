'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { decodeFingerprint } from '@/lib/engine/vector';
import { rankNeighborhoods, excludedByMustHaves } from '@/lib/engine/score';
import { matchArchetype } from '@/lib/engine/archetype';
import { resolveCardProse } from '@/lib/engine/explain';
import { neighborhoods } from '@content/neighborhoods';
import { archetypes } from '@content/archetypes';
import { dimensions } from '@content/dimensions';
import { commuteMinutesByNeighborhood } from '@content/commute-minutes';
import { getPassage } from '@content/passages';
import { ArchetypeBanner } from '@/components/results/ArchetypeBanner';
import { NeighborhoodCard } from '@/components/results/NeighborhoodCard';
import { DimensionFingerprint } from '@/components/results/DimensionFingerprint';
import { ShareButton } from '@/components/results/ShareButton';
import { AllMatchesList } from '@/components/results/AllMatchesList';
import dynamic from 'next/dynamic';

// MapLibre is ~250KB and only renders on the client. Lazy-load it so the
// initial results render isn't blocked by map JS + tile fetches.
const NeighborhoodMap = dynamic(
  () => import('@/components/results/NeighborhoodMap').then((m) => m.NeighborhoodMap),
  {
    ssr: false,
    loading: () => (
      <section className="mx-auto max-w-5xl px-6 py-16 border-t border-[var(--color-line)]">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Geographic lens</p>
        <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05]">Your matches, mapped</h2>
        <div
          className="mt-10 rounded-sm border border-[var(--color-line)] bg-[var(--color-ink)]/[0.03] flex items-center justify-center"
          style={{ width: '100%', height: 600 }}
        >
          <p className="text-sm text-[var(--color-muted)]">Loading map…</p>
        </div>
      </section>
    ),
  },
);

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
      // Score everyone (no must-have filter) so the user can see how they rank
      // on every neighborhood, even ones their non-negotiables ruled out.
      const allRankedUnfiltered = rankNeighborhoods(decoded.vector, neighborhoods, dimensions, {
        topN: neighborhoods.length,
        selectedTags: decoded.selectedTags,
        mustHaves: [],
        commuteTargets: decoded.commuteTargets,
        commuteToleranceMinutes: decoded.commuteToleranceMinutes,
        commuteMinutesByNeighborhood,
      });
      const excludedIds = new Set(
        excludedByMustHaves(neighborhoods, decoded.mustHaves, decoded.selectedTags),
      );
      const passing = allRankedUnfiltered.filter((r) => !excludedIds.has(r.neighborhood.id));
      const excluded = allRankedUnfiltered.filter((r) => excludedIds.has(r.neighborhood.id));
      return {
        vector: decoded.vector,
        archetype,
        ranked: passing.slice(0, 5),
        rest: passing.slice(5),
        excluded,
        selectedTags: decoded.selectedTags,
        mustHaves: decoded.mustHaves,
      };
    } catch {
      return null;
    }
  }, [f]);

  useEffect(() => {
    if (!f || !result) router.replace('/nyc/quiz');
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
          href="/nyc/quiz"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
        >
          Retake the quiz
        </Link>
      </div>

      {result.ranked.length === 0 && (
        <section className="mx-auto max-w-3xl px-6 pt-12">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            No perfect matches
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.1] tracking-[-0.01em] font-medium">
            Your non-negotiables don&apos;t coexist anywhere in the metro right now.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[var(--color-muted)]">
            This usually means one of your must-haves is in tension with another. Common
            offenders: top-rated public schools + no-car (top schools are mostly in suburbs),
            luxury high-rise + calm blocks (high-rises live in busier areas), or top schools
            + a specific cultural community (top districts are demographically narrow).
          </p>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-muted)]">
            Try retaking the quiz with one fewer non-negotiable, or flex the one that&apos;s
            costing you most.
          </p>
          <Link
            href="/nyc/quiz"
            className="mt-8 inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          >
            Retake the quiz
          </Link>
        </section>
      )}

      {result.ranked.length > 0 && (
      <section className="mx-auto max-w-3xl px-6 pt-12">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Your top five matches
        </p>
        {result.ranked.map((r, i) => {
          const passage = getPassage(result.archetype.id, r.neighborhood.id);
          const prose = resolveCardProse(r.neighborhood, passage);
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
      )}

      {result.ranked.length > 0 && (
      <NeighborhoodMap ranked={[...result.ranked, ...result.rest, ...result.excluded]} />
      )}

      {result.ranked.length > 0 && (
        <AllMatchesList
          ranked={result.rest}
          excluded={result.excluded}
          startRank={6}
        />
      )}

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
