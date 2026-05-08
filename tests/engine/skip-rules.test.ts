import { describe, it, expect } from 'vitest';
import { questions } from '@content/questions';
import { shouldSkip, pruneSkippedAnswers, progressFor } from '@/lib/engine/skip-rules';
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

describe('shouldSkip — school-need', () => {
  it('skips school-need when family-horizon is no-kids', () => {
    const answers: Answers = {
      'family-horizon': { kind: 'forced_choice', choiceIndex: 2 },
    };
    expect(shouldSkip('school-need', answers)).toBe(true);
  });

  it('does not skip school-need when family-horizon is yes-kids', () => {
    const answers: Answers = {
      'family-horizon': { kind: 'forced_choice', choiceIndex: 0 },
    };
    expect(shouldSkip('school-need', answers)).toBe(false);
  });

  it('does not skip school-need when family-horizon is maybe', () => {
    const answers: Answers = {
      'family-horizon': { kind: 'forced_choice', choiceIndex: 1 },
    };
    expect(shouldSkip('school-need', answers)).toBe(false);
  });

  it('does not skip school-need when family-horizon unanswered', () => {
    expect(shouldSkip('school-need', {})).toBe(false);
  });
});

describe('shouldSkip — cultural-communities', () => {
  it('skips cultural-communities when cultural-anchor is not-a-factor', () => {
    const answers: Answers = {
      'cultural-anchor': { kind: 'forced_choice', choiceIndex: 2 },
    };
    expect(shouldSkip('cultural-communities', answers)).toBe(true);
  });

  it('does not skip cultural-communities when cultural-anchor is essential', () => {
    const answers: Answers = {
      'cultural-anchor': { kind: 'forced_choice', choiceIndex: 0 },
    };
    expect(shouldSkip('cultural-communities', answers)).toBe(false);
  });

  it('does not skip cultural-communities when cultural-anchor unanswered', () => {
    expect(shouldSkip('cultural-communities', {})).toBe(false);
  });
});

describe('shouldSkip — community-fabric-mode (AND-not-OR)', () => {
  it('skips for dense-urban no-kids user', () => {
    const answers: Answers = {
      'place-tier': { kind: 'forced_choice', choiceIndex: 0 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 2 },
    };
    expect(shouldSkip('community-fabric-mode', answers)).toBe(true);
  });

  it('does NOT skip for dense-urban yes-kids user (regression test for OR variant)', () => {
    const answers: Answers = {
      'place-tier': { kind: 'forced_choice', choiceIndex: 0 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 0 },
    };
    expect(shouldSkip('community-fabric-mode', answers)).toBe(false);
  });

  it('does not skip for suburb-leaning no-kids user', () => {
    const answers: Answers = {
      'place-tier': { kind: 'forced_choice', choiceIndex: 3 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 2 },
    };
    expect(shouldSkip('community-fabric-mode', answers)).toBe(false);
  });

  it('does not skip when nothing answered', () => {
    expect(shouldSkip('community-fabric-mode', {})).toBe(false);
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

describe('progressFor', () => {
  it('reports total = full visible count, collapsing grouped pairs to one step', () => {
    const { total } = progressFor(0, questions, {});
    // Each `groupNext: true` question shares a screen with its next visible
    // neighbor, so the pair counts as a single step.
    const groupCount = questions.filter((q) => q.groupNext).length;
    expect(total).toBe(questions.length - groupCount);
  });

  it('reduces total as cascade skips fire (no-kids drops school-need)', () => {
    const { total: baseTotal } = progressFor(0, questions, {});
    const { total: noKidsTotal } = progressFor(0, questions, {
      'family-horizon': { kind: 'forced_choice', choiceIndex: 2 },
    });
    expect(noKidsTotal).toBe(baseTotal - 1);
  });

  it('reduces total when cultural-anchor is not-a-factor', () => {
    const { total: baseTotal } = progressFor(0, questions, {});
    const { total: noCultureTotal } = progressFor(0, questions, {
      'cultural-anchor': { kind: 'forced_choice', choiceIndex: 2 },
    });
    expect(noCultureTotal).toBe(baseTotal - 1);
  });

  it('current counts visible (non-skipped) positions only', () => {
    const noKidsAnswers: Answers = {
      'family-horizon': { kind: 'forced_choice', choiceIndex: 2 },
    };
    // family-horizon is index 1 (after place-tier). User just answered Q2.
    const { current } = progressFor(1, questions, noKidsAnswers);
    expect(current).toBe(2);
  });

  it('current never exceeds total', () => {
    const { current, total } = progressFor(questions.length - 1, questions, {});
    expect(current).toBeLessThanOrEqual(total);
  });

  it('returns at least 1 for both fields even with empty input', () => {
    const empty = progressFor(0, [], {});
    expect(empty.current).toBeGreaterThanOrEqual(1);
    expect(empty.total).toBeGreaterThanOrEqual(1);
  });

  it('treats commute-target+commute-tolerance as one screen step', () => {
    const targetIdx = questions.findIndex((q) => q.id === 'commute-target');
    const toleranceIdx = questions.findIndex((q) => q.id === 'commute-tolerance');
    expect(targetIdx).toBeGreaterThan(-1);
    expect(toleranceIdx).toBe(targetIdx + 1);
    // commute-target is groupNext-flagged; it pairs with the next visible
    // question (commute-tolerance). Position on either index should yield
    // the same `current` value (the collapsed screen counter).
    const onPrimary = progressFor(targetIdx, questions, {});
    const onPartner = progressFor(toleranceIdx, questions, {});
    expect(onPrimary.current).toBe(onPartner.current);
    expect(onPrimary.total).toBe(onPartner.total);
  });

  it('counts commute-target+commute-tolerance pair only once even when partner is skipped', () => {
    // When commute-tolerance is skipped (remote-only target), the pair
    // collapses to just commute-target, but groupNext still tries to swallow
    // the next visible question. Verify the collapse logic doesn't accidentally
    // eat a non-grouped neighbor.
    const baseTotal = progressFor(0, questions, {}).total;
    const remoteOnly = progressFor(0, questions, {
      'commute-target': { kind: 'multi_select', selectedValues: ['remote'] },
    }).total;
    // commute-tolerance is now skipped (-1 visible question), but it was
    // already collapsed into the commute-target screen, so total stays the
    // same: removing one half of an already-collapsed pair doesn't change
    // the screen count.
    expect(remoteOnly).toBe(baseTotal);
  });
});

describe('groupNext content invariants', () => {
  it('commute-target has groupNext: true and immediately precedes commute-tolerance', () => {
    const targetIdx = questions.findIndex((q) => q.id === 'commute-target');
    expect(targetIdx).toBeGreaterThan(-1);
    expect(questions[targetIdx].groupNext).toBe(true);
    expect(questions[targetIdx + 1]?.id).toBe('commute-tolerance');
  });

  it('groupNext questions are not themselves skipped by current rules', () => {
    // A skipped primary would orphan its partner; if we ever add such a rule
    // we need new logic. For now, confirm none of our group primaries are
    // skipped under empty answers (a baseline state).
    for (const q of questions) {
      if (q.groupNext) {
        expect(shouldSkip(q.id, {})).toBe(false);
      }
    }
  });
});
