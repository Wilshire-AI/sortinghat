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
// Algorithm: rank-primary greedy + coordinate-ascent refinement.
//
//   The naive objective (maximize the target's raw engine score) is
//   degenerate under the engine's `userValue === 0 → no symmetric penalty`
//   rule and the analogous `userValue ≤ 0 → no asymmetric_need penalty`
//   rule (score.ts:42-65). Picking the "I'm not sure yet" forced-choice
//   on place-tier, the middle on every Likert, and zero on every slider
//   yields score 1.0 — but so does the same persona for every other
//   compatible neighborhood, with ties broken by id alphabetically.
//   Result: persona for "yorkville" ends up tied at score 1.0 with 90+
//   other neighborhoods, ranked alphabetically — fails the gate test.
//
//   Layered objective (highest weight first):
//
//   1. Rank: -targetIdx * 10. The gate test grades on rank, so optimize
//      it directly. The big multiplier ensures any rank improvement
//      dominates the other terms (which are bounded in [-1, 1]).
//
//   2. Margin: targetScore - bestOtherScore. Within a fixed rank, prefer
//      a larger lead over the next neighborhood. This prevents the
//      algorithm from settling for a barely-rank-1 persona when a more
//      decisive answer set is available.
//
//   3. Closeness bonus: small reward (ε * |impact|) on the *changed*
//      answer's impacts, summed over symmetric dims where the answer's
//      impact direction matches the neighborhood's signed score. Breaks
//      ties between answer choices that yield identical rank+margin —
//      e.g., when an empty multi-select and a well-aligned single pick
//      both leave the target at rank 1 with the same lead, prefer the
//      signed pick because it's more honest about the neighborhood's
//      character.
//
//   Phase 1 (greedy):
//     For each target neighborhood, walk the questions in order. For each
//     one, try every plausible answer (every forced-choice index, every
//     slider value in {-1,-0.5,0,0.5,1}, every non-empty subset of
//     multi-select options up to maxSelections). Pick the answer that
//     maximizes the layered objective above given the answers committed
//     so far.
//
//   Phase 2 (coordinate-ascent refinement):
//     With phase-1 answers committed, iterate over the question list,
//     re-picking each question's best answer with the others held fixed.
//     Repeat until a full pass makes no changes (typically 2–3 passes,
//     bounded at 8). Greedy commits questions one at a time using only
//     the answers committed so far; refinement gives every question a
//     chance to re-optimize against the full answer set.
//
// Output: content/neighborhood-personas.json
//
// Usage: REGEN_PERSONAS=1 npx vitest run tests/engine/_regen.test.ts
//
// Preserves `description` overrides on existing personas. Runs in ~40s
// on the current 121-neighborhood corpus.

const PERSONAS_PATH = join(__dirname, '..', '..', 'content', 'neighborhood-personas.json');
const SLIDER_VALUES = [-1, -0.5, 0, 0.5, 1] as const;

// Closeness-bonus magnitude. Has to be small enough that real score
// differences dominate (the engine's distance-based score sweeps a range
// of ~0.5 across reasonable answer sets, with per-answer deltas often
// in the 0.005–0.02 range), and large enough to break exact ties when
// the engine's user=0 rule makes two answers score identically. The
// bonus per matched dimension is at most this magnitude × |impact|,
// summed across all dims of the answer's impacts. With typical impacts
// of 0.5 and ~5 dims touched per answer, bonus is ≤ 0.0025 — well below
// any real score gap, but well above the 0.0001 rank tiebreak.
const CLOSENESS_EPSILON = 0.001;

function symmetricDimSet(): Set<string> {
  const out = new Set<string>();
  for (const d of dimensions) {
    if (d.kind === 'symmetric') out.add(d.id);
  }
  return out;
}
const SYMMETRIC_DIMS = symmetricDimSet();

function closenessBonus(
  targetScores: Readonly<Record<string, number>>,
  answer: Answer,
  questionId: string,
): number {
  // Reward answers whose impacts move a *symmetric* dim toward the
  // neighborhood's signed score. Asymmetric dims aren't ambiguous under
  // the engine rule (only-shortfall penalty), so no bonus needed there.
  const q = questions.find((x) => x.id === questionId);
  if (!q) return 0;
  let bonus = 0;

  const credit = (impacts: Record<string, number> | undefined) => {
    if (!impacts) return;
    for (const [dim, impact] of Object.entries(impacts)) {
      if (!SYMMETRIC_DIMS.has(dim)) continue;
      const nbhd = targetScores[dim] ?? 0;
      if (nbhd === 0 || impact === 0) continue;
      // sign(nbhd) === sign(impact) means impact moves user toward nbhd
      if ((nbhd > 0 && impact > 0) || (nbhd < 0 && impact < 0)) {
        bonus += Math.abs(impact);
      } else {
        bonus -= Math.abs(impact);
      }
    }
  };

  if (q.kind === 'forced_choice' && answer.kind === 'forced_choice') {
    credit(q.choices[answer.choiceIndex]?.impacts);
  } else if (q.kind === 'slider' && answer.kind === 'slider') {
    if (SYMMETRIC_DIMS.has(q.dimensionId)) {
      const nbhd = targetScores[q.dimensionId] ?? 0;
      if (nbhd !== 0 && answer.value !== 0) {
        if ((nbhd > 0 && answer.value > 0) || (nbhd < 0 && answer.value < 0)) {
          bonus += Math.abs(answer.value);
        } else {
          bonus -= Math.abs(answer.value);
        }
      }
    }
  } else if (q.kind === 'multi_select' && answer.kind === 'multi_select') {
    for (const v of answer.selectedValues) {
      const opt = q.options.find((o) => o.value === v);
      if (opt && 'impacts' in opt) {
        credit(opt.impacts as Record<string, number> | undefined);
      }
    }
  }

  return bonus * CLOSENESS_EPSILON;
}

