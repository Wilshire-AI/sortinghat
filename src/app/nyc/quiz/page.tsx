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
import { GroupedQuestionsScreen } from '@/components/quiz/GroupedQuestionsScreen';
import { ProgressBar } from '@/components/quiz/ProgressBar';
import { LiveRanking } from '@/components/quiz/LiveRanking';
import { encodeFingerprint } from '@/lib/engine/vector';
import { shouldSkip, progressFor } from '@/lib/engine/skip-rules';

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

// If the question at `idx` declares groupNext AND the immediately-next
// question (idx+1) is currently visible, return idx+1 as the grouped partner.
// If the partner has been skipped by a conditional rule, the primary
// becomes a standalone screen (return null).
function groupedPartnerIdx(idx: number, answers: Answers): number | null {
  const q = questions[idx];
  if (!q || !q.groupNext) return null;
  const partnerIdx = idx + 1;
  if (partnerIdx >= questions.length) return null;
  if (shouldSkip(questions[partnerIdx].id, answers)) return null;
  return partnerIdx;
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
    // If the first-unanswered question is the *partner* of a grouped pair,
    // back up to the primary so the user sees both halves of the screen.
    if (firstUnanswered > 0 && questions[firstUnanswered - 1]?.groupNext) {
      setIdx(firstUnanswered - 1);
      return;
    }
    setIdx(firstUnanswered);
  }, [hydrated, answers, reset]);

  const current = questions[idx];
  const partnerIdx = groupedPartnerIdx(idx, answers);
  const partner = partnerIdx !== null ? questions[partnerIdx] : null;

  const advanceFrom = (fromIdx: number, nextAnswers: Answers) => {
    const next = nextVisibleIdx(fromIdx + 1, nextAnswers);
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
        housingAcceptance: finalDerived.housingAcceptance,
      });
      router.push(`/nyc/results?f=${encoded}`);
    }
  };

  const handleAnswer = (a: Answer) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // setAnswer returns the pruned next-answers map so we can compute the
    // final state synchronously without waiting for setState to flush, and
    // any newly-skipped questions' stale answers are already dropped.
    const nextAnswers = setAnswer(current.id, a);
    advanceFrom(idx, nextAnswers);
  };

  // For grouped screens: each card update flows here and is stored without
  // navigating. The wrapper's Continue button is what advances.
  const handleGroupedPrimaryChange = (a: Answer) => {
    setAnswer(current.id, a);
  };
  const handleGroupedSecondaryChange = (a: Answer) => {
    if (partner) setAnswer(partner.id, a);
  };
  const handleGroupedContinue = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    // Re-derive: the partner may have become skipped if the primary was
    // edited away from a real commute-target. Skip past whichever index is
    // the last actually-visible one in this group.
    const refreshedPartnerIdx = groupedPartnerIdx(idx, answers);
    const fromIdx = refreshedPartnerIdx ?? idx;
    advanceFrom(fromIdx, answers);
  };

  const handleBack = () => {
    if (idx <= 0) return;
    const prev = prevVisibleIdx(idx - 1, answers);
    if (prev < 0) return;
    // If landing on a grouped partner (i.e., previous question is a group's
    // primary), back up one more so the screen shows the primary's header.
    if (prev > 0 && questions[prev - 1]?.groupNext) {
      setIdx(prev - 1);
    } else {
      setIdx(prev);
    }
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

  const { current: progressCurrent, total: progressTotal } = progressFor(idx, questions, answers);

  return (
    <main className="min-h-screen flex flex-col">
      <ProgressBar current={progressCurrent} total={progressTotal} />
      {partner ? (
        <GroupedQuestionsScreen
          key={current.id}
          primary={current}
          secondary={partner}
          questionNumber={progressCurrent}
          totalQuestions={progressTotal}
          primaryAnswer={answers[current.id]}
          secondaryAnswer={answers[partner.id]}
          onPrimaryChange={handleGroupedPrimaryChange}
          onSecondaryChange={handleGroupedSecondaryChange}
          onContinue={handleGroupedContinue}
          onBack={idx > 0 ? handleBack : undefined}
          onStartOver={idx > 0 || Object.keys(answers).length > 0 ? handleStartOver : undefined}
        />
      ) : (
        <QuestionCard
          key={current.id}
          question={current}
          questionNumber={progressCurrent}
          totalQuestions={progressTotal}
          currentAnswer={answers[current.id]}
          onAnswer={handleAnswer}
          onBack={idx > 0 ? handleBack : undefined}
          onStartOver={idx > 0 || Object.keys(answers).length > 0 ? handleStartOver : undefined}
        />
      )}
      <LiveRanking answers={answers} />
    </main>
  );
}
