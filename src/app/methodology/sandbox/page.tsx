'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { neighborhoods } from '@content/neighborhoods';
import { commuteMinutesByNeighborhood } from '@content/commute-minutes';
import { neighborhoodPopulations } from '@content/neighborhood-populations';
import { rankNeighborhoods, excludedByMustHaves, failedMustHaves } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answer, type Answers } from '@/components/quiz/useQuizState';
import type { Question } from '@content/types';

function ForcedChoiceControl({
  q,
  answer,
  onChange,
}: {
  q: Extract<Question, { kind: 'forced_choice' }>;
  answer?: Answer;
  onChange: (a: Answer) => void;
}) {
  const selectedIdx =
    answer?.kind === 'forced_choice' ? answer.choiceIndex : -1;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {q.choices.map((c, i) => {
        const isSelected = selectedIdx === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange({ kind: 'forced_choice', choiceIndex: i })}
            className={
              'text-left rounded-md border px-3 py-1.5 text-xs leading-snug transition ' +
              (isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/50')
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function SliderControl({
  q,
  answer,
  onChange,
}: {
  q: Extract<Question, { kind: 'slider' }>;
  answer?: Answer;
  onChange: (a: Answer) => void;
}) {
  const value = answer?.kind === 'slider' ? answer.value : null;
  return (
    <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
      <span className="shrink-0">{q.lowLabel}</span>
      <div className="flex flex-1 items-center justify-between">
        {[-1, -0.5, 0, 0.5, 1].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ kind: 'slider', value: v })}
            className={
              'h-5 w-5 rounded-full border transition ' +
              (value === v
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/50')
            }
            aria-label={`Set to ${v}`}
          />
        ))}
      </div>
      <span className="shrink-0">{q.highLabel}</span>
    </div>
  );
}

function MultiSelectControl({
  q,
  answer,
  onChange,
}: {
  q: Extract<Question, { kind: 'multi_select' }>;
  answer?: Answer;
  onChange: (a: Answer) => void;
}) {
  const selected = new Set(
    answer?.kind === 'multi_select' ? answer.selectedValues : [],
  );
  const max = q.maxSelections;
  const atMax = max !== undefined && selected.size >= max;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {q.options.map((opt) => {
        const isSelected = selected.has(opt.value);
        const disabled = !isSelected && atMax;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = new Set(selected);
              if (isSelected) next.delete(opt.value);
              else next.add(opt.value);
              onChange({
                kind: 'multi_select',
                selectedValues: Array.from(next),
              });
            }}
            className={
              'rounded-full border px-2.5 py-1 text-[11px] leading-snug transition ' +
              (isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                : disabled
                ? 'border-[var(--color-line)] opacity-40 cursor-not-allowed'
                : 'border-[var(--color-line)] hover:border-[var(--color-ink)]/50')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SandboxPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [search, setSearch] = useState('');
  const setAnswer = (id: string, a: Answer) =>
    setAnswers((prev) => ({ ...prev, [id]: a }));
  const reset = () => setAnswers({});

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
        softPrefs: derived.softPrefs,
        populationsByNeighborhood: neighborhoodPopulations,
        touchedDims: derived.touchedDims,
      }),
    [vector, derived],
  );

  const excludedIds = useMemo(
    () => new Set(excludedByMustHaves(neighborhoods, derived.mustHaves, derived.selectedTags)),
    [derived.mustHaves, derived.selectedTags],
  );

  const ranked = useMemo(
    () =>
      allRanked.map((r) => ({
        ...r,
        excluded: excludedIds.has(r.neighborhood.id),
        failedMustHaves: excludedIds.has(r.neighborhood.id)
          ? failedMustHaves(r.neighborhood, derived.mustHaves, derived.selectedTags)
          : [],
      })),
    [allRanked, excludedIds, derived.mustHaves, derived.selectedTags],
  );

  // Track previous ranks via a ref + setState-in-effect. The cascading-
  // render lint rule fires here, but the cascade is bounded: setting deltas
  // doesn't re-trigger this effect (deps are [ranked], not [deltas]).
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

  const movers = useMemo(() => {
    return Object.entries(deltas)
      .map(([id, delta]) => {
        const n = neighborhoods.find((x) => x.id === id);
        return { id, delta, name: n?.name ?? id };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [deltas]);

  const searchLower = search.trim().toLowerCase();
  const matchedEntry = searchLower
    ? ranked.find((r) =>
        r.neighborhood.name.toLowerCase().includes(searchLower) ||
        r.neighborhood.id.toLowerCase().includes(searchLower),
      )
    : null;
  const matchedRank = matchedEntry ? ranked.indexOf(matchedEntry) + 1 : null;

  const answeredCount = Object.keys(answers).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/methodology"
        className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
      >
        ← Methodology
      </Link>
      <p className="mt-10 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Sandbox
      </p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight">
        Question paths, live
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink)]/75 max-w-2xl">
        Same engine as the real quiz. Answer questions on the left and watch the rankings
        update on the right. Use this to see how individual answers move neighborhoods up or
        down — and to find which combination of answers brings any specific neighborhood into
        your top results.
      </p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-2 border-b border-[var(--color-line)]">
            <p className="text-xs text-[var(--color-muted)]">
              {answeredCount} of {questions.length} answered
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-xs underline text-[var(--color-muted)] hover:text-[var(--color-accent)]"
            >
              Reset all
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} className="border-b border-[var(--color-line)] pb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] font-mono">
                  Q{String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-medium leading-snug">{q.prompt}</p>
              </div>
              {q.kind === 'forced_choice' && (
                <ForcedChoiceControl
                  q={q}
                  answer={answers[q.id]}
                  onChange={(a) => setAnswer(q.id, a)}
                />
              )}
              {q.kind === 'slider' && (
                <SliderControl
                  q={q}
                  answer={answers[q.id]}
                  onChange={(a) => setAnswer(q.id, a)}
                />
              )}
              {q.kind === 'multi_select' && (
                <MultiSelectControl
                  q={q}
                  answer={answers[q.id]}
                  onChange={(a) => setAnswer(q.id, a)}
                />
              )}
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start space-y-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Find a neighborhood
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Brooklyn Heights"
              className="mt-2 w-full rounded-md border border-[var(--color-line)] px-3 py-1.5 text-sm bg-transparent focus:outline focus:outline-2 focus:outline-[var(--color-accent)]"
            />
            {matchedEntry && (
              <p className="mt-2 text-xs leading-relaxed">
                <b>{matchedEntry.neighborhood.name}</b> ranks <b>#{matchedRank}</b> at{' '}
                {(matchedEntry.score * 100).toFixed(0)}% match.{' '}
                {matchedEntry.excluded && (
                  <span className="text-[var(--color-muted)] italic">
                    Excluded by must-have: {matchedEntry.failedMustHaves.join(', ')}.
                  </span>
                )}
              </p>
            )}
          </div>

          {movers.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Recent movement
              </p>
              <ul className="mt-2 space-y-0.5 text-[11px]">
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
                    <span className="flex-1 truncate">{m.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Top 15
            </p>
            <ol className="mt-2 space-y-0.5 text-xs">
              {ranked.slice(0, 15).map((r, i) => {
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
                          'font-mono text-[10px] tabular-nums ' +
                          (delta > 0 ? 'text-emerald-700' : 'text-rose-700')
                        }
                      >
                        {delta > 0 ? '↑' : '↓'}
                        {Math.abs(delta)}
                      </span>
                    )}
                    <span className="text-[var(--color-muted)] tabular-nums">
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Your vector
            </p>
            <ul className="mt-2 space-y-0.5 text-[11px]">
              {dimensions.map((d) => {
                const v = vector[d.id] ?? 0;
                const pct = ((v + 1) / 2) * 100;
                return (
                  <li key={d.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <span className="truncate" title={d.name}>{d.name}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="relative h-1 w-12 bg-[var(--color-line)] rounded">
                        <span
                          className="absolute top-0 bottom-0 bg-[var(--color-accent)] rounded"
                          style={{ left: `${Math.min(pct, 50)}%`, width: `${Math.abs(pct - 50)}%` }}
                        />
                      </span>
                      <span className="font-mono tabular-nums w-9 text-right text-[var(--color-muted)]">
                        {v.toFixed(2)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {derived.mustHaves.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Active must-haves
              </p>
              <ul className="mt-2 text-[11px] space-y-0.5">
                {derived.mustHaves.map((m) => (
                  <li key={m} className="font-mono">{m}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
