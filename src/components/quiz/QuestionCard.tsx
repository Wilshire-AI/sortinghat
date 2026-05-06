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
      <h2 className="mt-4 font-serif text-3xl sm:text-4xl leading-tight">
        {question.prompt}
      </h2>
      {question.kind === 'forced_choice' ? (
        <ForcedChoice question={question} onAnswer={onAnswer} />
      ) : (
        <Slider key={question.id} question={question} onAnswer={onAnswer} />
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
  // `key={question.id}` on the parent ensures this component remounts per question,
  // so initial state of 0 is correct without an effect.
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
        Continue →
      </button>
    </div>
  );
}
