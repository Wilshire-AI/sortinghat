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
} from '@/components/quiz/useQuizState';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { ProgressBar } from '@/components/quiz/ProgressBar';
import { encodeFingerprint } from '@/lib/engine/vector';

export default function QuizPage() {
  const router = useRouter();
  const { answers, hydrated, setAnswer } = useQuizState(dimensions, questions);
  const [idx, setIdx] = useState(0);
  const inFlightRef = useRef(false);
  const initializedRef = useRef(false);

  // After hydration, jump to the first unanswered question so a returning
  // user picks up where they left off.
  useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;
    let firstUnanswered = 0;
    for (let i = 0; i < questions.length; i++) {
      if (!answers[questions[i].id]) break;
      firstUnanswered = i + 1;
    }
    setIdx(Math.min(firstUnanswered, questions.length - 1));
  }, [hydrated, answers]);

  const current = questions[idx];

  const handleAnswer = (a: Answer) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Build the next-answers map synchronously so we can compute the final
    // state without waiting for setState to flush.
    const nextAnswers = { ...answers, [current.id]: a };
    setAnswer(current.id, a);

    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
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
      });
      router.push(`/nyc/results?f=${encoded}`);
    }
  };

  const handleBack = () => {
    if (idx > 0) setIdx(idx - 1);
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
      />
    </main>
  );
}
