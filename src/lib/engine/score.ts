import type { Neighborhood, UserVector, DimensionId } from '@content/types';

const CULTURAL_TAG_BOOST = 0.08; // each matched tag adds 8% to the base score (capped at 1.0)

export function scoreNeighborhood(
  user: UserVector,
  neighborhood: Neighborhood,
  dimensionIds: readonly DimensionId[],
  selectedTags: readonly string[] = [],
): number {
  let sumSq = 0;
  for (const dimId of dimensionIds) {
    const u = user[dimId] ?? 0;
    const n = neighborhood.scores[dimId] ?? 0;
    const diff = u - n;
    sumSq += diff * diff;
  }
  const distance = Math.sqrt(sumSq);
  const maxDistance = Math.sqrt(dimensionIds.length * 4);
  const baseScore = maxDistance === 0 ? 1 : 1 - distance / maxDistance;

  // Cultural-tag boost: each matching tag bumps the score by CULTURAL_TAG_BOOST.
  // Asymmetric. If the user picked a tag and the neighborhood has it, both win.
  // If the neighborhood has tags the user didn't pick, no penalty.
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
  dimensionIds: readonly DimensionId[],
  topN: number = 5,
  selectedTags: readonly string[] = [],
): RankedNeighborhood[] {
  const scored = neighborhoods.map((neighborhood) => ({
    neighborhood,
    score: scoreNeighborhood(user, neighborhood, dimensionIds, selectedTags),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.neighborhood.id.localeCompare(b.neighborhood.id);
  });
  return scored.slice(0, topN);
}
