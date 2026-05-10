'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { decodeFingerprint } from '@/lib/engine/vector';
import { rankNeighborhoods, excludedByMustHaves, failedMustHaves } from '@/lib/engine/score';
import { applyPlaceTierCorrection, isValidTierCorrection, type TierCorrection } from '@/lib/engine/place-tier-correction';
import { matchArchetype } from '@/lib/engine/archetype';
import { resolveCardProse } from '@/lib/engine/explain';
import { neighborhoods } from '@content/neighborhoods';
import { archetypes } from '@content/archetypes';
import { dimensions } from '@content/dimensions';
import { commuteMinutesByNeighborhood } from '@content/commute-minutes';
import { neighborhoodPopulations } from '@content/neighborhood-populations';
import { getPassage } from '@content/passages';
import { clearStoredQuizAnswers } from '@/components/quiz/useQuizState';
import { ArchetypeBanner } from '@/components/results/ArchetypeBanner';
import { NeighborhoodCard } from '@/components/results/NeighborhoodCard';
import { DimensionFingerprint } from '@/components/results/DimensionFingerprint';
import { ShareButton } from '@/components/results/ShareButton';
import { AllMatchesList } from '@/components/results/AllMatchesList';
import clustersJson from '@content/neighborhood-clusters.json';
import dynamic from 'next/dynamic';

