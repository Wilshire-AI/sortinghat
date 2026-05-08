import type { Question } from './types';

export const questions: readonly Question[] = [
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
    prompt: 'Smaller apartment in the middle of everything, or materially more space further from the action?',
    choices: [
      {
        label: 'In the middle of everything. Trade space for being where it\'s all happening.',
        impacts: { 'urban-intensity-tolerance': 0.5, 'space-sensitivity': -0.5 },
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
    id: 'family-horizon',
    kind: 'forced_choice',
    prompt: 'Are kids in the picture, either already or within a 5-year horizon?',
    choices: [
      { label: 'Yes. Kids are part of the household or plan.', impacts: { 'family-trajectory': 0.8 } },
      { label: 'Maybe. Keeping that option open.', impacts: { 'family-trajectory': 0.2 } },
      { label: 'Probably not, or not in this window.', impacts: { 'family-trajectory': 0 } },
    ],
  },
  {
    id: 'cultural-anchor',
    kind: 'forced_choice',
    prompt: 'How important is having culturally familiar food, community, or language access in your daily life?',
    choices: [
      { label: 'Essential. I want it in daily reach.', impacts: { 'cultural-ecosystem': 0.8 } },
      { label: 'Nice but not necessary.', impacts: { 'cultural-ecosystem': 0.2 } },
      { label: 'Not really a factor.', impacts: { 'cultural-ecosystem': 0 } },
    ],
  },
  {
    id: 'cultural-communities',
    kind: 'multi_select',
    purpose: 'cultural_tags',
    prompt: 'Which communities, if any, do you want close to home?',
    helperText: 'Ethnic and religious communities. Pick none, one, or several. Each pick boosts matching neighborhoods. (Skip if it doesn\'t apply.)',
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
  {
    id: 'creative-immersion',
    kind: 'forced_choice',
    prompt: 'How close do you want to live to the creative scene: art, indie music, makers, the kind of culture you stumble into walking around?',
    choices: [
      { label: 'In it. I want to be surrounded.', impacts: { 'creative-energy': 0.8 } },
      { label: 'Near it. Visit when I want, retreat when I don\'t.', impacts: { 'creative-energy': 0.2 } },
      { label: 'Distance. Not what I need at home.', impacts: { 'creative-energy': -0.6 } },
    ],
  },
  {
    id: 'noise-tolerance',
    kind: 'forced_choice',
    prompt: 'Two apartments, same price, same size. One is on a quiet block. One is above a busy street. Which?',
    choices: [
      { label: 'The quiet one, no contest', impacts: { 'friction-sensitivity': 0.7 } },
      { label: 'The busy one. I like the energy.', impacts: { 'friction-sensitivity': -0.6 } },
      { label: 'Depends on the day', impacts: { 'friction-sensitivity': 0.0 } },
    ],
  },
  {
    id: 'weekend-life',
    kind: 'forced_choice',
    prompt: 'On a typical Saturday, where are you?',
    choices: [
      { label: 'Walking the neighborhood, slow morning at home', impacts: { 'urban-intensity-tolerance': -0.3 } },
      { label: 'In the city. Restaurants, shows, plans with friends.', impacts: { 'urban-intensity-tolerance': 0.4 } },
      { label: 'Out of the city. Parks, hikes, the beach.', impacts: { 'environmental-openness': 0.5 } },
      { label: 'Mix of all three depending on the week.', impacts: {} },
    ],
  },
  {
    id: 'social-register-fit',
    kind: 'forced_choice',
    prompt: 'Which neighborhood vibe pulls you more?',
    choices: [
      {
        label: 'Casual, progressive, a little bohemian. Lived-in and unbuttoned.',
        impacts: { 'social-register': -0.7 },
      },
      {
        label: 'Polished and traditional. Classic, put-together, doorman-fluent.',
        impacts: { 'social-register': 0.7 },
      },
      {
        label: 'No strong pull either way.',
        impacts: { 'social-register': 0 },
      },
    ],
  },
  {
    id: 'visitor-facing-fit',
    kind: 'slider',
    prompt: 'Tourist crowds and weekend visitors are part of what makes a neighborhood feel alive.',
    lowLabel: 'No, they drain me',
    highLabel: 'Yes, the energy is the point',
    dimensionId: 'visitor-facing-energy',
  },
  {
    id: 'daily-life-walkability-fit',
    kind: 'slider',
    prompt: 'I want much of my daily life to be possible on foot.',
    lowLabel: 'Not a daily concern',
    highLabel: 'Essential',
    dimensionId: 'daily-life-walkability',
  },
  {
    id: 'streetscape-pleasure-fit',
    kind: 'forced_choice',
    prompt: 'How much does the daily streetscape matter: tree-lined blocks, pleasant sidewalks, walks just to enjoy where you live?',
    choices: [
      { label: 'Essential. I want streets I\'d take a walk on for no reason.', impacts: { 'streetscape-quality': 0.7 } },
      { label: 'Adds to quality of life, not the deciding factor.', impacts: { 'streetscape-quality': 0.3 } },
      { label: 'Functional is enough.', impacts: { 'streetscape-quality': 0 } },
    ],
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
    id: 'built-form-fit',
    kind: 'forced_choice',
    prompt: 'What kind of building do you picture yourself living in?',
    choices: [
      {
        label: 'Older with original character. Brownstone, prewar, or loft, quirks and all.',
        impacts: { 'built-form-register': -0.7 },
      },
      {
        label: 'Older if renovated. I want character and original details, but modern systems matter.',
        impacts: { 'built-form-register': -0.3 },
      },
      {
        label: 'Newer. Modern construction, doorman, full elevator access, in-building services.',
        impacts: { 'built-form-register': 0.7 },
      },
      {
        label: 'Either, depending on the neighborhood.',
        impacts: { 'built-form-register': 0 },
      },
    ],
  },
  {
    id: 'green-need',
    kind: 'forced_choice',
    prompt: 'How important is walking distance to a real park or waterfront?',
    choices: [
      { label: 'Essential. Daily green is non-negotiable.', impacts: { 'environmental-openness': 0.7 } },
      { label: 'Nice but not the deciding factor.', impacts: { 'environmental-openness': 0.3 } },
      { label: 'Not really a factor.', impacts: { 'environmental-openness': 0 } },
    ],
  },
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
    id: 'commute-target',
    kind: 'multi_select',
    purpose: 'commute_targets',
    prompt: 'Where will you actually need to be? Pick all that apply, including a partner\'s office if you\'re a couple.',
    helperText: 'We\'ll weight neighborhoods by realistic door-to-door commute, not by generic transit access. Pick "Mostly remote" if commute isn\'t a constraint.',
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
    kind: 'multi_select',
    purpose: 'commute_tolerance',
    maxSelections: 1,
    prompt: 'How much door-to-door commute can you live with on a typical day?',
    options: [
      { value: '30', label: 'Under 30 min. Anything more drains me.' },
      { value: '45', label: '30 to 45 min. Pretty standard NYC commute.' },
      { value: '60', label: '45 to 60 min. Fine if the neighborhood is right.' },
      { value: '90', label: '60+ min. Willing to trade for what I want.' },
    ],
  },
  {
    id: 'must-haves',
    kind: 'multi_select',
    purpose: 'must_haves',
    maxSelections: 3,
    prompt: 'Last one. Anything you truly will not compromise on?',
    helperText: 'Hard filters. Pick up to three things that are genuinely non-negotiable. Failing any one excludes a neighborhood from your matches entirely. (Skip if nothing applies.)',
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
