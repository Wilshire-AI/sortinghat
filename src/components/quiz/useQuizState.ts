'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dimension, Question } from '@content/types';
// Re-export pure helpers from the non-client engine module so existing
// imports of Answer / Answers / deriveState / finalizeVector via this
// file still work.
export type { Answer, Answers, DerivedState } from '@/lib/engine/derive';
export { deriveState, finalizeVector } from '@/lib/engine/derive';
import type { Answer, Answers } from '@/lib/engine/derive';
import { deriveState as _deriveState } from '@/lib/engine/derive';
import { pruneSkippedAnswers } from '@/lib/engine/skip-rules';

// localStorage key for in-progress quiz answers. Lets a user refresh the
// page, navigate away, or come back later without losing partial progress.
const STORAGE_KEY = 'sortinghat:quiz-answers';

function loadStoredAnswers(): Answers {
  if (typeof window === 'undefined') return {};
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') return parsed as Answers;
    return {};
  } catch {
    return {};
  }
}

export function useQuizState(dimensions: readonly Dimension[], questions: readonly Question[]) {
  const [answers, setAnswers] = useState<Answers>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. Done in an effect (not the initializer)
  // so server-rendered state stays empty and matches what the client renders
  // before hydration — avoids React hydration mismatches. setState-in-effect
  // is the canonical pattern for loading external storage on mount; the
  // generic lint rule against it doesn't apply here.
  useEffect(() => {
    const stored = loadStoredAnswers();
    if (Object.keys(stored).length > 0) {
      // Prune any orphaned answers from a prior session (e.g., commute-tolerance
      // stored under a now-skipped condition) before they re-enter the vector.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(pruneSkippedAnswers(questions, stored));
    }
    setHydrated(true);
    // questions is module-scope-stable; intentionally not in deps to keep
    // hydration as a once-on-mount effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync answers to localStorage whenever they change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // Disabled storage / quota full / private mode — silently fall through.
      // Quiz still works, just doesn't persist across refresh.
    }
  }, [answers, hydrated]);

  const derived = useMemo(
    () => _deriveState(dimensions, questions, answers),
    [dimensions, questions, answers],
  );

  return {
    answers,
    hydrated,
    state: { ...derived, answers },
    setAnswer: (questionId: string, answer: Answer): Answers => {
      const merged = { ...answers, [questionId]: answer };
      const pruned = pruneSkippedAnswers(questions, merged);
      setAnswers(pruned);
      return pruned;
    },
    reset: () => {
      setAnswers({});
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    },
  };
}

// Clear stored quiz answers. Called from results page when the user submits
// (so a fresh "retake the quiz" link starts clean).
export function clearStoredQuizAnswers() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