type ClusterEntry = { name: string; description: string; members: string[] };
const CLUSTERS = (clustersJson as { clusters: Record<string, ClusterEntry> }).clusters;
// Reverse lookup: nbhd-id → cluster id
const CLUSTER_OF: Record<string, string> = {};
for (const [cid, c] of Object.entries(CLUSTERS)) {
  for (const id of c.members) CLUSTER_OF[id] = cid;
}

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
  const tierParam = sp.get('tier');
  const activeTier: TierCorrection | null = isValidTierCorrection(tierParam) ? tierParam : null;

  const result = useMemo(() => {
    if (!f) return null;
    try {
      const decoded = decodeFingerprint(f);
      // Apply optional tier correction before any downstream consumer reads
      // the vector. Archetype banner, ranking, map, and dim fingerprint all
      // get the corrected view so a clicked correction button feels coherent.
      const vector = applyPlaceTierCorrection(decoded.vector, activeTier);
      const dimIds = dimensions.map((d) => d.id);
      const archetype = matchArchetype(vector, archetypes, dimIds);
      // Score everyone (no must-have filter) so the user can see how they rank
      // on every neighborhood, even ones their non-negotiables ruled out.
      const allRankedUnfiltered = rankNeighborhoods(vector, neighborhoods, dimensions, {
        topN: neighborhoods.length,
        selectedTags: decoded.selectedTags,
        mustHaves: [],
        commuteTargets: decoded.commuteTargets,
        commuteToleranceMinutes: decoded.commuteToleranceMinutes,
        commuteMinutesByNeighborhood,
        housingAcceptance: decoded.housingAcceptance,
        populationsByNeighborhood: neighborhoodPopulations,
      });
      const excludedIds = new Set(
        excludedByMustHaves(neighborhoods, decoded.mustHaves, decoded.selectedTags),
      );
      const passing = allRankedUnfiltered.filter((r) => !excludedIds.has(r.neighborhood.id));
      const excluded = allRankedUnfiltered
        .filter((r) => excludedIds.has(r.neighborhood.id))
        .map((r) => ({
          ...r,
          failedMustHaves: failedMustHaves(r.neighborhood, decoded.mustHaves, decoded.selectedTags),
        }));
      // Cluster-first grouping. Find which clusters the user's passing
      // matches concentrate in, then surface them as primary / secondary.
      // Primary requires >=4 of top 10 in the cluster — otherwise the user's
      // signal is too mixed and we fall back to a flat top-5 list rather
      // than over-committing to a single cluster framing.
      const top10 = passing.slice(0, 10);
      const clusterCounts: Record<string, number> = {};
      for (const r of top10) {
        const cid = CLUSTER_OF[r.neighborhood.id];
        if (cid) clusterCounts[cid] = (clusterCounts[cid] ?? 0) + 1;
      }
      const sortedClusters = Object.entries(clusterCounts).sort((a, b) => b[1] - a[1]);
      const primaryClusterId =
        sortedClusters[0] && sortedClusters[0][1] >= 4 ? sortedClusters[0][0] : null;
      const secondaryClusterId =
        primaryClusterId && sortedClusters[1] && sortedClusters[1][1] >= 2
          ? sortedClusters[1][0]
          : null;

      // Build the cards-by-cluster map: each cluster gets its top members
      // from the user's passing list.
      const buildClusterMembers = (cid: string, max: number) =>
        passing.filter((r) => CLUSTER_OF[r.neighborhood.id] === cid).slice(0, max);

      const primaryMembers = primaryClusterId ? buildClusterMembers(primaryClusterId, 5) : [];
      const secondaryMembers = secondaryClusterId ? buildClusterMembers(secondaryClusterId, 3) : [];
      const featuredIds = new Set([
        ...primaryMembers.map((r) => r.neighborhood.id),
        ...secondaryMembers.map((r) => r.neighborhood.id),
      ]);
      const restAfterClusters = passing.filter((r) => !featuredIds.has(r.neighborhood.id));

      return {
        vector,
        archetype,
        ranked: passing.slice(0, 5), // legacy field still used by map
        rest: passing.slice(5),
        excluded,
        selectedTags: decoded.selectedTags,
        mustHaves: decoded.mustHaves,
        // New cluster-first structure
        primaryCluster: primaryClusterId ? CLUSTERS[primaryClusterId] : null,
        primaryMembers,
        secondaryCluster: secondaryClusterId ? CLUSTERS[secondaryClusterId] : null,
        secondaryMembers,
        restAfterClusters,
      };
    } catch {
      return null;
    }
  }, [f, activeTier]);

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
          onClick={clearStoredQuizAnswers}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
        >
          Retake the quiz
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-6 pt-4">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] mb-3">
          Adjust your matches
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'dense', label: 'More dense city' },
              { value: 'walkable', label: 'More walkable suburb' },
              { value: 'quiet', label: 'More quiet / open' },
            ] as const
          ).map((opt) => {
            const isActive = activeTier === opt.value;
            const targetTier = isActive ? null : opt.value;
            const params = new URLSearchParams();
            if (f) params.set('f', f);
            if (targetTier) params.set('tier', targetTier);
            const href = `/nyc/results?${params.toString()}`;
            return (
              <Link
                key={opt.value}
                href={href}
                scroll={false}
                className={
                  'rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] ' +
                  (isActive
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-[var(--color-ink)]'
                    : 'border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-accent)]')
                }
                aria-pressed={isActive}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
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
            We&rsquo;re still showing every neighborhood ranked by how well the rest of your
            profile matches, with the failing constraint called out on each. Common offenders:
            top-rated public schools + no-car (top schools mostly live in suburbs),
            luxury high-rise + calm blocks (high-rises sit in busy neighborhoods), or top schools
            + a specific cultural community (top districts are demographically narrow).
          </p>
          <Link
            href="/nyc/quiz"
            onClick={clearStoredQuizAnswers}
            className="mt-8 inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          >
            Retake with fewer non-negotiables
          </Link>
        </section>
      )}

      {!result.primaryCluster && result.ranked.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pt-12">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Your top {result.ranked.length} match{result.ranked.length === 1 ? '' : 'es'}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)] italic">
            Your answers span multiple psychographic clusters; showing flat ranking instead of grouping.
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
                fingerprint={f ?? undefined}
              />
            );
          })}
        </section>
      )}

      {result.primaryCluster && result.primaryMembers.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pt-12">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Your primary fit
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05] tracking-tight">
            The {result.primaryCluster.name} cluster
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--color-ink)]/85 italic">
            {result.primaryCluster.description}
          </p>
          {result.primaryMembers.map((r, i) => {
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
                fingerprint={f ?? undefined}
              />
            );
          })}
        </section>
      )}

      {result.secondaryCluster && result.secondaryMembers.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pt-16 border-t border-[var(--color-line)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Also worth considering
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-[1.05] tracking-tight">
            The {result.secondaryCluster.name} cluster
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--color-ink)]/85 italic">
            {result.secondaryCluster.description}
          </p>
          {result.secondaryMembers.map((r, i) => {
            const passage = getPassage(result.archetype.id, r.neighborhood.id);
            const prose = resolveCardProse(r.neighborhood, passage);
            return (
              <NeighborhoodCard
                key={r.neighborhood.id}
                rank={result.primaryMembers.length + i + 1}
                neighborhood={r.neighborhood}
                prose={prose}
                score={r.score}
                matchedTags={(r.neighborhood.culturalTags ?? []).filter((t) =>
                  result.selectedTags.includes(t),
                )}
                fingerprint={f ?? undefined}
              />
            );
          })}
        </section>
      )}

      <NeighborhoodMap
        ranked={[...result.ranked, ...result.rest, ...result.excluded]}
        fingerprint={f ?? undefined}
      />

      <AllMatchesList
        ranked={result.primaryCluster ? result.restAfterClusters : result.rest}
        excluded={result.excluded}
        startRank={
          result.primaryCluster
            ? result.primaryMembers.length + result.secondaryMembers.length + 1
            : result.ranked.length + 1
        }
        fingerprint={f ?? undefined}
      />

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
