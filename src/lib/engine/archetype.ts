import type { Archetype, UserVector, DimensionId } from '@content/types';

export function matchArchetype(
  user: UserVector,
  archetypes: readonly Archetype[],
  dimensionIds: readonly DimensionId[],
): Archetype {
  if (archetypes.length === 0) {
    throw new Error('Cannot match against empty archetype list');
  }
  let best: { archetype: Archetype; distance: number } | null = null;
  for (const a of archetypes) {
    let sumSq = 0;
    for (const dimId of dimensionIds) {
      const diff = (user[dimId] ?? 0) - (a.vector[dimId] ?? 0);
      sumSq += diff * diff;
    }
    const distance = Math.sqrt(sumSq);
    if (
      best === null ||
      distance < best.distance ||
      (distance === best.distance && a.id.localeCompare(best.archetype.id) < 0)
    ) {
      best = { archetype: a, distance };
    }
  }
  return best!.archetype;
}
