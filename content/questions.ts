import type { Question } from './types';

// Ordering principle: easy → hard. The user starts with concrete factual
// questions (kids? where do you work? how long can you commute?), moves
// through low-commitment multi-selects, then sliders, then concrete
// tradeoffs, and ends with the heaviest reflection (vibe/identity/place-tier).
// must-haves is the final commitment ritual.
//
// Skip-rule constraints respected:
// - school-need depends on family-horizon → must come after family-horizon
// - commute-tolerance depends on commute-target → must come immediately after
//   (groupNext: true on commute-target keeps them on the same screen)

export const questions: readonly Question[] = [
  // PHASE 1 — PLACE ARCHETYPE (single primary + softer secondary, replacing
  // the old transit-redundancy + access-vs-space + place-tier triple). The
  // 6 archetypes are calibrated to real NYC-metro neighborhood clusters; the
  // primary captures the user's strongest archetype pull, the secondary
  // applies a softer (×0.5) nudge in case they'd also be happy elsewhere.
  // See .polaris/place-archetype-consolidation-2026-05-09.md for the dim
  // mapping derivation + persona-panel validation.
  {
    id: 'place-archetype-primary',
    kind: 'forced_choice',
    prompt: 'Which kind of place feels most like home?',
    choices: [
      {
        label: 'Transit hub. Multi-line transit, dense blocks, walk to almost everything.',
        impacts: {
          'urban-intensity-tolerance': 0.40,
          'transit-psychology': 0.55,
          'daily-life-walkability': 0.45,
          'rootedness-vs-access': 0.30,
          'visitor-facing-energy': 0.20,
          'space-sensitivity': -0.20,
          'streetscape-quality': 0.15,
        },
      },
      {
        label: 'Walkable urban village. Real downtown, lower density, more elbow room.',
        impacts: {
          'urban-intensity-tolerance': -0.10,
          'transit-psychology': 0.30,
          'daily-life-walkability': 0.50,
          'rootedness-vs-access': -0.45,
          'community-fabric': 0.20,
          'streetscape-quality': 0.35,
          'friction-sensitivity': 0.20,
          'visitor-facing-energy': -0.10,
        },
      },
      {
        label: 'Quiet residential city neighborhood. Mostly residential blocks, single-line transit.',
        impacts: {
          'urban-intensity-tolerance': -0.40,
          'transit-psychology': 0.20,
          'daily-life-walkability': 0.30,
          'rootedness-vs-access': -0.50,
          'friction-sensitivity': 0.45,
          'space-sensitivity': 0.30,
          'streetscape-quality': 0.30,
          'visitor-facing-energy': -0.40,
          'environmental-openness': 0.20,
        },
      },
      {
        label: 'Walkable suburb. Main Street, town center, neighbors you see around.',
        impacts: {
          'urban-intensity-tolerance': -0.45,
          'transit-psychology': 0.25,
          'daily-life-walkability': 0.45,
          'rootedness-vs-access': -0.65,
          'space-sensitivity': 0.55,
          'community-fabric': 0.45,
          'friction-sensitivity': 0.55,
          'environmental-openness': 0.45,
          'streetscape-quality': 0.30,
          'family-trajectory': 0.20,
          'visitor-facing-energy': -0.45,
        },
      },
      {
        label: 'Estate suburb. Lawns, larger lots, country club, more privacy.',
        impacts: {
          'urban-intensity-tolerance': -0.55,
          'rootedness-vs-access': -0.65,
          'space-sensitivity': 0.65,
          'community-fabric': -0.40,
          'friction-sensitivity': 0.65,
          'environmental-openness': 0.55,
          'prestige-orientation': 0.25,
          'social-register': 0.25,
          'family-trajectory': 0.20,
          'visitor-facing-energy': -0.50,
        },
      },
      {
        label: 'Exurb or rural. Lots of land, woods or village feel, car for everything.',
        impacts: {
          'urban-intensity-tolerance': -0.65,
          'rootedness-vs-access': -0.55,
          'space-sensitivity': 0.65,
          'friction-sensitivity': 0.60,
          'environmental-openness': 0.55,
          'community-fabric': -0.20,
          'visitor-facing-energy': -0.55,
        },
      },
    ],
  },
  {
    id: 'place-archetype-secondary',
    kind: 'forced_choice',
    prompt: 'Any second choice you would also be happy in?',
    helperText: 'Optional. Adds a softer pull toward this archetype. Pick "no real second choice" if your top pick is the only one that fits.',
    choices: [
      {
        label: 'Transit hub.',
        impacts: {
          'urban-intensity-tolerance': 0.20,
          'transit-psychology': 0.275,
          'daily-life-walkability': 0.225,
          'rootedness-vs-access': 0.15,
          'visitor-facing-energy': 0.10,
          'space-sensitivity': -0.10,
          'streetscape-quality': 0.075,
        },
      },
      {
        label: 'Walkable urban village.',
        impacts: {
          'urban-intensity-tolerance': -0.05,
          'transit-psychology': 0.15,
          'daily-life-walkability': 0.25,
          'rootedness-vs-access': -0.225,
          'community-fabric': 0.10,
          'streetscape-quality': 0.175,
          'friction-sensitivity': 0.10,
          'visitor-facing-energy': -0.05,
        },
      },
      {
        label: 'Quiet residential city neighborhood.',
        impacts: {
          'urban-intensity-tolerance': -0.20,
          'transit-psychology': 0.10,
          'daily-life-walkability': 0.15,
          'rootedness-vs-access': -0.25,
          'friction-sensitivity': 0.225,
          'space-sensitivity': 0.15,
          'streetscape-quality': 0.15,
          'visitor-facing-energy': -0.20,
          'environmental-openness': 0.10,
        },
      },
      {
        label: 'Walkable suburb.',
        impacts: {
          'urban-intensity-tolerance': -0.225,
          'transit-psychology': 0.125,
          'daily-life-walkability': 0.225,
          'rootedness-vs-access': -0.325,
          'space-sensitivity': 0.275,
          'community-fabric': 0.225,
          'friction-sensitivity': 0.275,
          'environmental-openness': 0.225,
          'streetscape-quality': 0.15,
          'family-trajectory': 0.10,
          'visitor-facing-energy': -0.225,
        },
      },
      {
        label: 'Estate suburb.',
        impacts: {
          'urban-intensity-tolerance': -0.275,
          'rootedness-vs-access': -0.325,
          'space-sensitivity': 0.325,
          'community-fabric': -0.20,
          'friction-sensitivity': 0.325,
          'environmental-openness': 0.275,
          'prestige-orientation': 0.125,
          'social-register': 0.125,
          'family-trajectory': 0.10,
          'visitor-facing-energy': -0.25,
        },
      },
      {
        label: 'Exurb or rural.',
        impacts: {
          'urban-intensity-tolerance': -0.325,
          'rootedness-vs-access': -0.275,
          'space-sensitivity': 0.325,
          'friction-sensitivity': 0.30,
          'environmental-openness': 0.275,
          'community-fabric': -0.10,
          'visitor-facing-energy': -0.275,
        },
      },
      { label: 'No real second choice.', impacts: {} },
    ],
  },
  {
    id: 'commute-target',
    kind: 'multi_select',
    purpose: 'commute_targets',
    groupNext: true,
    prompt: 'Where will you actually need to be? Pick all that apply, including a partner\'s office if you\'re a couple.',
    helperText: 'We weight neighborhoods by door-to-door commute. Pick "Mostly remote" if commute isn\'t a constraint.',
    options: [
      { value: 'midtown', label: 'Midtown Manhattan (Grand Central / Penn / Bryant Park)' },
      { value: 'fidi', label: 'Financial District / Lower Manhattan' },
      { value: 'hudson-yards', label: 'Hudson Yards / West Chelsea' },
      { value: 'lic', label: 'Long Island City / Court Square' },
      { value: 'downtown-brooklyn', label: 'Downtown Brooklyn / DUMBO' },
      { value: 'newport-jc', label: 'Jersey City (Newport / Exchange Place)' },
      { value: 'stamford', label: 'Stamford CT' },
      { value: 'greenwich', label: 'Greenwich CT' },
      { value: 'westport', label: 'Westport CT' },
      { value: 'remote', label: 'Mostly remote. Occasional touchdown is fine.' },
      { value: 'other', label: 'Somewhere else (we\'ll skip commute scoring)' },
    ],
  },
  {
    id: 'commute-tolerance',
    kind: 'forced_choice',
    prompt: 'How much door-to-door commute can you live with on a typical day?',
    choices: [
      { label: 'Under 30 min. Anything more drains me.', impacts: {}, commuteToleranceMinutes: 30 },
      { label: '30 to 45 min. Pretty standard NYC commute.', impacts: {}, commuteToleranceMinutes: 45 },
      { label: '45 to 60 min. Fine if the neighborhood is right.', impacts: {}, commuteToleranceMinutes: 60 },
      { label: '60+ min. Willing to trade for what I want.', impacts: {}, commuteToleranceMinutes: 90 },
    ],
  },
  {
    id: 'family-horizon',
    kind: 'forced_choice',
    prompt: 'Are kids in the picture, either already or within a 5-year horizon?',
    choices: [
      { label: 'Yes. Kids are part of the household or plan.', impacts: { 'family-trajectory': 0.8 } },
      { label: 'Maybe. Keeping that option open.', impacts: { 'family-trajectory': 0.2 } },
      { label: 'Probably not, or not in this window.', impacts: { 'family-trajectory': 0 } },
    ],
  },

  // PHASE 2 — BROWSE WITHOUT COMMITTING (multi-selects)
  {
    id: 'housing-acceptance',
    kind: 'multi_select',
    purpose: 'housing_acceptance',
    prompt: 'Which would you happily live in? Pick all that work.',
    helperText: 'Boosts neighborhoods with housing stock you\'d actually take. Skip if no strong opinion.',
    options: [
      {
        value: 'prewar-character',
        label: 'Prewar or brownstone with original character. Walkups, original details, quirks and all.',
      },
      {
        value: 'prewar-renovated',
        label: 'Prewar building, modernized interior. Character outside, updated systems inside.',
      },
      {
        value: 'newer-lowrise',
        label: 'Newer low-rise. Recent construction, smaller buildings, no skyline tower.',
      },
      {
        value: 'luxury-highrise',
        label: 'Highrise with doorman, gym, views, full amenities.',
      },
      {
        value: 'house-townhouse',
        label: 'Townhouse or single-family with your own front door.',
      },
    ],
  },
  {
    id: 'walking-distance-amenities',
    kind: 'multi_select',
    purpose: 'walkable_amenities',
    maxSelections: 3,
    prompt: 'Within walking distance from home, I want:',
    helperText: 'Select up to four. Skip if no strong preferences.',
    options: [
      {
        value: 'errands',
        label: 'Grocery store and pharmacy',
        impacts: { 'daily-life-walkability': 0.5 },
      },
      {
        value: 'gym',
        label: 'Gym or fitness studio',
        impacts: { 'daily-life-walkability': 0.3 },
      },
      {
        value: 'cafes',
        label: 'Cafés',
        impacts: { 'daily-life-walkability': 0.25, 'rootedness-vs-access': -0.2 },
      },
      {
        value: 'world-class-restaurants',
        label: 'World-class restaurants',
        impacts: { 'rootedness-vs-access': 0.4, 'prestige-orientation': 0.2, 'urban-intensity-tolerance': 0.2 },
      },
      {
        value: 'bars-nightlife',
        label: 'Bars and nightlife',
        impacts: { 'urban-intensity-tolerance': 0.4, 'friction-sensitivity': -0.2 },
      },
      {
        value: 'museums-concerts',
        label: 'Museums and live music venues',
        impacts: { 'rootedness-vs-access': 0.4, 'creative-energy': 0.3 },
      },
      {
        value: 'parks-water',
        label: 'Real park or waterfront',
        impacts: { 'environmental-openness': 0.45 },
      },
      {
        value: 'family-infra',
        label: 'Playgrounds, elementary schools, childcare',
        impacts: { 'family-trajectory': 0.4 },
      },
      {
        value: 'community',
        label: 'Community institution or place of worship',
        impacts: { 'cultural-ecosystem': 0.3 },
      },
    ],
  },
  {
    id: 'walk-scenery',
    kind: 'multi_select',
    purpose: 'walkable_amenities',
    maxSelections: 3,
    prompt: 'On a walk for pleasure, what do you want to see?',
    helperText: 'Pick up to three. The things that genuinely make you want to walk somewhere.',
    options: [
      {
        value: 'leafy-residential',
        label: 'Leafy residential blocks, stoops, brownstones, prewar facades',
        impacts: { 'streetscape-quality': 0.45 },
      },
      {
        value: 'lively-retail',
        label: 'Cafés, shops, people, lively retail streets',
        impacts: { 'streetscape-quality': 0.20, 'urban-intensity-tolerance': 0.35, 'visitor-facing-energy': 0.15 },
      },
      {
        value: 'real-park',
        label: 'A real park to wander in (Central, Prospect, Hudson River)',
        impacts: { 'environmental-openness': 0.40, 'streetscape-quality': 0.15 },
      },
      {
        value: 'waterfront',
        label: 'Waterfront paths, river or harbor views',
        impacts: { 'environmental-openness': 0.45, 'streetscape-quality': 0.20 },
      },
      {
        value: 'arts-scene',
        label: 'Galleries, studios, mural walls',
        impacts: { 'creative-energy': 0.45, 'streetscape-quality': 0.10 },
      },
      {
        value: 'industrial-loft',
        label: 'Industrial, warehouse, loft texture',
        impacts: { 'creative-energy': 0.25, 'friction-sensitivity': -0.10 },
      },
      {
        value: 'small-downtown',
        label: 'A charming small downtown / main street',
        impacts: { 'rootedness-vs-access': -0.35, 'daily-life-walkability': 0.25, 'urban-intensity-tolerance': -0.15, 'streetscape-quality': 0.20 },
      },
      {
        value: 'suburban-streets',
        label: 'Quiet suburban streets, lawns, mature trees',
        impacts: { 'urban-intensity-tolerance': -0.45, 'friction-sensitivity': 0.20, 'streetscape-quality': 0.25 },
      },
    ],
  },
  {
    id: 'cultural-communities',
    kind: 'multi_select',
    purpose: 'cultural_tags',
    prompt: 'Which communities, if any, do you want close to home?',
    helperText: 'Ethnic or religious. Each pick boosts matching neighborhoods. Skip if not applicable.',
    dimensionImpactPerSelection: { 'cultural-ecosystem': 0.4 },
    options: [
      { value: 'east-asian', label: 'East Asian (Chinese, Korean, Japanese, Taiwanese)' },
      { value: 'south-asian', label: 'South Asian (Indian, Pakistani, Bangladeshi, Sri Lankan)' },
      { value: 'latin-american', label: 'Latin American (Mexican, Dominican, Puerto Rican, Colombian, Ecuadorian)' },
      { value: 'caribbean', label: 'Caribbean (Jamaican, Haitian, Trinidadian)' },
      { value: 'middle-eastern', label: 'Middle Eastern (Arab, Persian, Turkish, Israeli)' },
      { value: 'mediterranean', label: 'Mediterranean (Greek, Italian)' },
      { value: 'eastern-european', label: 'Eastern European (Russian, Polish, Ukrainian)' },
      { value: 'jewish', label: 'Jewish community (Orthodox, Reform)' },
      { value: 'african-american', label: 'African American' },
      { value: 'west-african', label: 'West African (Senegalese, Nigerian)' },
    ],
  },

  // PHASE 3 — SINGLE-AXIS PREFERENCES (sliders)
  {
    id: 'safety-need',
    kind: 'slider',
    prompt: 'I need to feel safe walking home alone late at night.',
    lowLabel: 'Not a strong factor',
    highLabel: 'Essential',
    dimensionId: 'safety-need',
  },
  {
    id: 'school-need',
    kind: 'slider',
    prompt: 'Top-rated zoned public schools are essential to where I\'ll live.',
    lowLabel: 'Not a factor',
    highLabel: 'Required',
    dimensionId: 'school-quality',
  },
  {
    id: 'creative-immersion',
    kind: 'slider',
    prompt: 'I want art galleries and indie music venues on my own block.',
    lowLabel: 'Rather not',
    highLabel: 'Yes please',
    dimensionId: 'creative-energy',
  },

  // PHASE 4 — CONCRETE TRADEOFFS (forced-choice)
  {
    id: 'noise-tolerance',
    kind: 'forced_choice',
    prompt: 'Same price, same size: quiet block, or above a busy street?',
    choices: [
      { label: 'The quiet one, no contest', impacts: { 'friction-sensitivity': 0.7 } },
      { label: 'The busy one. I like the energy.', impacts: { 'friction-sensitivity': -0.6 } },
      { label: 'Depends on the day', impacts: { 'friction-sensitivity': 0.0 } },
    ],
  },

  // PHASE 5 — REFLECTION / IDENTITY (semantic-differential sliders)
  // Spectrum sliders with vibe-pair endpoints. Each pole sounds equally
  // legitimate; no option is "better." Multi-dim impacts add to the user
  // vector (slider value × impact) — see content/types.ts SliderQuestion.
  {
    id: 'aesthetic-register-fit',
    kind: 'slider',
    prompt: 'Where on this spectrum does your ideal neighborhood feel sit?',
    lowLabel: 'Trendsetting',
    highLabel: 'Traditional',
    impacts: {
      'social-register': 0.65,
      'creative-energy': -0.20,
    },
  },
  {
    id: 'lifecycle-stage-fit',
    kind: 'slider',
    prompt: 'And the lifecycle of the neighborhood?',
    lowLabel: 'Up-and-coming',
    highLabel: 'Established',
    impacts: {
      'prestige-orientation': 0.65,
      'creative-energy': -0.15,
      'friction-sensitivity': 0.15,
    },
  },
  {
    id: 'rootedness-vs-access-fit',
    kind: 'forced_choice',
    prompt: 'Two equally great neighborhoods. Pick the one that pulls you more.',
    choices: [
      {
        label: 'The one where you\'d recognize half the regulars at your coffee shop within a year.',
        impacts: { 'rootedness-vs-access': -0.7 },
      },
      {
        label: 'The one where you can walk to a different world-class restaurant every night.',
        impacts: { 'rootedness-vs-access': 0.7 },
      },
      {
        label: 'Either, depending on the rest of the fit.',
        impacts: { 'rootedness-vs-access': 0 },
      },
    ],
  },
  // PHASE 6 — GATED + COMMIT
  {
    // Magnitudes intentionally lower than they once were: with the new
    // place-archetype-primary now disambiguating walkable-civic-suburb
    // (community-fabric +0.45) from estate-club-suburb (community-fabric
    // -0.40), this question is a finer correction lever, not the primary
    // signal. Was ±0.75; now ±0.40.
    id: 'community-fabric-mode',
    kind: 'forced_choice',
    prompt: 'Which suburban social world feels more like home?',
    choices: [
      {
        label: 'Walkable village, public-school circles, neighbors you see around town.',
        impacts: { 'community-fabric': 0.40 },
      },
      {
        label: 'Private estate, club-oriented, more space and fewer casual run-ins.',
        impacts: { 'community-fabric': -0.40 },
      },
      {
        label: 'Either, if the house and commute work.',
        impacts: { 'community-fabric': 0 },
      },
    ],
  },
  {
    id: 'must-haves',
    kind: 'multi_select',
    purpose: 'must_haves',
    maxSelections: 3,
    prompt: 'Last one. Anything you truly will not compromise on?',
    helperText: 'Hard filters. Pick up to three. Failing any one excludes a neighborhood entirely. Skip if nothing applies.',
    options: [
      { value: 'subway-redundancy', label: 'Multiple transit options (any mix of subway, PATH, ferry, rail, express bus)' },
      { value: 'walking-distance-park', label: 'Walking distance to a major park or waterfront' },
      { value: 'house-or-townhouse', label: 'Single-family homes or townhouses available' },
      { value: 'luxury-highrise', label: 'Newer luxury high-rise (doorman, gym, modern fixtures)' },
      { value: 'top-schools', label: 'Top-rated zoned public schools' },
      { value: 'quiet-blocks-available', label: 'A quiet residential block, even if the neighborhood is busy' },
      { value: 'family-infrastructure', label: 'Strong family-life infrastructure (playgrounds, kid-friendly streets, other families nearby)' },
      { value: 'no-car', label: 'Don\'t need a car for daily life' },
      { value: 'cultural-match', label: 'Cultural-community match (uses your earlier picks)' },
    ],
  },
] as const;
