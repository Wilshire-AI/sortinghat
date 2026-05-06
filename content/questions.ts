import type { Question } from './types';

export const questions: readonly Question[] = [
  {
    id: 'home-feel',
    kind: 'forced_choice',
    prompt: 'When you picture coming home at the end of a long day, what do you most want?',
    choices: [
      {
        label: 'A quiet block where you can decompress',
        impacts: { 'urban-intensity-tolerance': -0.7, 'friction-sensitivity': 0.5, 'environmental-openness': 0.3 },
      },
      {
        label: 'Energy and movement so the city pulls you back out',
        impacts: { 'urban-intensity-tolerance': 0.7, 'friction-sensitivity': -0.4, 'creative-energy': 0.3 },
      },
    ],
  },
  {
    id: 'transit-redundancy',
    kind: 'forced_choice',
    prompt: 'Would relying on a single subway line for daily life frustrate you over time?',
    choices: [
      { label: 'Yes — I need options', impacts: { 'transit-psychology': 0.7 } },
      { label: 'Not really — one good line is enough', impacts: { 'transit-psychology': -0.5 } },
    ],
  },
  {
    id: 'prestige-vs-space',
    kind: 'forced_choice',
    prompt: 'Smaller apartment in a famous neighborhood, or materially more space in a less-known one?',
    choices: [
      {
        label: 'The famous neighborhood — the address matters',
        impacts: { 'prestige-orientation': 0.8, 'space-sensitivity': -0.5 },
      },
      {
        label: 'The space — I\'ll let the address grow on me',
        impacts: { 'prestige-orientation': -0.7, 'space-sensitivity': 0.6 },
      },
    ],
  },
  {
    id: 'family-horizon',
    kind: 'forced_choice',
    prompt: 'Are you optimizing for the life you have today, or the one you might have in five years?',
    choices: [
      { label: 'Today — five years is a long time', impacts: { 'family-trajectory': -0.7, 'creative-energy': 0.3 } },
      { label: 'Five years — I want to put down roots', impacts: { 'family-trajectory': 0.8, 'space-sensitivity': 0.4 } },
      { label: 'A bit of both — next 2-3 years', impacts: { 'family-trajectory': 0.2 } },
    ],
  },
  {
    id: 'cultural-anchor',
    kind: 'forced_choice',
    prompt: 'How important is having culturally familiar food, community, or language access in your daily life?',
    choices: [
      { label: 'Essential — I want to feel at home', impacts: { 'cultural-ecosystem': 0.8 } },
      { label: 'Nice but not necessary', impacts: { 'cultural-ecosystem': 0.2 } },
      { label: 'Not really a factor', impacts: { 'cultural-ecosystem': -0.5 } },
    ],
  },
  {
    id: 'park-need',
    kind: 'forced_choice',
    prompt: 'Do parks and waterfronts materially affect your mood?',
    choices: [
      { label: 'Yes — I notice when I haven\'t had nature', impacts: { 'environmental-openness': 0.8 } },
      { label: 'I like them but don\'t need them daily', impacts: { 'environmental-openness': 0.0 } },
      { label: 'Honestly, not much', impacts: { 'environmental-openness': -0.6 } },
    ],
  },
  {
    id: 'creative-immersion',
    kind: 'forced_choice',
    prompt: 'Do you want to live immersed in ambitious / creative scenes, or have access to them without being surrounded?',
    choices: [
      { label: 'Immersed — I want to bump into people doing things', impacts: { 'creative-energy': 0.8, 'urban-intensity-tolerance': 0.3 } },
      { label: 'Access without immersion', impacts: { 'creative-energy': 0.1 } },
      { label: 'Calm distance — I want to rest, not perform', impacts: { 'creative-energy': -0.6, 'friction-sensitivity': 0.4 } },
    ],
  },
  {
    id: 'noise-tolerance',
    kind: 'forced_choice',
    prompt: 'Two apartments — same price, same size. One is on a quiet block, one above a busy street. Which?',
    choices: [
      { label: 'The quiet one, no contest', impacts: { 'friction-sensitivity': 0.7 } },
      { label: 'The busy one — I like the energy', impacts: { 'friction-sensitivity': -0.6 } },
      { label: 'Depends on the day', impacts: { 'friction-sensitivity': 0.0 } },
    ],
  },
  {
    id: 'commute-personality',
    kind: 'forced_choice',
    prompt: 'How does your commute affect your day?',
    choices: [
      { label: 'It needs to be smooth — friction here ruins everything', impacts: { 'transit-psychology': 0.6, 'friction-sensitivity': 0.5 } },
      { label: 'I tune it out — fine as long as it\'s not crazy', impacts: { 'transit-psychology': -0.2 } },
      { label: 'I work from home, so it\'s rarely a factor', impacts: { 'transit-psychology': -0.3, 'space-sensitivity': 0.3 } },
    ],
  },
  {
    id: 'weekend-life',
    kind: 'forced_choice',
    prompt: 'On a typical Saturday, where are you?',
    choices: [
      { label: 'Walking the neighborhood, slow morning at home', impacts: { 'urban-intensity-tolerance': -0.3, 'friction-sensitivity': 0.3 } },
      { label: 'In the city — restaurants, shows, plans with friends', impacts: { 'urban-intensity-tolerance': 0.4, 'creative-energy': 0.3 } },
      { label: 'Out of the city — parks, hikes, the beach', impacts: { 'environmental-openness': 0.5 } },
    ],
  },
  {
    id: 'aspirational-vs-grounded',
    kind: 'forced_choice',
    prompt: 'When you talk about where you live, do you feel proud of the name, or proud of the place itself?',
    choices: [
      { label: 'The name — it\'s part of how I think about myself', impacts: { 'prestige-orientation': 0.7 } },
      { label: 'The place — I\'d rather under-promise and over-deliver', impacts: { 'prestige-orientation': -0.6 } },
    ],
  },
  {
    id: 'apartment-size-feel',
    kind: 'slider',
    prompt: 'How much does apartment size affect how you feel about your life?',
    lowLabel: 'I can be happy in a small space',
    highLabel: 'I need real space to feel at home',
    dimensionId: 'space-sensitivity',
  },
  {
    id: 'friction-tolerance',
    kind: 'slider',
    prompt: 'How sensitive are you to chaotic, gritty, high-friction daily environments?',
    lowLabel: 'Doesn\'t bother me',
    highLabel: 'Drains me over time',
    dimensionId: 'friction-sensitivity',
  },
  {
    id: 'green-need',
    kind: 'slider',
    prompt: 'How important is regular access to parks, water, or nature?',
    lowLabel: 'Don\'t really need it',
    highLabel: 'Essential to my wellbeing',
    dimensionId: 'environmental-openness',
  },
] as const;
