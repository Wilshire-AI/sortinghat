import type { Dimension } from './types';

export const dimensions: readonly Dimension[] = [
  {
    id: 'urban-intensity-tolerance',
    name: 'Urban Intensity Tolerance',
    description:
      'How well the user thrives in dense, stimulating, high-energy environments versus needing decompression. People high on this dimension feel energized by crowds, noise, nightlife, and unpredictability; people low on it need calmer streets and quieter blocks to function.',
    poles: { low: 'Drained by intensity; needs calm', high: 'Energized by density and stimulation' },
  },
  {
    id: 'transit-psychology',
    name: 'Transit Psychology',
    description:
      'How much the user values transit redundancy, optionality, and emotional friction reduction in their daily movement. Goes beyond raw commute time — captures whether single-line dependence feels constraining and whether ease of moving across the city is a daily mood input.',
    poles: { low: 'Tolerant of single-line dependence', high: 'Needs transit optionality and redundancy' },
  },
  {
    id: 'prestige-orientation',
    name: 'Prestige vs Practicality Orientation',
    description:
      'How much the user weights neighborhood prestige and aspirational identity versus space, value, and future flexibility. People high on this dimension treat the neighborhood name as part of their identity; people low on it would rather have more apartment for less rent in a less-known area.',
    poles: { low: 'Practicality, value, and space first', high: 'Prestige and aspirational identity first' },
  },
  {
    id: 'space-sensitivity',
    name: 'Space Sensitivity',
    description:
      'How much physical space at home affects the user\'s wellbeing. High-sensitivity users feel cramped quickly and need square footage to feel at ease; low-sensitivity users prioritize location over size. Neighborhoods scored on the typical apartment stock available there.',
    poles: { low: 'Tolerates small spaces gracefully', high: 'Needs spaciousness to feel at home' },
  },
  {
    id: 'family-trajectory',
    name: 'Future Family Orientation',
    description:
      'How much the user is optimizing for a future family scenario — schools, stroller-friendliness, park access, emotional sustainability over time. High-trajectory users weigh decisions in 3–5 year horizons; low-trajectory users optimize for the life they have today.',
    poles: { low: 'Optimizes for current life, not future', high: 'Plans for future family / long horizon' },
  },
  {
    id: 'cultural-ecosystem',
    name: 'Cultural Ecosystem Alignment',
    description:
      'How important culturally familiar food, immigrant communities, language access, and cultural rhythm are to the user\'s daily life. Captures the difference between neighborhoods that read as "neutral" and those that feel like home because of cultural texture.',
    poles: { low: 'Neutral on cultural ecosystem', high: 'Needs cultural familiarity in daily life' },
  },
  {
    id: 'environmental-openness',
    name: 'Environmental Openness & Nature Sensitivity',
    description:
      'How much access to parks, waterfronts, visual openness, and walking paths affects the user\'s emotional baseline. High-openness users wilt without green space; low-openness users are content in fully built environments.',
    poles: { low: 'Content in fully built environments', high: 'Needs nature, parks, or open vistas' },
  },
  {
    id: 'creative-energy',
    name: 'Startup / Creative Energy Preference',
    description:
      'How much the user wants to live immersed in ambitious, creative, or startup-intensity surroundings versus having access to that energy without being engulfed by it. Captures the difference between "near the action" and "in the action."',
    poles: { low: 'Prefers calm distance from creative scenes', high: 'Wants to live immersed in ambition' },
  },
  {
    id: 'friction-sensitivity',
    name: 'Daily Friction Sensitivity',
    description:
      'How sensitive the user is to noise, grime, disorder, crowding, and difficult errands as a daily mood input. High-sensitivity users find chaotic environments draining over weeks and months; low-sensitivity users tune it out. Neighborhoods scored such that high = lower-friction (calm, orderly).',
    poles: { low: 'High tolerance for daily chaos', high: 'Drained by noise / disorder / friction' },
  },
] as const;
