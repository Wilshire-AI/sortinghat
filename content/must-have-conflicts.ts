// Editorial conflict pairs for must-have filters. When a user selects two
// keys from the same pair, the quiz UI shows the message inline as a
// non-blocking warning — they can proceed if they really want that
// combination, but they're informed that matches will be narrow or empty.

export type MustHaveConflict = {
  pair: readonly [string, string];
  message: string;
};

export const MUST_HAVE_CONFLICTS: readonly MustHaveConflict[] = [
  {
    pair: ['no-car', 'top-schools'],
    message:
      'Heads up — top public schools mostly live in suburbs that need a car. These two together rarely match anywhere in the metro.',
  },
  {
    pair: ['no-car', 'house-or-townhouse'],
    message:
      'Heads up — single-family homes and townhouses mostly sit in suburbs (which need cars) or in pricey brownstone Brooklyn. The overlap is narrow.',
  },
  {
    pair: ['luxury-highrise', 'top-schools'],
    message:
      'Heads up — luxury highrises concentrate in Manhattan and Jersey City core, where top public schools are rare. Tough to combine.',
  },
  {
    pair: ['luxury-highrise', 'calm-blocks'],
    message:
      'Heads up — luxury highrises tend to sit in active, commercial areas. Hard to combine with whole-neighborhood calm.',
  },
  {
    pair: ['luxury-highrise', 'quiet-blocks-available'],
    message:
      'Heads up — luxury highrises sit in busy, active neighborhoods where notable quiet enclaves are uncommon.',
  },
  {
    pair: ['top-schools', 'cultural-match'],
    message:
      'Heads up — most top-rated school districts are demographically homogenous. Combining with a specific cultural-community match narrows results sharply.',
  },
];

export function findActiveConflicts(
  selected: readonly string[],
): readonly MustHaveConflict[] {
  const set = new Set(selected);
  return MUST_HAVE_CONFLICTS.filter((c) => set.has(c.pair[0]) && set.has(c.pair[1]));
}
