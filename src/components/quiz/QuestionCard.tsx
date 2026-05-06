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

function Slider({
  question,
  onAnswer,
}: {
  question: Extract<Question, { kind: 'slider' }>;
  onAnswer: (a: Answer) => void;
}) {
  const [val, setVal] = useState(0);
  return (
    <div className="mt-10">
      <input
        type="range"
        min={-1}
        max={1}
        step={0.05}
        value={val}
        onChange={(e) => setVal(parseFloat(e.target.value))}
        aria-label={question.prompt}
        className="w-full accent-[var(--color-accent)] cursor-pointer"
      />
      <div className="mt-3 flex justify-between text-sm text-[var(--color-muted)]">
        <span>{question.lowLabel}</span>
        <span>{question.highLabel}</span>
      </div>
      <button
        type="button"
        onClick={() => onAnswer({ kind: 'slider', value: val })}
        className="mt-10 inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
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
