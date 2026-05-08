import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { rankNeighborhoods } from '@/lib/engine/score';
import {
  deriveState,
  finalizeVector,
  type Answer,
  type Answers,
} from '@/components/quiz/useQuizState';

// One-off persona regenerator. Runs only when REGEN_PERSONAS=1 is set;
// otherwise it's an inert no-op so it doesn't slow the regular suite.
//
// Algorithm: cumulative-greedy. For each target neighborhood, walk the
// questions in order and for each one, try every plausible answer (every
// forced-choice index, every slider value in {-1,-0.5,0,0.5,1}, every
// non-empty subset of multi-select options up to maxSelections). Pick
// the answer that gives the target the best score given the answers
// committed so far. Preserves existing `description` overrides.
//
// Output: content/neighborhood-personas.json
//
// Usage: REGEN_PERSONAS=1 npx vitest run tests/engine/_regen.test.ts
//
// Known limitation (do not apply blindly): myopic greedy degenerates
// under the engine's `user=0 → no penalty` symmetric-dim rule. With
// place-tier as Q1, the "I'm not sure yet" zero-impact option is locally
// optimal (zero distance always beats positive distance) so the regen
// picks "unsure" for most personas, losing the place-tier signal and
// dropping the per-neighborhood gate test below 95% top-15. The legacy
// personas pre-date that rule and were tuned around it.
//
// Improving this regen requires either (a) a closeness-bonus tiebreaker
// that prefers signed picks matching neighborhood direction, or (b)
// simulated annealing over the full answer space. Until then, prefer
// hand-edits to specific personas over a wholesale regen.

const PERSONAS_PATH = join(__dirname, '..', '..', 'content', 'neighborhood-personas.json');
const SLIDER_VALUES = [-1, -0.5, 0, 0.5, 1] as const;

function scoreFor(targetId: string, answers: Answers): number {
  // Maximize the target's own score, with a small tie-break preferring lower
  // rank (so when two answer paths give equal raw score, prefer the one that
  // makes the target the actual top neighborhood, not just tied for top).
  const derived = deriveState(dimensions, questions, answers);
  const ranked = rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
    topN: neighborhoods.length,
    selectedTags: derived.selectedTags,
    softPrefs: derived.softPrefs,
  });
  const idx = ranked.findIndex((x) => x.neighborhood.id === targetId);
  if (idx < 0) return -Infinity;
  return ranked[idx].score - idx * 0.0001;
}

function* multiSelectSubsets(options: readonly { value: string }[], maxSelections: number) {
  yield [];
  const cap = Math.min(options.length, maxSelections);
  // Enumerate all non-empty subsets up to cap. For 9-option questions
  // (walking-distance-amenities) with cap 3, that's ~129 subsets — fine.
  const n = options.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(options[i].value);
    }
    if (subset.length > cap) continue;
    yield subset;
  }
}

function bestAnswerFor(
  questionId: string,
  targetId: string,
  committed: Answers,
): Answer | null {
  const q = questions.find((x) => x.id === questionId);
  if (!q) return null;
  let bestAnswer: Answer | null = null;
  let bestScore = -Infinity;

  if (q.kind === 'forced_choice') {
    for (let i = 0; i < q.choices.length; i++) {
      const candidate: Answer = { kind: 'forced_choice', choiceIndex: i };
      const next = { ...committed, [questionId]: candidate };
      const s = scoreFor(targetId, next);
      if (s > bestScore) {
        bestScore = s;
        bestAnswer = candidate;
      }
    }
  } else if (q.kind === 'slider') {
    for (const v of SLIDER_VALUES) {
      const candidate: Answer = { kind: 'slider', value: v };
      const next = { ...committed, [questionId]: candidate };
      const s = scoreFor(targetId, next);
      if (s > bestScore) {
        bestScore = s;
        bestAnswer = candidate;
      }
    }
  } else if (q.kind === 'multi_select') {
    // Skip must-haves for personas — they'd over-constrain by design.
    if (q.purpose === 'must_haves') {
      return { kind: 'multi_select', selectedValues: [] };
    }
    // Skip commute target/tolerance — personas focus on dim calibration,
    // not commute behavior. Empty default matches the prior generator.
    if (q.purpose === 'commute_targets' || q.purpose === 'commute_tolerance') {
      return { kind: 'multi_select', selectedValues: [] };
    }
    const cap = q.maxSelections ?? q.options.length;
    for (const subset of multiSelectSubsets(q.options, cap)) {
      const candidate: Answer = { kind: 'multi_select', selectedValues: subset };
      const next = { ...committed, [questionId]: candidate };
      const s = scoreFor(targetId, next);
      if (s > bestScore) {
        bestScore = s;
        bestAnswer = candidate;
      }
    }
  }
  return bestAnswer;
}

describe.skipIf(process.env.REGEN_PERSONAS !== '1')('regen personas', () => {
  it('writes a fresh content/neighborhood-personas.json', { timeout: 600000 }, () => {
    const existing = JSON.parse(readFileSync(PERSONAS_PATH, 'utf-8')) as Record<
      string,
      { description: string | null; answers: Answers }
    >;

    const out: Record<string, { description: string | null; answers: Answers }> = {};
    for (const target of neighborhoods) {
      const committed: Answers = {};
      for (const q of questions) {
        const a = bestAnswerFor(q.id, target.id, committed);
        if (a) committed[q.id] = a;
      }
      out[target.id] = {
        description: existing[target.id]?.description ?? null,
        answers: committed,
      };
    }

    writeFileSync(PERSONAS_PATH, JSON.stringify(out, null, 2) + '\n');
    expect(Object.keys(out).length).toBe(neighborhoods.length);
  });
});
