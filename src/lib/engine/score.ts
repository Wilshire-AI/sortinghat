import type { Dimension, Neighborhood, UserVector } from '@content/types';

const CULTURAL_TAG_BOOST = 0.08;

// Compute the squared-distance contribution for a single dimension.
// For symmetric dimensions, both directions of mismatch hurt.
// For asymmetric_need dimensions, only "neighborhood under-delivers what the
// user wants" hurts. Getting more than you wanted is free.
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
  // Worst-case distance: each dim contributes up to 4 (user=+1, neighborhood=-1).
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
): RankedNeighborhood[] {
  const scored = neighborhoods.map((neighborhood) => ({
    neighborhood,
    score: scoreNeighborhood(user, neighborhood, dimensions, selectedTags),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.neighborhood.id.localeCompare(b.neighborhood.id);
  });
  return scored.slice(0, topN);
}
