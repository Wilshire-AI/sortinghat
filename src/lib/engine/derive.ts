// Pure functions for deriving quiz state from answers and finalizing
// the user vector. Extracted from useQuizState.ts so server components
// (e.g., the methodology/paths page) can import them without pulling
// in the React-hook layer.

import type { Dimension, DimensionId, Question, UserVector } from '@content/types';
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
  // Housing-stock types the user would accept. Selections multiply the
  // posterior by 1 + 0.05 × matches (cap 1.20). Empty = no effect.
  housingAcceptance: string[];
  // Dimensions where the user expressed any signal (including explicit
  // neutrality like a slider at 0 or a forced-choice option whose impacts
  // include this dim with value 0). A dim that was never queried — because
  // the user skipped the question, or because no chosen option references
  // it — is NOT in this set.
  //
  // Used by the Bayesian engine to skip untouched dims in the likelihood
  // (no info → no contribution). The Euclidean engine ignores this field;
  // it's pure bookkeeping until the Bayesian path lands.
  touchedDims: Set<DimensionId>;
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
  const housingAcceptance = new Set<string>();
  const touchedDims = new Set<DimensionId>();
  let commuteToleranceMinutes = 0;

  for (const q of questions) {
    const a = answers[q.id];
    if (!a) continue;

    if (q.kind === 'forced_choice' && a.kind === 'forced_choice') {
      const choice = q.choices[a.choiceIndex];
      if (choice) {
        for (const [dim, impact] of Object.entries(choice.impacts)) {
          const num = impact as number;
          vector[dim] = (vector[dim] ?? 0) + num;
          // Explicit-zero impacts ("either / no strong pull / depends")
          // signal no preference, not "preference for the middle." Don't
          // touch the dim — under Bayesian, an untouched dim contributes
          // no penalty regardless of nbhd value, which is what neutrality
          // means semantically.
          if (num !== 0) touchedDims.add(dim);
        }
        if (choice.softPrefs) {
          for (const sp of choice.softPrefs) softPrefs.add(sp);
        }
        if (typeof choice.commuteToleranceMinutes === 'number') {
          commuteToleranceMinutes = choice.commuteToleranceMinutes;
        }
      }
    } else if (q.kind === 'slider' && a.kind === 'slider') {
      // Two slider shapes:
      //  - Single-dim: SET dim to slider value (legacy, for agree/disagree
      //    questions like safety-need where the slider IS the user's value).
      //  - Multi-dim impacts: ADD impact * slider value to each dim (for
      //    semantic-differential questions like Trendsetting ↔ Traditional
      //    where one slider position correlates with multiple dims).
      if (q.impacts) {
        for (const [dim, impact] of Object.entries(q.impacts)) {
          const num = (impact as number) * a.value;
          vector[dim] = (vector[dim] ?? 0) + num;
          // Touch only when the user expressed a non-neutral position. A
          // slider parked at 0 contributes nothing — same neutrality
          // semantics as forced_choice with explicit-zero impacts.
          if (a.value !== 0) touchedDims.add(dim);
        }
      } else if (q.dimensionId) {
        vector[q.dimensionId] = a.value;
        touchedDims.add(q.dimensionId);
      }
    } else if (q.kind === 'multi_select' && a.kind === 'multi_select') {
      if (q.purpose === 'must_haves') {
        for (const v of a.selectedValues) mustHaves.add(v);
      } else if (q.purpose === 'commute_targets') {
        for (const v of a.selectedValues) commuteTargets.add(v);
      } else if (q.purpose === 'housing_acceptance') {
        for (const v of a.selectedValues) housingAcceptance.add(v);
      } else if (
        q.purpose === 'walkable_amenities' ||
        q.purpose === 'place_archetype' ||
        q.purpose === 'street_energy'
      ) {
        // All three purposes have the same shape: per-option impacts ADD to
        // the user vector (vs. cultural_tags where selections feed the tag
        // set).
        for (const v of a.selectedValues) {
          const opt = q.options.find((o) => o.value === v);
          if (opt?.impacts) {
            for (const [dim, impact] of Object.entries(opt.impacts)) {
              vector[dim] = (vector[dim] ?? 0) + (impact as number);
              touchedDims.add(dim);
            }
          }
        }
      } else {
        for (const v of a.selectedValues) selectedTags.add(v);
      }
      if (q.dimensionImpactPerSelection && a.selectedValues.length > 0) {
        for (const [dim, impact] of Object.entries(q.dimensionImpactPerSelection)) {
          vector[dim] = (vector[dim] ?? 0) + (impact as number) * a.selectedValues.length;
          touchedDims.add(dim);
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
    housingAcceptance: Array.from(housingAcceptance),
    touchedDims,
  };
}

export function finalizeVector(state: { vector: UserVector }): UserVector {
  return clampVector(state.vector);
}
