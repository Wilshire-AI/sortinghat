'use client';

import { useMemo, useState } from 'react';
import type { Dimension, Question, UserVector } from '@content/types';
import { clampVector, zeroVector } from '@/lib/engine/vector';

export type Answer =
  | { kind: 'forced_choice'; choiceIndex: number }
  | { kind: 'slider'; value: number }
  | { kind: 'multi_select'; selectedValues: string[] };

export type Answers = Record<string, Answer>;

export type DerivedState = {
  vector: UserVector;
  selectedTags: string[];
  mustHaves: string[];
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
      const target = q.purpose === 'must_haves' ? mustHaves : selectedTags;
      for (const v of a.selectedValues) target.add(v);
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
  };
}

export function finalizeVector(state: { vector: UserVector }): UserVector {
  return clampVector(state.vector);
}

export function useQuizState(dimensions: readonly Dimension[], questions: readonly Question[]) {
  const [answers, setAnswers] = useState<Answers>({});
  const derived = useMemo(
    () => deriveState(dimensions, questions, answers),
    [dimensions, questions, answers],
  );
  return {
    answers,
    state: { ...derived, answers },
    setAnswer: (questionId: string, answer: Answer) =>
      setAnswers((prev) => ({ ...prev, [questionId]: answer })),
    reset: () => setAnswers({}),
  };
}
