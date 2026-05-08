'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { CONTENT_VERSION } from '@content/types';
import {
  useQuizState,
  deriveState,
  finalizeVector,
  type Answer,
  type Answers,
} from '@/components/quiz/useQuizState';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { ProgressBar } from '@/components/quiz/ProgressBar';
import { LiveRanking } from '@/components/quiz/LiveRanking';
import { encodeFingerprint } from '@/lib/engine/vector';

// Conditional skips: when prior answers make a question meaningless, skip it.
// `commute-tolerance` is meaningless when the user has no real commute target
// (only "remote" / "other" selected on `commute-target`).
function shouldSkip(questionId: string, answers: Answers): boolean {
  if (questionId === 'commute-tolerance') {
    const a = answers['commute-target'];
    if (!a || a.kind !== 'multi_select') return false;
    const real = a.selectedValues.filter((v) => v !== 'remote' && v !== 'other');
    return real.length === 0;
  }
  return false;
}

function nextVisibleIdx(from: number, answers: Answers): number {
  let i = from;
  while (i < questions.length && shouldSkip(questions[i].id, answers)) i++;
  return i;
}

function prevVisibleIdx(from: number, answers: Answers): number {
  let i = from;
  while (i >= 0 && shouldSkip(questions[i].id, answers)) i--;
  return i;
}

export default function QuizPage() {
  const router = useRouter();
  const { answers, hydrated, setAnswer, reset } = useQuizState(dimensions, questions);
  const [idx, setIdx] = useState(0);
  const inFlightRef = useRef(false);
  const initializedRef = useRef(false);

  // After hydration, jump to the first unanswered (and visible) question so a
  // returning user picks up where they left off. If every visible question is
  // already answered (user completed the quiz before and is back at /nyc/quiz),
  // treat it as a fresh start — clear stored answers and begin at Q1.
  useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;
    let firstUnanswered = -1;
    for (let i = 0; i < questions.length; i++) {
      if (shouldSkip(questions[i].id, answers)) continue;
      if (!answers[questions[i].id]) {
        firstUnanswered = i;
        break;
      }
    }
    if (firstUnanswered < 0) {
      reset();
      setIdx(0);
      return;
    }
    setIdx(firstUnanswered);
  }, [hydrated, answers, reset]);

  const current = questions[idx];

  const handleAnswer = (a: Answer) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Build the next-answers map synchronously so we can compute the final
    // state without waiting for setState to flush.
    const nextAnswers = { ...answers, [current.id]: a };
    setAnswer(current.id, a);

    const next = nextVisibleIdx(idx + 1, nextAnswers);
    if (next < questions.length) {
      setIdx(next);
      setTimeout(() => { inFlightRef.current = false; }, 200);
    } else {
      const finalDerived = deriveState(dimensions, questions, nextAnswers);
      const finalVec = finalizeVector(finalDerived);
      const encoded = encodeFingerprint({
        vector: finalVec,
        contentVersion: CONTENT_VERSION,
        selectedTags: finalDerived.selectedTags,
        mustHaves: finalDerived.mustHaves,
        commuteTargets: finalDerived.commuteTargets,
        commuteToleranceMinutes: finalDerived.commuteToleranceMinutes,
        softPrefs: finalDerived.softPrefs,
      });
      router.push(`/nyc/results?f=${encoded}`);
    }
  };

  const handleBack = () => {
    if (idx <= 0) return;
    const prev = prevVisibleIdx(idx - 1, answers);
    if (prev >= 0) setIdx(prev);
  };

  const handleStartOver = () => {
    reset();
    setIdx(0);
  };

  // Avoid flashing Q1 before localStorage hydration potentially jumps us forward.
  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <ProgressBar current={idx + 1} total={questions.length} />
      <QuestionCard
        key={current.id}
        question={current}
        questionNumber={idx + 1}
        totalQuestions={questions.length}
        currentAnswer={answers[current.id]}
        onAnswer={handleAnswer}
        onBack={idx > 0 ? handleBack : undefined}
        onStartOver={idx > 0 || Object.keys(answers).length > 0 ? handleStartOver : undefined}
      />
      <LiveRanking answers={answers} />
    </main>
  );
}
