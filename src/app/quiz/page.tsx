'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { CONTENT_VERSION } from '@content/types';
import { useQuizState, finalizeVector, applyAnswer, type Answer } from '@/components/quiz/useQuizState';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { ProgressBar } from '@/components/quiz/ProgressBar';
import { encodeFingerprint } from '@/lib/engine/vector';

export default function QuizPage() {
  const router = useRouter();
  const { state, answer } = useQuizState(dimensions);
  const [idx, setIdx] = useState(0);
  const inFlightRef = useRef(false);

  const current = questions[idx];

  const handleAnswer = (a: Answer) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (idx + 1 < questions.length) {
      answer(current, a);
      setIdx(idx + 1);
      setTimeout(() => { inFlightRef.current = false; }, 200);
    } else {
      // Last question. Compute final state locally to avoid setState async issues.
      const finalState = applyAnswer(state, current, a);
      const finalVec = finalizeVector(finalState);
      const encoded = encodeFingerprint(
        finalVec,
        CONTENT_VERSION,
        finalState.selectedTags,
        finalState.mustHaves,
      );
      router.push(`/results?f=${encoded}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <ProgressBar current={idx + 1} total={questions.length} />
      <QuestionCard
        key={current.id}
        question={current}
        questionNumber={idx + 1}
        totalQuestions={questions.length}
        onAnswer={handleAnswer}
      />
    </main>
  );
}
