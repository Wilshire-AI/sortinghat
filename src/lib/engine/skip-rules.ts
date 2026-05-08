import type { Question } from '@content/types';
import type { Answers } from './derive';

export type ShouldSkip = (questionId: string, answers: Answers) => boolean;

// Conditional skips: when prior answers make a question meaningless, skip it.
// `commute-tolerance` is meaningless when the user has no real commute target
// (only "remote" / "other" selected on `commute-target`).
export function shouldSkip(questionId: string, answers: Answers): boolean {
  if (questionId === 'commute-tolerance') {
    const a = answers['commute-target'];
    if (!a || a.kind !== 'multi_select') return false;
    const real = a.selectedValues.filter((v) => v !== 'remote' && v !== 'other');
    return real.length === 0;
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
