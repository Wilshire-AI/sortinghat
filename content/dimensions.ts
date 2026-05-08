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
    kind: 'symmetric',
    description:
      'How much neighborhood prestige and aspirational identity matter to you. Both poles are real preferences. Picking "the place over the name" or "value over stretch" is an active preference for non-prestigious neighborhoods, not neutrality. In real estate, prestige correlates with cost, so value-seekers genuinely prefer the lower-prestige side.',
    poles: { low: 'Practicality, value, and space first.', high: 'Prestige and aspirational identity first.' },
  },
  {
    id: 'space-sensitivity',
    name: 'Space Sensitivity',
    kind: 'symmetric',
    description:
      'How much physical space at home affects your wellbeing. Both poles are real lived preferences. Picking "I can be happy in a small space" is also picking against neighborhoods of huge apartments far from the action — a real tradeoff, not just non-preference.',
    poles: { low: 'Tolerates small spaces gracefully.', high: 'Needs spaciousness to feel at home.' },
  },
  {
    id: 'family-trajectory',
    name: 'Future Family Orientation',
    kind: 'asymmetric_need',
    description:
      'Whether kids are part of your household or near-term plan. People high on this dimension want family-life infrastructure (schools, playgrounds, kid-friendly streets, other families). People low on it just don\'t need that — it does not mean they actively dislike family-coded neighborhoods. The penalty applies only when you want family infrastructure and the neighborhood lacks it.',
    poles: { low: 'Not a factor in this window.', high: 'Plans for or has kids in the household.' },
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
    name: 'Creative Scene Density',
    kind: 'symmetric',
    description:
      'How much active art, indie music, and maker culture lives in the neighborhood — galleries, music venues, studios spilling onto sidewalks, the kind of culture you stumble into walking around. Both poles are real lived preferences. Some people genuinely want this density at home. Others want calm distance from it.',
    poles: { low: 'Prefers calm distance from the creative scene.', high: 'Wants the creative scene at the doorstep.' },
  },
  {
    id: 'friction-sensitivity',
    name: 'Daily Friction Sensitivity',
    kind: 'symmetric',
    description:
      'Both poles are real lived preferences. Some people are energized by noise, density, and friction. Others are drained by it. Mismatching either way is a real friction. (Neighborhoods are scored such that high values mean low friction — calm, orderly.)',
    poles: { low: 'High tolerance for daily chaos.', high: 'Drained by noise, disorder, friction.' },
  },
  {
    id: 'safety-need',
    name: 'Perceived Safety Need',
    kind: 'asymmetric_need',
    description:
      'How much you want to feel safe walking home alone, late at night, or with kids. This is a perception measure, not a crime-statistics measure. Most NYC neighborhoods are statistically safe by national standards, but perception varies. Higher need = stronger filter against neighborhoods with rougher reputations. The dimension is asymmetric: low need doesn\'t mean disliking safe places, just not weighting it heavily.',
    poles: { low: 'Not a strong factor for me.', high: 'I need to feel safe at all hours.' },
  },
  {
    id: 'school-quality',
    name: 'Zoned School Quality',
    kind: 'asymmetric_need',
    description:
      'How much zoned public school quality matters to you. Most relevant to people with kids or planning to have them, but also affects long-term resale and neighborhood stability for everyone. Asymmetric: not caring about schools doesn\'t mean disliking neighborhoods that happen to have good ones.',
    poles: { low: 'Not a factor for me.', high: 'Top-rated schools required.' },
  },
  {
    id: 'social-register',
    name: 'Social Register',
    kind: 'symmetric',
    description:
      'Captures temperament and social code, independent of prestige tier. Establishment-coded neighborhoods feel polished, traditional, doorman-fluent, status-through-restraint. Bohemian-progressive neighborhoods feel unbuttoned, intellectual, values-signaling, status-through-ideology. Both poles are real lived preferences. The axis that pulls UES apart from UWS, Brooklyn Heights from Park Slope, Tribeca from West Village.',
    poles: {
      low: 'Bohemian, progressive, intellectual, neighborly-informal.',
      high: 'Polished, establishment, traditional, status-fluent.',
    },
  },
  {
    id: 'visitor-facing-energy',
    name: 'Visitor-Facing Energy',
    kind: 'symmetric',
    description:
      'Whether the public realm is for residents or for visitors and destination-seekers. Resident-rooted streets are routine-driven, with locals walking dogs and ground-floor retail serving residents. Destination-facing streets are stages: brand retail, weekend crowds, recognizable spots people travel cross-town to reach. Some users want iconic visitor energy; others actively dislike living inside someone else\'s itinerary.',
    poles: {
      low: 'Resident-rooted, routine-driven, locals only.',
      high: 'Destination-facing, iconic, visitor-heavy.',
    },
  },
  {
    id: 'built-form-register',
    name: 'Built-Form Register',
    kind: 'symmetric',
    description:
      'Dominant built-environment register: prewar/brownstone/loft character vs modern/amenity-tower. Captures everyday habitat texture: irregular rooms and original moldings vs doorman lobbies and floor-to-ceiling glass. Some users genuinely refuse prewar (no elevator, old systems). Others refuse glass towers (no character, no neighborhood texture). Both are durable preferences.',
    poles: {
      low: 'Prewar, brownstone, loft, low-rise. Character-and-quirks.',
      high: 'New-build, amenity-rich, doorman, predictable systems.',
    },
  },
  {
    id: 'rootedness-vs-access',
    name: 'Rootedness vs Access',
    kind: 'symmetric',
    description:
      'Whether the neighborhood rewards being rooted in a local community (knowing your coffee shop owner, your block, neighbors who recognize you) or rewards having access to everything (walking distance to world-class restaurants, citywide cultural density, late-night anything). The closest psychographic proxy for borough identity: rootedness-leaning self-selects into Brooklyn brownstone belt, Queens enclaves, and suburbs; access-leaning self-selects into downtown Manhattan, Midtown, and UWS/UES corridors. Both poles real lived preferences.',
    poles: {
      low: 'Rooted. Local community, neighborhood character, knowing the regulars.',
      high: 'Access. Everything-at-your-fingertips density, world-class options walking-distance.',
    },
  },
  {
    id: 'daily-life-walkability',
    name: 'Daily-Life Walkability',
    kind: 'asymmetric_need',
    description:
      'How easily a resident can walk to daily-life infrastructure: groceries, gyms and fitness studios, pharmacies, dry cleaners, cafés. Distinct from rootedness-vs-access (which is about destination/cultural density) — this is about whether daily errands and routine wellness happen on foot. Critical for suburb discrimination (Larchmont walkable downtown vs Cresskill car-only), and surfaces a real gap in some NYC core neighborhoods (Hudson Yards has limited groceries despite density). Asymmetric: not needing walkable amenities doesn\'t mean disliking neighborhoods that have them.',
    poles: {
      low: 'Not a daily concern. I\'ll drive or travel for these.',
      high: 'Essential. I want groceries, gyms, errands within easy walking distance.',
    },
  },
] as const;
