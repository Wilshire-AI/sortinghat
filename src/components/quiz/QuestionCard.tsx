'use client';

import { useState } from 'react';
import type { Question } from '@content/types';
import type { Answer } from './useQuizState';

type Props = {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: Answer) => void;
};

export function QuestionCard({ question, questionNumber, totalQuestions, onAnswer }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 className="mt-4 font-serif text-3xl sm:text-4xl leading-[1.1] tracking-tight">
        {question.prompt}
      </h2>
      {question.kind === 'forced_choice' ? (
        <ForcedChoice question={question} onAnswer={onAnswer} />
      ) : question.kind === 'slider' ? (
        <Slider key={question.id} question={question} onAnswer={onAnswer} />
      ) : (
        <MultiSelect key={question.id} question={question} onAnswer={onAnswer} />
      )}
    </div>
  );
}

function ForcedChoice({
  question,
  onAnswer,
}: {
  question: Extract<Question, { kind: 'forced_choice' }>;
  onAnswer: (a: Answer) => void;
}) {
  return (
    <div className="mt-10 space-y-4" role="radiogroup" aria-label={question.prompt}>
      {question.choices.map((choice, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={false}
          onClick={() => onAnswer({ kind: 'forced_choice', choiceIndex: i })}
          className="w-full text-left rounded-2xl border border-[var(--color-line)] px-6 py-5 hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)]/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] transition"
        >
          <span className="text-base sm:text-lg leading-snug">{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

// 5-point Likert rendered as a slider track with discrete positions.
// Visual continuity with a slider; data is properly discrete (no false
// precision, no anchor bias on a starting position the user didn't choose).
const LIKERT_POSITIONS = [-1, -0.5, 0, 0.5, 1] as const;
const LIKERT_DEFAULT_LABELS = ['Strongly low', 'Low', 'Moderate', 'High', 'Strongly high'] as const;

function Slider({
  question,
  onAnswer,
}: {
  question: Extract<Question, { kind: 'slider' }>;
  onAnswer: (a: Answer) => void;
}) {
  const [pos, setPos] = useState<number | null>(null);
  const labels = [
    question.lowLabel,
    '',
    'Moderate',
    '',
    question.highLabel,
  ];

  return (
    <div className="mt-10" role="radiogroup" aria-label={question.prompt}>
      <div className="px-4 sm:px-8 py-6">
        <div className="relative">
          {/* Track */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-line)]"
          />
          {/* Filled portion (only when selected) */}
          {pos !== null && (
            <div
              aria-hidden
              className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${(pos / (LIKERT_POSITIONS.length - 1)) * 100}%` }}
            />
          )}
          {/* Five discrete positions */}
          <div className="relative flex justify-between">
            {LIKERT_POSITIONS.map((value, i) => {
              const isSelected = pos === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={LIKERT_DEFAULT_LABELS[i]}
                  onClick={() => setPos(i)}
                  className={
                    'relative z-10 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] ' +
                    (isSelected
                      ? 'w-5 h-5 bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/20'
                      : 'w-3.5 h-3.5 bg-[var(--color-bg)] border-2 border-[var(--color-ink)]/30 hover:border-[var(--color-ink)] hover:scale-110')
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between text-sm text-[var(--color-muted)] px-4 sm:px-8">
        <span className="max-w-[40%]">{question.lowLabel}</span>
        <span className="max-w-[40%] text-right">{question.highLabel}</span>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        {pos === null ? 'Pick a position' : labels[pos] || `Position ${pos + 1} of 5`}
      </p>

      <button
        type="button"
        disabled={pos === null}
        onClick={() => pos !== null && onAnswer({ kind: 'slider', value: LIKERT_POSITIONS[pos] })}
        className="mt-6 inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}

function MultiSelect({
  question,
  onAnswer,
}: {
  question: Extract<Question, { kind: 'multi_select' }>;
  onAnswer: (a: Answer) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (val: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  return (
    <div className="mt-10">
      {question.helperText && (
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{question.helperText}</p>
      )}
      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {question.options.map((opt) => {
          const isSelected = selected.has(opt.value);
          return (
            <li key={opt.value}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggle(opt.value)}
                className={
                  'w-full text-left rounded-xl border px-4 py-3 text-sm leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ' +
                  (isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)]/[0.04]')
                }
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className={
                      'inline-block h-3.5 w-3.5 rounded-sm border ' +
                      (isSelected
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                        : 'border-[var(--color-ink)]/40')
                    }
                  />
                  {opt.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-10 flex items-center gap-4">
        <button
          type="button"
          onClick={() => onAnswer({ kind: 'multi_select', selectedValues: Array.from(selected) })}
          className="inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
        >
          {selected.size === 0 ? 'Skip' : `Continue with ${selected.size} selected`}
        </button>
      </div>
    </div>
  );
}
