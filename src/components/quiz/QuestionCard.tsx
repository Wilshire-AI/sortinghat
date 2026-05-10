'use client';

import { useEffect, useRef, useState } from 'react';
import type { Question } from '@content/types';
import type { Answer } from './useQuizState';
import { findActiveConflicts } from '@content/must-have-conflicts';

// Render mode for QuestionCard:
// - 'standalone' (default): full screen with header, back/start-over, and the
//   normal advance flow (forced_choice auto-advances on click; slider /
//   multi_select advance on a Continue button).
// - 'grouped-primary': top half of a grouped screen. Renders header + back /
//   start-over but DOES NOT advance on its own. Calls `onAnswer` on every
//   selection change so the wrapper can buffer state. The wrapper owns the
//   Continue button.
// - 'grouped-secondary': bottom half of a grouped screen. No header, no
//   back, smaller heading. Calls `onAnswer` on every change. Wrapper-controlled.
export type QuestionCardMode = 'standalone' | 'grouped-primary' | 'grouped-secondary';

type Props = {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
  onBack?: () => void;
  onStartOver?: () => void;
  mode?: QuestionCardMode;
};

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  currentAnswer,
  onAnswer,
  onBack,
  onStartOver,
  mode = 'standalone',
}: Props) {
  const isSecondary = mode === 'grouped-secondary';
  const showHeaderRow = mode !== 'grouped-secondary';
  const grouped = mode !== 'standalone';

  // In grouped modes the outer wrapper (max-w / padding) is supplied by
  // GroupedQuestionsScreen, so we render only the question's own block.
  const outerClass = grouped ? '' : 'mx-auto max-w-2xl px-6 py-12';

  return (
    <div className={outerClass}>
      {showHeaderRow && (
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Question {questionNumber} of {totalQuestions}
          </p>
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
            >
              Start over
            </button>
          )}
        </div>
      )}
      <h2
        className={
          isSecondary
            ? 'font-serif text-2xl sm:text-3xl leading-snug tracking-[-0.005em] font-medium'
            : 'mt-4 font-serif text-3xl sm:text-[2.5rem] leading-[1.15] tracking-[-0.01em] font-medium'
        }
      >
        {question.prompt}
      </h2>
      {question.kind === 'forced_choice' ? (
        <ForcedChoice
          question={question}
          currentAnswer={currentAnswer?.kind === 'forced_choice' ? currentAnswer : undefined}
          onAnswer={onAnswer}
          grouped={grouped}
        />
      ) : question.kind === 'slider' ? (
        <Slider
          key={question.id}
          question={question}
          currentAnswer={currentAnswer?.kind === 'slider' ? currentAnswer : undefined}
          onAnswer={onAnswer}
          grouped={grouped}
        />
      ) : (
        <MultiSelect
          key={question.id}
          question={question}
          currentAnswer={currentAnswer?.kind === 'multi_select' ? currentAnswer : undefined}
          onAnswer={onAnswer}
          grouped={grouped}
        />
      )}
      {onBack && !grouped && (
        <div className="mt-12">
          <button
            type="button"
            onClick={onBack}
            className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

function ForcedChoice({
  question,
  currentAnswer,
  onAnswer,
  grouped,
}: {
  question: Extract<Question, { kind: 'forced_choice' }>;
  currentAnswer?: Extract<Answer, { kind: 'forced_choice' }>;
  onAnswer: (a: Answer) => void;
  grouped: boolean;
}) {
  const selectedIdx = currentAnswer?.choiceIndex;
  return (
    <div className={(grouped ? 'mt-6' : 'mt-10') + ' space-y-4'} role="radiogroup" aria-label={question.prompt}>
      {question.choices.map((choice, i) => {
        const isSelected = selectedIdx === i;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onAnswer({ kind: 'forced_choice', choiceIndex: i })}
            className={
              'w-full text-left rounded-2xl border px-6 py-5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ' +
              (isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/[0.08]'
                : 'border-[var(--color-line)] hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)]/[0.04]')
            }
          >
            <span className="font-serif text-lg sm:text-xl leading-snug">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const LIKERT_POSITIONS = [-1, -0.5, 0, 0.5, 1] as const;
// Agree/disagree labels for legacy single-dim sliders whose prompts ARE
// declarative statements (e.g., "I need to feel safe walking home...").
const AGREE_DISAGREE_LABELS = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree',
] as const;

// Spectrum-slider labels are derived from each question's lowLabel/highLabel
// at render time (e.g., Trendsetting ↔ Traditional). Multi-dim sliders use
// these; agree/disagree wording is wrong for them.
function spectrumLabels(low: string, high: string): readonly string[] {
  return [low, `Lean ${low.toLowerCase()}`, 'No strong pull', `Lean ${high.toLowerCase()}`, high] as const;
}

// Opacity rule for slider pole reference photos. When the user's slider
// position pulls toward one pole, that pole's photo brightens to 100% and
// the other dims to 55%. Untouched (no answer yet) and dead-center positions
// hold both at 80%.
function poleOpacity(pos: number | null, side: 'low' | 'high'): number {
  if (pos === null || pos === 2) return 0.8;
  const isLowActive = pos < 2;
  return isLowActive === (side === 'low') ? 1.0 : 0.55;
}

function Slider({
  question,
  currentAnswer,
  onAnswer,
  grouped,
}: {
  question: Extract<Question, { kind: 'slider' }>;
  currentAnswer?: Extract<Answer, { kind: 'slider' }>;
  onAnswer: (a: Answer) => void;
  grouped: boolean;
}) {
  // If revisiting, restore the previously-selected position
  const initialPos: number | null = (() => {
    if (!currentAnswer) return null;
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < LIKERT_POSITIONS.length; i++) {
      const d = Math.abs(LIKERT_POSITIONS[i] - currentAnswer.value);
      if (d < bestDist) { bestDist = d; bestI = i; }
    }
    return bestI;
  })();
  const [pos, setPos] = useState<number | null>(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastPct = pos !== null ? (pos / (LIKERT_POSITIONS.length - 1)) * 100 : 0;

  // In grouped mode, propagate the slider value upward whenever it changes.
  // The wrapper Continue button is what performs navigation; we just report
  // the current value so it gets stored.
  useEffect(() => {
    if (!grouped) return;
    if (pos === null) return;
    onAnswer({ kind: 'slider', value: LIKERT_POSITIONS[pos] });
    // onAnswer identity may change per render; we only want to report when
    // pos actually changes. eslint disable for that intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, grouped]);

  const computeSnapped = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    return Math.round(clamped * (LIKERT_POSITIONS.length - 1));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const snapped = computeSnapped(e.clientX);
    if (snapped !== null) setPos(snapped);
    setIsDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const snapped = computeSnapped(e.clientX);
    if (snapped !== null) setPos(snapped);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }
  };

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
    <div className={grouped ? 'mt-6' : 'mt-10'}>
      <div
        className="px-2 sm:px-4 py-10 select-none cursor-pointer touch-none"
        role="slider"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={pos !== null ? pos + 1 : undefined}
        aria-label={question.prompt}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={trackRef} className="relative h-2">
          <div aria-hidden className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--color-ink)]/15" />
          <div
            aria-hidden
            className={
              'absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--color-accent)] ' +
              (isDragging ? '' : 'transition-all duration-200 ease-out')
            }
            style={{ width: pos !== null ? `${lastPct}%` : '0%' }}
          />
          <div aria-hidden className="absolute inset-0 flex justify-between items-center pointer-events-none">
            {LIKERT_POSITIONS.map((_, i) => (
              <span
                key={i}
                className={
                  'block h-2 w-px ' +
                  (pos !== null && i <= pos ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-ink)]/25')
                }
              />
            ))}
          </div>
          <div
            aria-hidden
            className={
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[var(--color-accent)] shadow-lg ring-4 ring-[var(--color-accent)]/20 pointer-events-none ' +
              (pos === null
                ? 'opacity-0 scale-75'
                : isDragging
                  ? 'opacity-100 scale-110'
                  : 'opacity-100 scale-100 transition-all duration-200 ease-out')
            }
            style={{ left: pos !== null ? `${lastPct}%` : '50%' }}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-sm text-[var(--color-muted)] px-2 sm:px-4">
        <span className="max-w-[42%]">{question.lowLabel}</span>
        <span className="max-w-[42%] text-right">{question.highLabel}</span>
      </div>

      {question.lowImage && question.highImage && (
        <div className="mt-4 flex gap-2 sm:gap-4 px-2 sm:px-4">
          <div className="flex-1 flex flex-col gap-1">
            <div
              className="relative w-full aspect-[16/9] overflow-hidden rounded-sm bg-[var(--color-line)] transition-opacity duration-200"
              style={{ opacity: poleOpacity(pos, 'low') }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.lowImage.src}
                alt={question.lowImage.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-[var(--color-muted)] italic">{question.lowImage.caption}</p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div
              className="relative w-full aspect-[16/9] overflow-hidden rounded-sm bg-[var(--color-line)] transition-opacity duration-200"
              style={{ opacity: poleOpacity(pos, 'high') }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.highImage.src}
                alt={question.highImage.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-[var(--color-muted)] italic text-right">{question.highImage.caption}</p>
          </div>
        </div>
      )}

      {question.helperText && (
        <p className="mt-4 text-xs text-[var(--color-muted)] leading-relaxed px-2 sm:px-4">
          {question.helperText}
        </p>
      )}

      <p className="mt-8 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        {pos === null
          ? 'Drag or click anywhere on the track'
          : (question.impacts
              ? spectrumLabels(question.lowLabel, question.highLabel)[pos]
              : AGREE_DISAGREE_LABELS[pos])}
      </p>

      {!grouped && (
        <button
          type="button"
          disabled={pos === null}
          onClick={() => pos !== null && onAnswer({ kind: 'slider', value: LIKERT_POSITIONS[pos] })}
          className="mt-6 inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      )}
    </div>
  );
}

function MultiSelect({
  question,
  currentAnswer,
  onAnswer,
  grouped,
}: {
  question: Extract<Question, { kind: 'multi_select' }>;
  currentAnswer?: Extract<Answer, { kind: 'multi_select' }>;
  onAnswer: (a: Answer) => void;
  grouped: boolean;
}) {
  // The parent uses `key={question.id}` so this component remounts when the
  // question changes (including via back-nav). useState's initializer reads
  // currentAnswer fresh on each mount, so no effect is needed.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentAnswer?.selectedValues ?? []),
  );

  const max = question.maxSelections;
  const toggle = (val: string) => {
    setSelected((prev) => {
      let next: Set<string>;
      if (prev.has(val)) {
        next = new Set(prev);
        next.delete(val);
      } else if (max !== undefined && prev.size >= max) {
        return prev;
      } else {
        next = new Set(prev);
        next.add(val);
      }
      // In grouped mode, propagate every change upward immediately so the
      // wrapper buffer stays current and Continue can act on real state.
      if (grouped) {
        onAnswer({ kind: 'multi_select', selectedValues: Array.from(next) });
      }
      return next;
    });
  };
  const atMax = max !== undefined && selected.size >= max;

  // Show editorial conflict warnings only on the must-haves question. Users
  // can ignore them and proceed; the goal is to inform, not block.
  const isMustHaves = question.purpose === 'must_haves';
  const activeConflicts = isMustHaves
    ? findActiveConflicts(Array.from(selected))
    : [];

  return (
    <div className={grouped ? 'mt-6' : 'mt-10'}>
      {question.helperText && (
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">{question.helperText}</p>
      )}
      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {question.options.map((opt) => {
          const isSelected = selected.has(opt.value);
          const disabled = !isSelected && atMax;
          return (
            <li key={opt.value}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                aria-disabled={disabled || undefined}
                onClick={() => toggle(opt.value)}
                disabled={disabled}
                className={
                  'w-full text-left rounded-xl border px-4 py-3 text-sm leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ' +
                  (isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                    : disabled
                    ? 'border-[var(--color-line)] opacity-40 cursor-not-allowed'
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
      {activeConflicts.length > 0 && (
        <div className="mt-6 space-y-3" role="status" aria-live="polite">
          {activeConflicts.map((c, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-[var(--color-muted)] border-l-2 border-[var(--color-accent)] pl-4 py-1"
            >
              {c.message}
            </p>
          ))}
        </div>
      )}
      {!grouped && (
        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onAnswer({ kind: 'multi_select', selectedValues: Array.from(selected) })}
            className="inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-8 py-3 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          >
            {selected.size === 0 ? 'Skip' : `Continue with ${selected.size} selected`}
          </button>
        </div>
      )}
    </div>
  );
}
