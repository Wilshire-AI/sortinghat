import type { Neighborhood, UserVector, DimensionId } from '@content/types';

export function scoreNeighborhood(
  user: UserVector,
  neighborhood: Neighborhood,
  dimensionIds: readonly DimensionId[],
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
  if (maxDistance === 0) return 1;
  return 1 - distance / maxDistance;
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
): RankedNeighborhood[] {
  const scored = neighborhoods.map((neighborhood) => ({
    neighborhood,
    score: scoreNeighborhood(user, neighborhood, dimensionIds),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.neighborhood.id.localeCompare(b.neighborhood.id);
  });
  return scored.slice(0, topN);
}
