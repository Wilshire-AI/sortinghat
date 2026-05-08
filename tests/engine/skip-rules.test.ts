import { describe, it, expect } from 'vitest';
import { questions } from '@content/questions';
import { shouldSkip, pruneSkippedAnswers } from '@/lib/engine/skip-rules';
import type { Answers } from '@/lib/engine/derive';

describe('shouldSkip', () => {
  it('skips commute-tolerance when commute-target is remote-only', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote'] },
    };
    expect(shouldSkip('commute-tolerance', answers)).toBe(true);
  });

  it('skips commute-tolerance when commute-target is remote+other', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote', 'other'] },
    };
    expect(shouldSkip('commute-tolerance', answers)).toBe(true);
  });

  it('does not skip commute-tolerance when a real target exists', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote', 'midtown'] },
    };
    expect(shouldSkip('commute-tolerance', answers)).toBe(false);
  });

  it('does not skip commute-tolerance when commute-target unanswered', () => {
    expect(shouldSkip('commute-tolerance', {})).toBe(false);
  });

  it('returns false for unrelated questions', () => {
    expect(shouldSkip('cultural-anchor', {})).toBe(false);
  });
});

describe('pruneSkippedAnswers', () => {
  it('drops commute-tolerance when commute-target is remote-only', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote'] },
      'commute-tolerance': { kind: 'multi_select', selectedValues: ['30'] },
    };
    const pruned = pruneSkippedAnswers(questions, answers);
    expect(pruned['commute-tolerance']).toBeUndefined();
    expect(pruned['commute-target']).toBeDefined();
  });

  it('keeps commute-tolerance when a real target remains', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['midtown', 'remote'] },
      'commute-tolerance': { kind: 'multi_select', selectedValues: ['30'] },
    };
    const pruned = pruneSkippedAnswers(questions, answers);
    expect(pruned['commute-tolerance']).toBeDefined();
  });

  it('does not mutate input', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote'] },
      'commute-tolerance': { kind: 'multi_select', selectedValues: ['30'] },
    };
    const before = JSON.stringify(answers);
    pruneSkippedAnswers(questions, answers);
    expect(JSON.stringify(answers)).toBe(before);
  });

  it('is idempotent on already-pruned input', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote'] },
      'commute-tolerance': { kind: 'multi_select', selectedValues: ['30'] },
    };
    const once = pruneSkippedAnswers(questions, answers);
    const twice = pruneSkippedAnswers(questions, once);
    expect(twice).toEqual(once);
  });

  it('returns shallow copy when nothing is skipped', () => {
    const answers: Answers = {
      'commute-target': { kind: 'multi_select', selectedValues: ['midtown'] },
    };
    const pruned = pruneSkippedAnswers(questions, answers);
    expect(pruned).toEqual(answers);
    expect(pruned).not.toBe(answers);
  });

  it('handles empty answers', () => {
    expect(pruneSkippedAnswers(questions, {})).toEqual({});
  });
});
