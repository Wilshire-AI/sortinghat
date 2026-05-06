import type { Dimension, Neighborhood, UserVector } from '@content/types';

const CULTURAL_TAG_BOOST = 0.08;

// ---- Must-have filters ----
// Each known must-have key maps to a predicate that a neighborhood must
// satisfy to remain in the result set. Unknown keys are ignored.
export type MustHaveFn = (n: Neighborhood, selectedTags: readonly string[]) => boolean;

export const MUST_HAVE_FILTERS: Record<string, MustHaveFn> = {
  'subway-redundancy': (n) => (n.scores['transit-psychology'] ?? 0) >= 0.4,
  'walking-distance-park': (n) => (n.scores['environmental-openness'] ?? 0) >= 0.5,
  'top-schools': (n) => (n.scores['school-quality'] ?? 0) >= 0.7,
  'calm-blocks': (n) => (n.scores['friction-sensitivity'] ?? 0) >= 0.5,
  'no-car': (n) => !n.carDependent,
  'house-or-townhouse': (n) =>
    !!n.housingTypes && (n.housingTypes.includes('single-family') || n.housingTypes.includes('townhouse')),
  'cultural-match': (n, selectedTags) => {
    if (selectedTags.length === 0) return true; // user picked no tags; filter is no-op
    if (!n.culturalTags || n.culturalTags.length === 0) return false;
    return n.culturalTags.some((t) => selectedTags.includes(t));
  },
};

export function passesMustHaves(
  neighborhood: Neighborhood,
  mustHaves: readonly string[],
  selectedTags: readonly string[],
): boolean {
  for (const mh of mustHaves) {
    const filter = MUST_HAVE_FILTERS[mh];
    if (!filter) continue;
    if (!filter(neighborhood, selectedTags)) return false;
  }
  return true;
}

// ---- Scoring ----
function dimensionContribution(
  userValue: number,
  neighborhoodValue: number,
  kind: Dimension['kind'],
): number {
  if (kind === 'asymmetric_need') {
    const shortfall = Math.max(0, userValue - neighborhoodValue);
    return shortfall * shortfall;
  }
  const diff = userValue - neighborhoodValue;
  return diff * diff;
}

export function scoreNeighborhood(
  user: UserVector,
  neighborhood: Neighborhood,
  dimensions: readonly Dimension[],
  selectedTags: readonly string[] = [],
): number {
  let sumSq = 0;
  for (const d of dimensions) {
    const u = user[d.id] ?? 0;
    const n = neighborhood.scores[d.id] ?? 0;
    sumSq += dimensionContribution(u, n, d.kind);
  }
  const distance = Math.sqrt(sumSq);
  const maxDistance = Math.sqrt(dimensions.length * 4);
  const baseScore = maxDistance === 0 ? 1 : 1 - distance / maxDistance;

  if (selectedTags.length > 0 && neighborhood.culturalTags) {
    const matched = neighborhood.culturalTags.filter((t) => selectedTags.includes(t)).length;
    return Math.min(1, baseScore + matched * CULTURAL_TAG_BOOST);
  }
  return baseScore;
}

export type RankedNeighborhood = {
  neighborhood: Neighborhood;
  score: number;
};

export function rankNeighborhoods(
  user: UserVector,
  neighborhoods: readonly Neighborhood[],
  dimensions: readonly Dimension[],
  topN: number = 5,
  selectedTags: readonly string[] = [],
  mustHaves: readonly string[] = [],
): RankedNeighborhood[] {
  const filtered = mustHaves.length > 0
    ? neighborhoods.filter((n) => passesMustHaves(n, mustHaves, selectedTags))
    : neighborhoods;
  const scored = filtered.map((neighborhood) => ({
    neighborhood,
    score: scoreNeighborhood(user, neighborhood, dimensions, selectedTags),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.neighborhood.id.localeCompare(b.neighborhood.id);
  });
  return scored.slice(0, topN);
}

// Returns IDs of neighborhoods excluded by the must-haves filter, for UI display.
export function excludedByMustHaves(
  neighborhoods: readonly Neighborhood[],
  mustHaves: readonly string[],
  selectedTags: readonly string[],
): string[] {
  if (mustHaves.length === 0) return [];
  return neighborhoods
    .filter((n) => !passesMustHaves(n, mustHaves, selectedTags))
    .map((n) => n.id);
}
