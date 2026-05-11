'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { neighborhoods } from '@content/neighborhoods';
import { commuteMinutesByNeighborhood } from '@content/commute-minutes';
import { neighborhoodPopulations } from '@content/neighborhood-populations';
import { rankNeighborhoods, excludedByMustHaves } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answers } from './useQuizState';

type Props = { answers: Answers };

export function LiveRanking({ answers }: Props) {
  const [open, setOpen] = useState(false);
  const answeredCount = Object.keys(answers).length;

  const derived = useMemo(
    () => deriveState(dimensions, questions, answers),
    [answers],
  );
  const vector = useMemo(() => finalizeVector(derived), [derived]);

  const allRanked = useMemo(
    () =>
      rankNeighborhoods(vector, neighborhoods, dimensions, {
        topN: neighborhoods.length,
        selectedTags: derived.selectedTags,
        mustHaves: [],
        commuteTargets: derived.commuteTargets,
        commuteToleranceMinutes: derived.commuteToleranceMinutes,
        commuteMinutesByNeighborhood,
        populationsByNeighborhood: neighborhoodPopulations,
        touchedDims: derived.touchedDims,
        culturalImportance: derived.culturalImportance,
      }),
    [vector, derived],
  );

  const excludedIds = useMemo(
    () =>
      new Set(
        excludedByMustHaves(neighborhoods, derived.mustHaves, derived.selectedTags),
      ),
    [derived.mustHaves, derived.selectedTags],
  );

  const ranked = useMemo(
    () =>
      allRanked.map((r) => ({
        ...r,
        excluded: excludedIds.has(r.neighborhood.id),
      })),
    [allRanked, excludedIds],
  );

  // Track previous ranks via a ref + setState-in-effect. The cascading-
  // render lint rule fires here, but the cascade is bounded: setting deltas
  // doesn't re-trigger this effect (deps are [ranked], not [deltas]). The
  // ref-mutation can't move into render or useMemo because react-hooks/refs
  // forbids that. This is the canonical "compute-on-change" pattern.
  const prevRanksRef = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    const newRanks: Record<string, number> = {};
    ranked.forEach((r, i) => {
      newRanks[r.neighborhood.id] = i + 1;
    });
    const newDeltas: Record<string, number> = {};
    const prev = prevRanksRef.current;
    if (Object.keys(prev).length > 0) {
      for (const id in newRanks) {
        if (prev[id] !== undefined && prev[id] !== newRanks[id]) {
          newDeltas[id] = prev[id] - newRanks[id];
        }
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeltas(newDeltas);
    prevRanksRef.current = newRanks;
  }, [ranked]);

  const movers = useMemo(
    () =>
      Object.entries(deltas)
        .map(([id, delta]) => {
          const n = neighborhoods.find((x) => x.id === id);
          return { id, delta, name: n?.name ?? id };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 5),
    [deltas],
  );

  if (answeredCount < 5) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 pb-12 -mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition flex items-center gap-2"
        aria-expanded={open}
      >
        <span className="font-mono">{open ? '▾' : '▸'}</span>
        What&rsquo;s moving in your top matches
      </button>

      {open && (
        <div className="mt-5 space-y-5 text-xs leading-relaxed">
          {movers.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] mb-2">
                After your last answer
              </p>
              <ul className="space-y-1">
                {movers.map((m) => (
                  <li key={m.id} className="flex items-baseline gap-2">
                    <span
                      className={
                        'font-mono w-10 shrink-0 ' +
                        (m.delta > 0 ? 'text-emerald-700' : 'text-rose-700')
                      }
                    >
                      {m.delta > 0 ? '↑' : '↓'}
                      {Math.abs(m.delta)}
                    </span>
                    <span>{m.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] mb-2">
              Current top 5
            </p>
            <ol className="space-y-1">
              {ranked.slice(0, 5).map((r, i) => {
                const delta = deltas[r.neighborhood.id];
                return (
                  <li
                    key={r.neighborhood.id}
                    className={
                      'flex items-baseline gap-2 ' +
                      (r.excluded ? 'opacity-50 line-through' : '')
                    }
                  >
                    <span className="text-[var(--color-muted)] font-mono w-6 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 truncate">{r.neighborhood.name}</span>
                    {delta !== undefined && (
                      <span
                        className={
                          'font-mono text-[10px] tabular-nums shrink-0 ' +
                          (delta > 0 ? 'text-emerald-700' : 'text-rose-700')
                        }
                      >
                        {delta > 0 ? '↑' : '↓'}
                        {Math.abs(delta)}
                      </span>
                    )}
                    <span className="text-[var(--color-muted)] tabular-nums shrink-0">
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
