import type { UserVector } from '@content/types';
import { clampVector } from './vector';

// Tier-correction deltas applied to the decoded user vector when the user
// clicks a results-page correction button. Roughly half the magnitude of
// the corresponding place-tier choice impacts (content/questions.ts) — a
// meaningful nudge but not a full re-tier, so the user can dial intuitively.
//
// 'walkable' and 'quiet' deliberately push opposite ways on community-fabric
// (walkable suburb is village-fabric; quiet/estate is private-fabric).
export const TIER_DELTAS: Record<string, Partial<UserVector>> = {
  dense: {
    'urban-intensity-tolerance': 0.25,
    'rootedness-vs-access': 0.20,
    'daily-life-walkability': 0.20,
  },
  walkable: {
    'urban-intensity-tolerance': -0.20,
    'rootedness-vs-access': -0.25,
    'daily-life-walkability': 0.30,
    'community-fabric': 0.25,
  },
  quiet: {
    'urban-intensity-tolerance': -0.30,
    'rootedness-vs-access': -0.30,
    'daily-life-walkability': -0.15,
    'environmental-openness': 0.15,
  },
};

export type TierCorrection = keyof typeof TIER_DELTAS;

export function isValidTierCorrection(value: string | null): value is TierCorrection {
  return value !== null && value in TIER_DELTAS;
}

// Apply a tier correction to the user vector. Result is clamped to [-1, 1].
// When tier is null/unknown, returns the input unchanged.
export function applyPlaceTierCorrection(
  vector: UserVector,
  tier: string | null,
): UserVector {
  if (!isValidTierCorrection(tier)) return vector;
  const delta = TIER_DELTAS[tier];
  const adjusted: UserVector = { ...vector };
  for (const [k, d] of Object.entries(delta)) {
    if (d === undefined) continue;
    adjusted[k] = (adjusted[k] ?? 0) + d;
  }
  return clampVector(adjusted);
}