function scoreFor(
  target: { id: string; scores: Readonly<Record<string, number>> },
  answers: Answers,
  changedQuestionId?: string,
  changedAnswer?: Answer,
): number {
  // Layered objective:
  //   1. Primary: minimize rank (the gate test directly rewards this).
  //      Encoded as -rank * BIG so any rank improvement dominates.
  //   2. Secondary: maximize the margin between the target and the best
  //      other neighborhood. Within a rank, larger lead is better.
  //   3. Tertiary: closeness bonus on the *changed* answer's impacts —
  //      breaks exact ties in favor of signed picks aligned with the
  //      neighborhood's character (so e.g. tribeca picks "dense city core"
  //      over "I'm not sure yet" when both yield identical rank+margin).
  //
  // Why primary on rank: the engine's zero-penalty rules (score.ts:42-65)
  // mean degenerate "no signal" personas score 1.0 across many neighborhoods.
  // Margin alone hits a ceiling at 0.0 for these cases, blind to whether
  // 5 or 90 neighborhoods are tied. Rank breaks alphabetically, so picking
  // by rank exposes the tie-explosion failure mode and forces the regen
  // toward signed picks that cull the tied set.
  const derived = deriveState(dimensions, questions, answers);
  const ranked = rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
    topN: neighborhoods.length,
    selectedTags: derived.selectedTags,
  });
  const targetIdx = ranked.findIndex((x) => x.neighborhood.id === target.id);
  if (targetIdx < 0) return -Infinity;
  const targetScore = ranked[targetIdx].score;
  const bestOther =
    targetIdx === 0
      ? ranked[1]?.score ?? 0
      : ranked[0].score;
  const margin = targetScore - bestOther;
  // Primary term: rank. BIG weight is large enough that any 1-rank change
  // dominates margin (margin is in [-1, 1], so BIG = 10 suffices).
  const rankTerm = -targetIdx * 10;
  let s = rankTerm + margin;
  if (changedQuestionId && changedAnswer) {
    s += closenessBonus(target.scores, changedAnswer, changedQuestionId);
  }
  return s;
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
  target: { id: string; scores: Readonly<Record<string, number>> },
  committed: Answers,
): Answer | null {
  const q = questions.find((x) => x.id === questionId);
  if (!q) return null;
  let bestAnswer: Answer | null = null;
  let bestScore = -Infinity;

  const consider = (candidate: Answer) => {
    const next = { ...committed, [questionId]: candidate };
    const s = scoreFor(target, next, questionId, candidate);
    if (s > bestScore) {
      bestScore = s;
      bestAnswer = candidate;
    }
  };

  if (q.kind === 'forced_choice') {
    for (let i = 0; i < q.choices.length; i++) {
      consider({ kind: 'forced_choice', choiceIndex: i });
    }
  } else if (q.kind === 'slider') {
    for (const v of SLIDER_VALUES) {
      consider({ kind: 'slider', value: v });
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
      consider({ kind: 'multi_select', selectedValues: subset });
    }
  }
  return bestAnswer;
}

function answersEqual(a: Answer | undefined, b: Answer | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'forced_choice' && b.kind === 'forced_choice') {
    return a.choiceIndex === b.choiceIndex;
  }
  if (a.kind === 'slider' && b.kind === 'slider') {
    return a.value === b.value;
  }
  if (a.kind === 'multi_select' && b.kind === 'multi_select') {
    if (a.selectedValues.length !== b.selectedValues.length) return false;
    const as = [...a.selectedValues].sort();
    const bs = [...b.selectedValues].sort();
    return as.every((v, i) => v === bs[i]);
  }
  return false;
}

describe.skipIf(process.env.REGEN_PERSONAS !== '1')('regen personas', () => {
  it('writes a fresh content/neighborhood-personas.json', { timeout: 600000 }, () => {
    const existing = JSON.parse(readFileSync(PERSONAS_PATH, 'utf-8')) as Record<
      string,
      { description: string | null; answers: Answers }
    >;

    const out: Record<string, { description: string | null; answers: Answers }> = {};
    let totalRefinementPasses = 0;

    for (const target of neighborhoods) {
      // Phase 1: greedy commit, in question order.
      let committed: Answers = {};
      for (const q of questions) {
        const a = bestAnswerFor(q.id, target, committed);
        if (a) committed = { ...committed, [q.id]: a };
      }

      // Phase 2: coordinate-ascent refinement. Re-pick each question with
      // all others held fixed; repeat until no more changes. In practice
      // this converges in 2–3 passes for nearly every neighborhood.
      const MAX_PASSES = 8;
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        let changed = false;
        for (const q of questions) {
          const before = committed[q.id];
          const without = { ...committed };
          delete without[q.id];
          const a = bestAnswerFor(q.id, target, without);
          if (a && !answersEqual(before, a)) {
            committed = { ...without, [q.id]: a };
            changed = true;
          }
        }
        totalRefinementPasses++;
        if (!changed) break;
      }

      out[target.id] = {
        description: existing[target.id]?.description ?? null,
        answers: committed,
      };
    }

    writeFileSync(PERSONAS_PATH, JSON.stringify(out, null, 2) + '\n');
    console.log(`regen: ${neighborhoods.length} personas, total refinement passes: ${totalRefinementPasses}`);
    expect(Object.keys(out).length).toBe(neighborhoods.length);
  });
});
