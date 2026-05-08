// Pure functions for deriving quiz state from answers and finalizing
// the user vector. Extracted from useQuizState.ts so server components
// (e.g., the methodology/paths page) can import them without pulling
// in the React-hook layer.

import type { Dimension, Question, UserVector } from '@content/types';
import { clampVector, zeroVector } from './vector';

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
  softPrefs: string[];
};

// Pure function: derive full quiz state from a set of answers.
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
  const softPrefs = new Set<string>();
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
        if (choice.softPrefs) {
          for (const sp of choice.softPrefs) softPrefs.add(sp);
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
        const picked = a.selectedValues[0];
        if (picked) {
          const parsed = parseInt(picked, 10);
          if (!Number.isNaN(parsed)) commuteToleranceMinutes = parsed;
        }
      } else if (q.purpose === 'walkable_amenities') {
        for (const v of a.selectedValues) {
          const opt = q.options.find((o) => o.value === v);
          if (opt?.impacts) {
            for (const [dim, impact] of Object.entries(opt.impacts)) {
              vector[dim] = (vector[dim] ?? 0) + (impact as number);
            }
          }
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
    softPrefs: Array.from(softPrefs),
  };
}

export function finalizeVector(state: { vector: UserVector }): UserVector {
  return clampVector(state.vector);
}
