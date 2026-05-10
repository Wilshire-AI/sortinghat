'use client';

import type { Question } from '@content/types';
import { QuestionCard } from './QuestionCard';
import type { Answer } from './useQuizState';

type Props = {
  primary: Question;
  secondary: Question;
  questionNumber: number;
  totalQuestions: number;
  primaryAnswer?: Answer;
  secondaryAnswer?: Answer;
  onPrimaryChange: (a: Answer) => void;
  onSecondaryChange: (a: Answer) => void;
  onContinue: () => void;
  onBack?: () => void;
  onStartOver?: () => void;
};

// A "screen group" wrapper that renders two adjacent questions on the same
// page. Used for tightly-coupled pairs like commute-target + commute-tolerance.
// Each card calls onPrimaryChange / onSecondaryChange whenever the user picks
// or changes a selection, so the answers store stays current. The single
// Continue button at the bottom advances past both questions.
//
// Note: `grouped-primary` mode preserves the QuestionCard outer max-w-2xl /
// padding wrapper, so the secondary card and footer Continue button slot
// inside that same wrapper via portal-like co-location: we render them as
// siblings of the primary's outer container, then rely on absolute layout
// children inside that component shouldn't overflow.
export function GroupedQuestionsScreen({
  primary,
  secondary,
  questionNumber,
  totalQuestions,
  primaryAnswer,
  secondaryAnswer,
  onPrimaryChange,
  onSecondaryChange,
  onContinue,
  onBack,
  onStartOver,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-12">
      {/* Primary card (header + start-over + question body, no Continue) */}
      <QuestionCard
        question={primary}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        currentAnswer={primaryAnswer}
        onAnswer={onPrimaryChange}
        onStartOver={onStartOver}
        mode="grouped-primary"
      />
      <div className="border-t border-[var(--color-line)] pt-2">
        <QuestionCard
          question={secondary}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
          currentAnswer={secondaryAnswer}
          onAnswer={onSecondaryChange}
          mode="grouped-secondary"
        />
      </div>
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onContinue}
          className="inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
        >
          Continue
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
