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
      <h2 className="mt-4 font-serif text-3xl sm:text-[2.5rem] leading-[1.15] tracking-[-0.01em] font-medium">
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
          <span className="font-serif text-lg sm:text-xl leading-snug">{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

// 5-point Likert rendered as a slider with a real handle that snaps to
// 5 positions. Visual continuity with a continuous slider (solid track,
// filled portion, prominent handle) but the data is properly discrete.
const LIKERT_POSITIONS = [-1, -0.5, 0, 0.5, 1] as const;
const LIKERT_LABELS = [
  'Strongly disagree',
  'Lean disagree',
  'Neutral',
  'Lean agree',
  'Strongly agree',
] as const;

function Slider({
  question,
  onAnswer,
}: {
  question: Extract<Question, { kind: 'slider' }>;
  onAnswer: (a: Answer) => void;
}) {
  const [pos, setPos] = useState<number | null>(null);
  const lastPct = pos !== null ? (pos / (LIKERT_POSITIONS.length - 1)) * 100 : 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setPos((p) => Math.min(LIKERT_POSITIONS.length - 1, (p ?? -1) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setPos((p) => Math.max(0, (p ?? LIKERT_POSITIONS.length) - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPos(LIKERT_POSITIONS.length - 1);
    }
  };

  return (
    <div className="mt-10">
      <div
        className="px-2 sm:px-4 py-10 select-none"
        role="slider"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={pos !== null ? pos + 1 : undefined}
        aria-label={question.prompt}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="relative h-2">
          {/* Track (unfilled) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--color-ink)]/15"
          />
          {/* Filled portion */}
          <div
            aria-hidden
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--color-accent)] transition-all duration-300 ease-out"
            style={{ width: pos !== null ? `${lastPct}%` : '0%' }}
          />
          {/* Tick marks (subtle, drawn underneath the handle) */}
          <div aria-hidden className="absolute inset-0 flex justify-between items-center">
            {LIKERT_POSITIONS.map((_, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onClick={() => setPos(i)}
                aria-label={LIKERT_LABELS[i]}
                className="group flex flex-col items-center cursor-pointer"
              >
                <span
                  className={
                    'block h-2 w-px transition ' +
                    (pos !== null && i <= pos
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-ink)]/25 group-hover:bg-[var(--color-ink)]/50')
                  }
                />
                {/* Larger invisible click target */}
                <span className="absolute inset-y-[-16px] w-10 -translate-x-1/2" style={{ left: `${(i / (LIKERT_POSITIONS.length - 1)) * 100}%` }} />
              </button>
            ))}
          </div>
          {/* Handle (the visible "thumb") */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setPos(pos ?? 2)}
            className={
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[var(--color-accent)] shadow-lg ring-4 ring-[var(--color-accent)]/20 transition-all duration-300 ease-out cursor-pointer ' +
              (pos === null ? 'opacity-0 scale-75' : 'opacity-100 scale-100 hover:scale-110')
            }
            style={{ left: pos !== null ? `${lastPct}%` : '50%' }}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-sm text-[var(--color-muted)] px-2 sm:px-4">
        <span className="max-w-[42%]">{question.lowLabel}</span>
        <span className="max-w-[42%] text-right">{question.highLabel}</span>
      </div>

      <p className="mt-8 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        {pos === null ? 'Drag or click to choose' : LIKERT_LABELS[pos]}
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
                <span className="inline-flex items-center gap-2 font-serif text-base">
                  <span
                    aria-hidden
                    className={
                      'inline-block h-3.5 w-3.5 rounded-sm border shrink-0 ' +
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
