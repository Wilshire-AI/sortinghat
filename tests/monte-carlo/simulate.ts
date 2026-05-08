import type { Answer, Answers } from '@/lib/engine/derive';
import { deriveState, finalizeVector } from '@/lib/engine/derive';
import { rankNeighborhoods } from '@/lib/engine/score';
import type { Dimension, Neighborhood, NeighborhoodId, Question } from '@content/types';

// Deterministic PRNG (Mulberry32). Same seed → same MC distribution.
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a single random "user" by sampling each non-filter question.
// Skipped categories: must_haves (would distort distribution by filtering),
// commute_targets / commute_tolerance (commute is orthogonal to dim calibration).
// This isolates the engine's vector-geometry from filter and commute effects,
// which is what we want to measure when comparing pre/post a calibration shift.
export function generateRandomAnswers(
  rand: () => number,
  questions: readonly Question[],
): Answers {
  const answers: Answers = {};
  for (const q of questions) {
    if (q.kind === 'forced_choice') {
      const choiceIndex = Math.floor(rand() * q.choices.length);
      const a: Answer = { kind: 'forced_choice', choiceIndex };
      answers[q.id] = a;
    } else if (q.kind === 'slider') {
      const sliderValues = [-1, -0.5, 0, 0.5, 1];
      const value = sliderValues[Math.floor(rand() * sliderValues.length)];
      const a: Answer = { kind: 'slider', value };
      answers[q.id] = a;
    } else if (q.kind === 'multi_select') {
      if (q.purpose === 'must_haves' || q.purpose === 'commute_targets' || q.purpose === 'commute_tolerance') {
        continue;
      }
      const cap = Math.min(q.options.length, q.maxSelections ?? q.options.length);
      const k = Math.floor(rand() * (cap + 1));
      const indices = new Set<number>();
      while (indices.size < k) indices.add(Math.floor(rand() * q.options.length));
      const selectedValues = Array.from(indices).map((i) => q.options[i].value);
      const a: Answer = { kind: 'multi_select', selectedValues };
      answers[q.id] = a;
    }
  }
  return answers;
}

export type MonteCarloResult = {
  samples: number;
  seed: number;
  contentVersion: string | number;
  perNeighborhoodTopOne: Record<string, number>;
  perBoroughTopOne: Record<string, number>;
  averageDistinctBoroughsTop5: number;
};

// Reachability: for each neighborhood, count how many of N samples placed it
// in the top-K results, for each K in topK. Useful for "what fraction of quiz
// answer combinations land this neighborhood in the user's top 3?" — a
// methodology / admin question, not a regression-gate question.
export type MonteCarloReachability = {
  samples: number;
  seed: number;
  topK: readonly number[];
  // perNeighborhood[id][k] = number of samples where the nbhd was in top-k.
  perNeighborhood: Record<string, Record<number, number>>;
};

export function runMonteCarloReachability(opts: {
  samples: number;
  seed: number;
  topK: readonly number[];
  questions: readonly Question[];
  dimensions: readonly Dimension[];
  neighborhoods: readonly Neighborhood[];
  populationsByNeighborhood?: Readonly<Record<NeighborhoodId, number>>;
  populationPriorWeight?: number;
}): MonteCarloReachability {
  const { samples, seed, topK, questions, dimensions, neighborhoods, populationsByNeighborhood, populationPriorWeight } = opts;
  const rand = mulberry32(seed);
  const maxK = Math.max(...topK);
  const perNeighborhood: Record<string, Record<number, number>> = {};
  for (const n of neighborhoods) {
    perNeighborhood[n.id] = {};
    for (const k of topK) perNeighborhood[n.id][k] = 0;
  }

  for (let i = 0; i < samples; i++) {
    const answers = generateRandomAnswers(rand, questions);
    const derived = deriveState(dimensions, questions, answers);
    const vec = finalizeVector(derived);
    const top = rankNeighborhoods(vec, neighborhoods, dimensions, {
      topN: maxK,
      selectedTags: derived.selectedTags,
      softPrefs: derived.softPrefs,
      populationsByNeighborhood,
      populationPriorWeight,
    });
    for (let pos = 0; pos < top.length; pos++) {
      const id = top[pos].neighborhood.id;
      for (const k of topK) {
        if (pos < k) perNeighborhood[id][k]++;
      }
    }
  }

  return { samples, seed, topK: [...topK], perNeighborhood };
}

export function runMonteCarlo(opts: {
  samples: number;
  seed: number;
  questions: readonly Question[];
  dimensions: readonly Dimension[];
  neighborhoods: readonly Neighborhood[];
  contentVersion: string | number;
}): MonteCarloResult {
  const { samples, seed, questions, dimensions, neighborhoods, contentVersion } = opts;
  const rand = mulberry32(seed);
  const perNeighborhoodTopOne: Record<string, number> = {};
  const perBoroughTopOne: Record<string, number> = {};
  let sumDistinctBoroughsTop5 = 0;

  for (let i = 0; i < samples; i++) {
    const answers = generateRandomAnswers(rand, questions);
    const derived = deriveState(dimensions, questions, answers);
    const vec = finalizeVector(derived);
    const top5 = rankNeighborhoods(vec, neighborhoods, dimensions, {
      topN: 5,
      selectedTags: derived.selectedTags,
      softPrefs: derived.softPrefs,
    });
    if (top5.length === 0) continue;
    const winner = top5[0].neighborhood;
    perNeighborhoodTopOne[winner.id] = (perNeighborhoodTopOne[winner.id] ?? 0) + 1;
    perBoroughTopOne[winner.borough] = (perBoroughTopOne[winner.borough] ?? 0) + 1;
    const distinctBoroughs = new Set(top5.map((r) => r.neighborhood.borough)).size;
    sumDistinctBoroughsTop5 += distinctBoroughs;
  }

  return {
    samples,
    seed,
    contentVersion,
    perNeighborhoodTopOne,
    perBoroughTopOne,
    averageDistinctBoroughsTop5: sumDistinctBoroughsTop5 / samples,
  };
}
