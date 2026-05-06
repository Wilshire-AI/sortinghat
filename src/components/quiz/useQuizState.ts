'use client';

import { useReducer } from 'react';
import type { Dimension, Question, UserVector } from '@content/types';
import { clampVector, zeroVector } from '@/lib/engine/vector';

export type Answer =
  | { kind: 'forced_choice'; choiceIndex: number }
  | { kind: 'slider'; value: number };

export type QuizState = {
  vector: UserVector;
  answers: Record<string, Answer>;
};

export function initialState(dimensions: readonly Dimension[]): QuizState {
  return { vector: zeroVector(dimensions), answers: {} };
}

export function applyAnswer(state: QuizState, question: Question, answer: Answer): QuizState {
  const newVector = { ...state.vector };
  if (question.kind === 'forced_choice' && answer.kind === 'forced_choice') {
    const choice = question.choices[answer.choiceIndex];
    for (const [dim, impact] of Object.entries(choice.impacts)) {
      newVector[dim] = (newVector[dim] ?? 0) + (impact as number);
    }
  } else if (question.kind === 'slider' && answer.kind === 'slider') {
    newVector[question.dimensionId] = answer.value;
  }
  return {
    vector: newVector,
    answers: { ...state.answers, [question.id]: answer },
  };
}

export function finalizeVector(state: QuizState): UserVector {
  return clampVector(state.vector);
}

type Action =
  | { type: 'answer'; question: Question; answer: Answer }
  | { type: 'reset'; dimensions: readonly Dimension[] };

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'answer':
      return applyAnswer(state, action.question, action.answer);
    case 'reset':
      return initialState(action.dimensions);
  }
}

export function useQuizState(dimensions: readonly Dimension[]) {
  const [state, dispatch] = useReducer(reducer, dimensions, initialState);
  return {
    state,
    answer: (question: Question, answer: Answer) =>
      dispatch({ type: 'answer', question, answer }),
    reset: () => dispatch({ type: 'reset', dimensions }),
  };
}
