import type { Dimension } from './types';

// `kind` reflects whether mismatch hurts in both directions (symmetric) or
// only when the neighborhood under-delivers what the user actively wants
// (asymmetric_need). See content/types.ts for the full rationale.

export const dimensions: readonly Dimension[] = [
  {
    id: 'urban-intensity-tolerance',
    name: 'Urban Intensity Tolerance',
    kind: 'symmetric',
    description:
      'How well you thrive in dense, stimulating, high-energy environments. People high on this dimension feel energized by crowds, noise, nightlife, and unpredictability. People low on it need calmer streets and quieter blocks to function. Both poles are real preferences.',
    poles: { low: 'Drained by intensity. Needs calm.', high: 'Energized by density and stimulation.' },
  },
  {
    id: 'transit-psychology',
    name: 'Transit Psychology',
    kind: 'asymmetric_need',
    description:
      'How much you value transit redundancy and optionality. People high on this dimension feel constrained by single-line dependence. People low on it are fine with one good line. Not needing redundancy doesn\'t mean you\'d dislike a transit-rich neighborhood. The penalty applies only when you want optionality and the neighborhood lacks it.',
    poles: { low: 'Tolerant of single-line dependence.', high: 'Needs transit optionality and redundancy.' },
  },
  {
    id: 'prestige-orientation',
    name: 'Prestige vs Practicality Orientation',
    kind: 'asymmetric_need',
    description:
      'How much neighborhood prestige and aspirational identity matter to you. Not caring about prestige doesn\'t mean you\'d actively dislike a prestigious neighborhood. The penalty applies only when you want a prestigious address and the neighborhood lacks one.',
    poles: { low: 'Practicality, value, and space first.', high: 'Prestige and aspirational identity first.' },
  },
  {
    id: 'space-sensitivity',
    name: 'Space Sensitivity',
    kind: 'asymmetric_need',
    description:
      'How much physical space at home affects your wellbeing. High-sensitivity users feel cramped quickly and need square footage to feel at ease. Low-sensitivity users tolerate small spaces gracefully. Tolerating small spaces doesn\'t mean you\'d hate a big one. Penalty applies only when you need space and don\'t get it.',
    poles: { low: 'Tolerates small spaces gracefully.', high: 'Needs spaciousness to feel at home.' },
  },
  {
    id: 'family-trajectory',
    name: 'Future Family Orientation',
    kind: 'asymmetric_need',
    description:
      'How much you optimize for a future family scenario: schools, stroller-friendliness, park access, emotional sustainability over time. Not optimizing for family doesn\'t mean you\'d hate a family-friendly neighborhood. Penalty applies only when you want this and the neighborhood doesn\'t deliver.',
    poles: { low: 'Optimizes for current life, not future.', high: 'Plans for future family.' },
  },
  {
    id: 'cultural-ecosystem',
    name: 'Cultural Ecosystem Alignment',
    kind: 'asymmetric_need',
    description:
      'How important culturally familiar food, immigrant communities, language access, and cultural rhythm are to your daily life. Not needing cultural anchor doesn\'t mean you\'d dislike a culturally rich neighborhood. Penalty applies only when you want this and the neighborhood is culturally neutral.',
    poles: { low: 'Neutral on cultural ecosystem.', high: 'Needs cultural familiarity in daily life.' },
  },
  {
    id: 'environmental-openness',
    name: 'Environmental Openness',
    kind: 'asymmetric_need',
    description:
      'How much access to parks, waterfronts, visual openness, and walking paths matters to your emotional baseline. Not needing nature doesn\'t mean you\'d dislike a green neighborhood. Penalty applies only when you need open space and the neighborhood lacks it.',
    poles: { low: 'Content in fully built environments.', high: 'Needs nature, parks, or open vistas.' },
  },
  {
    id: 'creative-energy',
    name: 'Creative Energy Preference',
    kind: 'symmetric',
    description:
      'Both poles are real lived preferences. Some people genuinely want calm distance from creative scenes. Others want immersion. Mismatching either way is a real friction.',
    poles: { low: 'Prefers calm distance from creative scenes.', high: 'Wants to live immersed in ambition.' },
  },
  {
    id: 'friction-sensitivity',
    name: 'Daily Friction Sensitivity',
    kind: 'symmetric',
    description:
      'Both poles are real lived preferences. Some people are energized by noise, density, and friction. Others are drained by it. Mismatching either way is a real friction. (Neighborhoods are scored such that high values mean low friction — calm, orderly.)',
    poles: { low: 'High tolerance for daily chaos.', high: 'Drained by noise, disorder, friction.' },
  },
] as const;
