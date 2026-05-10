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
    name: 'Resident Wealth / Market Tier',
    kind: 'symmetric',
    description:
      'How much you weight neighborhood resident-wealth tier and aspirational market positioning. Both poles are real preferences. The high pole is established-wealth, high-market-tier, status-address territory (UES, Greenwich, Tribeca). The low pole is working/middle-income, value-coded territory (Bushwick, Sunset Park, Inwood). Picking value-over-stretch is an active preference, not neutrality. Distinct from social-register (polish/aesthetic) and amenity-function (real-quality substance). A neighborhood can be wealth-tier-high but amenity-function-mid (UWS), or wealth-tier-low but amenity-function-high (Flushing).',
    poles: { low: 'Working/middle-income, value-coded.', high: 'Established wealth, high market tier.' },
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
  {
    id: 'community-fabric',
    name: 'Community Fabric',
    kind: 'symmetric',
    description:
      'Whether community life is organized around public village overlap or private estate seclusion. Civic-village neighborhoods stitch families together through public schools as the social hub, town events, libraries, walkable downtowns, and broad civic engagement, so residents keep bumping into each other. Estate-and-club neighborhoods stitch life together through country clubs, private schools, larger lots, and curated by-invitation circles, with less daily mixing on shared public ground. Both are durable lived preferences. The axis that splits Maplewood and Larchmont from Scarsdale and Greenwich, even when prestige tier and school quality match.',
    poles: {
      low: 'Estate, club, private-school, by-invitation social circles.',
      high: 'Public-civic, walkable downtown, public-school as community hub.',
    },
  },
  {
    id: 'streetscape-quality',
    name: 'Streetscape Quality',
    kind: 'asymmetric_need',
    description:
      'Block-to-block walking pleasure — tree-lined sidewalks, prewar facades, stoops and storefronts, the visual-and-pedestrian texture of the neighborhood itself. Distinct from daily-life-walkability (errand reach), environmental-openness (parks/waterfront/visual openness), and rootedness-vs-access (cultural density). This dim is *only* about whether the streets themselves are pleasant to walk on. Low means absence of preference, not active dislike.',
    poles: {
      low: 'Functional streets are enough.',
      high: 'Wants streets that are pleasant to walk for their own sake.',
    },
  },
  {
    id: 'amenity-function',
    name: 'Amenity Function',
    kind: 'asymmetric_need',
    description:
      'Real walkable-distance access to substance-over-presentation amenities: food, groceries, cafes, retail that genuinely deliver real quality and value. Distinct from streetscape-quality (the look of streets), social-register (polish/aesthetic), and prestige-orientation (resident wealth tier). High score means real quality regardless of polish. Flushing-tier real-deal grocery counts; Hudson Yards mall does not. Asymmetric: not needing high-function amenity doesn\'t mean disliking neighborhoods that have it. Penalty applies only when user wants substance and neighborhood is thin.',
    poles: {
      low: 'Basic amenities are enough.',
      high: 'Needs food, groceries, cafes, retail that genuinely deliver real quality and value.',
    },
  },
] as const;
