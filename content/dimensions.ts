import type { Dimension } from './types';

export const dimensions: readonly Dimension[] = [
  {
    id: 'urban-intensity-tolerance',
    name: 'Urban Intensity Tolerance',
    description:
      'How well you thrive in dense, stimulating, high-energy environments. People high on this dimension feel energized by crowds, noise, nightlife, and unpredictability. People low on it need calmer streets and quieter blocks to function.',
    poles: { low: 'Drained by intensity. Needs calm.', high: 'Energized by density and stimulation.' },
  },
  {
    id: 'transit-psychology',
    name: 'Transit Psychology',
    description:
      'How much you value transit redundancy, optionality, and friction reduction in your daily movement. Goes beyond raw commute time. Captures whether single-line dependence feels constraining and whether ease of moving across the city is a daily mood input.',
    poles: { low: 'Tolerant of single-line dependence.', high: 'Needs transit optionality and redundancy.' },
  },
  {
    id: 'prestige-orientation',
    name: 'Prestige vs Practicality Orientation',
    description:
      'How much you weight neighborhood prestige and aspirational identity versus space, value, and future flexibility. People high on this dimension treat the neighborhood name as part of their identity. People low on it would rather have more apartment for less rent in a less-known area.',
    poles: { low: 'Practicality, value, and space first.', high: 'Prestige and aspirational identity first.' },
  },
  {
    id: 'space-sensitivity',
    name: 'Space Sensitivity',
    description:
      'How much physical space at home affects your wellbeing. High-sensitivity users feel cramped quickly and need square footage to feel at ease. Low-sensitivity users prioritize location over size. Neighborhoods are scored on the typical apartment stock available there.',
    poles: { low: 'Tolerates small spaces gracefully.', high: 'Needs spaciousness to feel at home.' },
  },
  {
    id: 'family-trajectory',
    name: 'Future Family Orientation',
    description:
      'How much you optimize for a future family scenario. Schools, stroller-friendliness, park access, emotional sustainability over time. High-trajectory users weigh decisions in 3 to 5 year horizons. Low-trajectory users optimize for the life they have today.',
    poles: { low: 'Optimizes for current life, not future.', high: 'Plans for future family.' },
  },
  {
    id: 'cultural-ecosystem',
    name: 'Cultural Ecosystem Alignment',
    description:
      'How important culturally familiar food, immigrant communities, language access, and cultural rhythm are to your daily life. The difference between neighborhoods that read as "neutral" and those that feel like home because of cultural texture.',
    poles: { low: 'Neutral on cultural ecosystem.', high: 'Needs cultural familiarity in daily life.' },
  },
  {
    id: 'environmental-openness',
    name: 'Environmental Openness',
    description:
      'How much access to parks, waterfronts, visual openness, and walking paths affects your emotional baseline. High-openness users wilt without green space. Low-openness users are content in fully built environments.',
    poles: { low: 'Content in fully built environments.', high: 'Needs nature, parks, or open vistas.' },
  },
  {
    id: 'creative-energy',
    name: 'Creative Energy Preference',
    description:
      'How much you want to live immersed in ambitious, creative, or startup-intensity surroundings versus having access to that energy without being engulfed by it. The difference between "near the action" and "in the action."',
    poles: { low: 'Prefers calm distance from creative scenes.', high: 'Wants to live immersed in ambition.' },
  },
  {
    id: 'friction-sensitivity',
    name: 'Daily Friction Sensitivity',
    description:
      'How sensitive you are to noise, grime, disorder, crowding, and difficult errands as a daily mood input. High-sensitivity users find chaotic environments draining over weeks and months. Low-sensitivity users tune it out. Neighborhoods are scored such that high values mean lower friction (calm, orderly).',
    poles: { low: 'High tolerance for daily chaos.', high: 'Drained by noise, disorder, friction.' },
  },
] as const;
