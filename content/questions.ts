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
  // PHASE 1 — WARM-UP (concrete behavior, no values judgment)
  {
    id: 'transit-redundancy',
    kind: 'forced_choice',
    prompt: 'How do you mostly want to get around?',
    choices: [
      {
        label: 'I\'d take transit. I want multiple options.',
        impacts: { 'transit-psychology': 0.7, 'urban-intensity-tolerance': 0.4 },
      },
      {
        label: 'I\'d take transit. One reliable line is enough.',
        impacts: { 'transit-psychology': 0, 'urban-intensity-tolerance': 0.2 },
      },
      {
        label: 'I\'d drive. Car-dependent is fine.',
        impacts: { 'transit-psychology': 0 },
        softPrefs: ['car-friendly'],
      },
    ],
  },
  {
    id: 'access-vs-space',
    kind: 'forced_choice',
    prompt: 'Where on the density spectrum do you actually want to live?',
    choices: [
      {
        label: 'In the middle of everything. Trade space for being where it\'s all happening.',
        impacts: { 'urban-intensity-tolerance': 0.55, 'space-sensitivity': -0.5 },
      },
      {
        label: 'A walkable neighborhood with elbow room. A real downtown, but not the densest part.',
        impacts: { 'urban-intensity-tolerance': 0.0, 'space-sensitivity': 0.1, 'daily-life-walkability': 0.4, 'rootedness-vs-access': -0.2 },
      },
      {
        label: 'More space. I\'ll travel for the action when I want it.',
        impacts: { 'urban-intensity-tolerance': -0.4, 'space-sensitivity': 0.6 },
      },
      {
        label: 'Either, depending on the actual tradeoff.',
        impacts: {},
      },
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
  {
    id: 'place-tier',
    kind: 'forced_choice',
    prompt: 'Which sounds most like the life you want?',
    choices: [
      {
        label: 'A different walk every weekend. The train comes every four minutes.',
        impacts: {
          'urban-intensity-tolerance': 0.55,
          'rootedness-vs-access': 0.40,
          'daily-life-walkability': 0.55,
        },
      },
      {
        label: 'Same coffee shop most mornings. The corner where I run into people I know.',
        impacts: {
          'urban-intensity-tolerance': 0.0,
          'daily-life-walkability': 0.50,
          'rootedness-vs-access': -0.20,
        },
      },
      {
        label: 'Saturday is the farmers market. A small downtown I walk to.',
        impacts: {
          'urban-intensity-tolerance': -0.40,
          'rootedness-vs-access': -0.55,
          'daily-life-walkability': 0.60,
          'community-fabric': 0.50,
        },
      },
      {
        label: 'We host. A yard, a driveway, a dining table for ten. Day-to-day means the car.',
        impacts: {
          'urban-intensity-tolerance': -0.55,
          'rootedness-vs-access': -0.65,
          'daily-life-walkability': 0.05,
          'community-fabric': -0.40,
        },
      },
      {
        label: 'Woods out back. The car is part of the deal.',
        impacts: {
          'urban-intensity-tolerance': -0.70,
          'rootedness-vs-access': -0.70,
          'daily-life-walkability': -0.30,
          'environmental-openness': 0.30,
        },
      },
      {
        label: 'Still figuring it out. Show me a mix.',
        impacts: {},
      },
    ],
  },

  // PHASE 6 — GATED + COMMIT
  {
    id: 'community-fabric-mode',
    kind: 'forced_choice',
    prompt: 'Which suburban social world feels more like home?',
    choices: [
      {
        label: 'Walkable village, public-school circles, neighbors you see around town.',
        impacts: { 'community-fabric': 0.75 },
      },
      {
        label: 'Private estate, club-oriented, more space and fewer casual run-ins.',
        impacts: { 'community-fabric': -0.75 },
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
