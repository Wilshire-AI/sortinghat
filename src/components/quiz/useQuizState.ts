'use client';

import { useReducer } from 'react';
import type { Dimension, Question, UserVector } from '@content/types';
import { clampVector, zeroVector } from '@/lib/engine/vector';

export type Answer =
  | { kind: 'forced_choice'; choiceIndex: number }
  | { kind: 'slider'; value: number }
  | { kind: 'multi_select'; selectedValues: string[] };

export type QuizState = {
  vector: UserVector;
  selectedTags: string[];
  mustHaves: string[];
  answers: Record<string, Answer>;
};

export function initialState(dimensions: readonly Dimension[]): QuizState {
  return { vector: zeroVector(dimensions), selectedTags: [], mustHaves: [], answers: {} };
}

export function applyAnswer(state: QuizState, question: Question, answer: Answer): QuizState {
  const newVector = { ...state.vector };
  let newTags = state.selectedTags;
  let newMustHaves = state.mustHaves;

  if (question.kind === 'forced_choice' && answer.kind === 'forced_choice') {
    const choice = question.choices[answer.choiceIndex];
    for (const [dim, impact] of Object.entries(choice.impacts)) {
      newVector[dim] = (newVector[dim] ?? 0) + (impact as number);
    }
  } else if (question.kind === 'slider' && answer.kind === 'slider') {
    newVector[question.dimensionId] = answer.value;
  } else if (question.kind === 'multi_select' && answer.kind === 'multi_select') {
    if (question.purpose === 'must_haves') {
      const merged = new Set([...state.mustHaves, ...answer.selectedValues]);
      newMustHaves = Array.from(merged);
    } else {
      const merged = new Set([...state.selectedTags, ...answer.selectedValues]);
      newTags = Array.from(merged);
    }
    if (question.dimensionImpactPerSelection) {
      for (const [dim, impact] of Object.entries(question.dimensionImpactPerSelection)) {
        newVector[dim] = (newVector[dim] ?? 0) + (impact as number) * answer.selectedValues.length;
      }
    }
  }

  return {
    vector: newVector,
    selectedTags: newTags,
    mustHaves: newMustHaves,
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
