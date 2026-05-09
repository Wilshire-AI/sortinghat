import type { Question } from '@content/types';
import type { Answers } from './derive';
import { dimensions } from '@content/dimensions';
import { questions as allQuestions } from '@content/questions';
import { deriveState } from './derive';

export type ShouldSkip = (questionId: string, answers: Answers) => boolean;

// Choice indices that flag "no preference / not a factor" on the gating
// questions for cascade skips. Symbolic so reordering choices in
// content/questions.ts doesn't silently break a skip rule.
const FAMILY_HORIZON_NO_KIDS_INDEX = 2;

// Conditional skips: when prior answers make a question meaningless, skip it.
// Each rule documents WHY it skips, since these are easy to misjudge.
export function shouldSkip(questionId: string, answers: Answers): boolean {
  // commute-tolerance: meaningless when the user has no real commute target
  // (only "remote" / "other" selected on commute-target).
  if (questionId === 'commute-tolerance') {
    const a = answers['commute-target'];
    if (!a || a.kind !== 'multi_select') return false;
    const real = a.selectedValues.filter((v) => v !== 'remote' && v !== 'other');
    return real.length === 0;
  }

  // school-need: irrelevant when the user has explicitly said no kids.
  // school-quality is asymmetric_need (low user value = no penalty), so the
  // skip is cosmetic for scoring but real for survey load.
  if (questionId === 'school-need') {
    const a = answers['family-horizon'];
    return a?.kind === 'forced_choice' && a.choiceIndex === FAMILY_HORIZON_NO_KIDS_INDEX;
  }

  // community-fabric-mode: distinguishes walkable-village vs estate-club
  // suburb. AND-not-OR is critical: an urbanist who also wants kids
  // (urban high AND family high) IS suburb-curious for school years and
  // must see this question. Skipping that user mis-types them as
  // estate-fitting by default.
  if (questionId === 'community-fabric-mode') {
    const vector = deriveState(dimensions, allQuestions, answers).vector;
    const urban = vector['urban-intensity-tolerance'] ?? 0;
    const family = vector['family-trajectory'] ?? 0;
    return urban > 0.4 && family <= 0;
  }

  return false;
}

// Drop answers belonging to questions that are currently skipped.
// Single-pass: current skip rules don't chain (no rule's input depends on
// whether another rule fired). If a chained rule is added later, switch to
// fixed-point iteration.
export function pruneSkippedAnswers(
  questions: readonly Question[],
  answers: Answers,
  predicate: ShouldSkip = shouldSkip,
): Answers {
  const next: Answers = { ...answers };
  for (const q of questions) {
    if (predicate(q.id, next)) {
      delete next[q.id];
    }
  }
  return next;
}

// Compute current visible position and projected total visible count given
// the current answer state. The progress bar reads "Q5 of 16" not "Q5 of 20"
// — the denominator forecasts non-skipped questions, so the user sees an
// honest pace as their answers cause cascade skips.
//
// A question with `groupNext: true` shares a screen with the question at
// idx+1 (see GroupedQuestionsScreen). When idx+1 is visible, the pair
// collapses to a single step. When idx+1 is skipped, the primary becomes
// a standalone screen and the group is broken — we do NOT scan forward to
// find a different partner.
export function progressFor(
  rawIdx: number,
  questions: readonly Question[],
  answers: Answers,
  predicate: ShouldSkip = shouldSkip,
): { current: number; total: number } {
  let total = 0;
  let current = 0;
  let collapseNext = false;
  for (let i = 0; i < questions.length; i++) {
    if (predicate(questions[i].id, answers)) {
      // A skipped question can't be a partner anymore; don't carry over.
      collapseNext = false;
      continue;
    }
    if (collapseNext) {
      // This is the partner half of a grouped pair already counted on the
      // primary's iteration. Don't double-count.
      collapseNext = false;
      continue;
    }
    total++;
    if (i <= rawIdx) current++;
    // Only collapse the *immediately-next* question, and only if visible.
    if (questions[i].groupNext) {
      const partnerIdx = i + 1;
      if (
        partnerIdx < questions.length &&
        !predicate(questions[partnerIdx].id, answers)
      ) {
        collapseNext = true;
      }
    }
  }
  return { current: Math.max(1, current), total: Math.max(1, total) };
}
