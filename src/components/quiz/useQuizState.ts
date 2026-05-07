'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dimension, Question, UserVector } from '@content/types';
import { clampVector, zeroVector } from '@/lib/engine/vector';

// localStorage key for in-progress quiz answers. Lets a user refresh the
// page, navigate away, or come back later without losing partial progress.
const STORAGE_KEY = 'sortinghat:quiz-answers';

export type Answer =
  | { kind: 'forced_choice'; choiceIndex: number }
  | { kind: 'slider'; value: number }
  | { kind: 'multi_select'; selectedValues: string[] };

export type Answers = Record<string, Answer>;

export type DerivedState = {
  vector: UserVector;
  selectedTags: string[];
  mustHaves: string[];
  commuteTargets: string[];
  commuteToleranceMinutes: number;
};

// Pure function: derive full quiz state from a set of answers. Used by
// useQuizState (live) and by quiz/page (computing final state on submit).
// Recomputing from scratch each time means back-navigation + answer
// revision works correctly: there's no accumulator to roll back.
export function deriveState(
  dimensions: readonly Dimension[],
  questions: readonly Question[],
  answers: Answers,
): DerivedState {
  const vector = zeroVector(dimensions);
  const selectedTags = new Set<string>();
  const mustHaves = new Set<string>();
  const commuteTargets = new Set<string>();
  let commuteToleranceMinutes = 0;

  for (const q of questions) {
    const a = answers[q.id];
    if (!a) continue;

    if (q.kind === 'forced_choice' && a.kind === 'forced_choice') {
      const choice = q.choices[a.choiceIndex];
      if (choice) {
        for (const [dim, impact] of Object.entries(choice.impacts)) {
          vector[dim] = (vector[dim] ?? 0) + (impact as number);
        }
      }
    } else if (q.kind === 'slider' && a.kind === 'slider') {
      vector[q.dimensionId] = a.value;
    } else if (q.kind === 'multi_select' && a.kind === 'multi_select') {
      if (q.purpose === 'must_haves') {
        for (const v of a.selectedValues) mustHaves.add(v);
      } else if (q.purpose === 'commute_targets') {
        for (const v of a.selectedValues) commuteTargets.add(v);
      } else if (q.purpose === 'commute_tolerance') {
        // Single-pick by convention; first selection wins.
        const picked = a.selectedValues[0];
        if (picked) {
          const parsed = parseInt(picked, 10);
          if (!Number.isNaN(parsed)) commuteToleranceMinutes = parsed;
        }
      } else {
        for (const v of a.selectedValues) selectedTags.add(v);
      }
      if (q.dimensionImpactPerSelection) {
        for (const [dim, impact] of Object.entries(q.dimensionImpactPerSelection)) {
          vector[dim] = (vector[dim] ?? 0) + (impact as number) * a.selectedValues.length;
        }
      }
    }
  }

  return {
    vector,
    selectedTags: Array.from(selectedTags),
    mustHaves: Array.from(mustHaves),
    commuteTargets: Array.from(commuteTargets),
    commuteToleranceMinutes,
  };
}

export function finalizeVector(state: { vector: UserVector }): UserVector {
  return clampVector(state.vector);
}

function loadStoredAnswers(): Answers {
  if (typeof window === 'undefined') return {};
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') return parsed as Answers;
    return {};
  } catch {
    return {};
  }
}

export function useQuizState(dimensions: readonly Dimension[], questions: readonly Question[]) {
  const [answers, setAnswers] = useState<Answers>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. Done in an effect (not the initializer)
  // so server-rendered state stays empty and matches what the client renders
  // before hydration — avoids React hydration mismatches. setState-in-effect
  // is the canonical pattern for loading external storage on mount; the
  // generic lint rule against it doesn't apply here.
  useEffect(() => {
    const stored = loadStoredAnswers();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Object.keys(stored).length > 0) setAnswers(stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // Sync answers to localStorage whenever they change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // Disabled storage / quota full / private mode — silently fall through.
      // Quiz still works, just doesn't persist across refresh.
    }
  }, [answers, hydrated]);

  const derived = useMemo(
    () => deriveState(dimensions, questions, answers),
    [dimensions, questions, answers],
  );

  return {
    answers,
    hydrated,
    state: { ...derived, answers },
    setAnswer: (questionId: string, answer: Answer) =>
      setAnswers((prev) => ({ ...prev, [questionId]: answer })),
    reset: () => {
      setAnswers({});
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    },
  };
}

// Clear stored quiz answers. Called from results page when the user submits
// (so a fresh "retake the quiz" link starts clean).
export function clearStoredQuizAnswers() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
