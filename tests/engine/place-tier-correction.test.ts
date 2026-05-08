import { describe, it, expect } from 'vitest';
import {
  applyPlaceTierCorrection,
  isValidTierCorrection,
  TIER_DELTAS,
} from '@/lib/engine/place-tier-correction';
import type { UserVector } from '@content/types';

describe('isValidTierCorrection', () => {
  it('accepts dense / walkable / quiet', () => {
    expect(isValidTierCorrection('dense')).toBe(true);
    expect(isValidTierCorrection('walkable')).toBe(true);
    expect(isValidTierCorrection('quiet')).toBe(true);
  });

  it('rejects null and unknown values', () => {
    expect(isValidTierCorrection(null)).toBe(false);
    expect(isValidTierCorrection('whatever')).toBe(false);
    expect(isValidTierCorrection('')).toBe(false);
  });
});

describe('applyPlaceTierCorrection', () => {
  const baseline: UserVector = {
    'urban-intensity-tolerance': 0.0,
    'rootedness-vs-access': 0.0,
    'daily-life-walkability': 0.0,
    'community-fabric': 0.0,
    'environmental-openness': 0.0,
  };

  it('returns input unchanged when tier is null', () => {
    const out = applyPlaceTierCorrection(baseline, null);
    expect(out).toEqual(baseline);
  });

  it('returns input unchanged when tier is unknown', () => {
    const out = applyPlaceTierCorrection(baseline, 'spicy');
    expect(out).toEqual(baseline);
  });

  it('dense correction increases urban + rooted + walkability', () => {
    const out = applyPlaceTierCorrection(baseline, 'dense');
    expect(out['urban-intensity-tolerance']).toBeGreaterThan(0);
    expect(out['rootedness-vs-access']).toBeGreaterThan(0);
    expect(out['daily-life-walkability']).toBeGreaterThan(0);
    // Untouched dim stays at baseline.
    expect(out['environmental-openness']).toBe(0);
  });

  it('walkable correction adds community-fabric and lowers urban', () => {
    const out = applyPlaceTierCorrection(baseline, 'walkable');
    expect(out['urban-intensity-tolerance']).toBeLessThan(0);
    expect(out['community-fabric']).toBeGreaterThan(0);
    expect(out['daily-life-walkability']).toBeGreaterThan(0);
  });

  it('quiet correction lowers walkability and adds env-openness', () => {
    const out = applyPlaceTierCorrection(baseline, 'quiet');
    expect(out['daily-life-walkability']).toBeLessThan(0);
    expect(out['environmental-openness']).toBeGreaterThan(0);
    expect(out['urban-intensity-tolerance']).toBeLessThan(0);
  });

  it('clamps result to [-1, 1] when adding to extreme values', () => {
    const extreme: UserVector = {
      'urban-intensity-tolerance': 0.95,
      'rootedness-vs-access': 0.95,
      'daily-life-walkability': 0.95,
    };
    const out = applyPlaceTierCorrection(extreme, 'dense');
    expect(out['urban-intensity-tolerance']).toBeLessThanOrEqual(1);
    expect(out['rootedness-vs-access']).toBeLessThanOrEqual(1);
    expect(out['daily-life-walkability']).toBeLessThanOrEqual(1);
  });

  it('does not mutate input', () => {
    const before = JSON.stringify(baseline);
    applyPlaceTierCorrection(baseline, 'dense');
    expect(JSON.stringify(baseline)).toBe(before);
  });

  it('every TIER_DELTAS key references valid dim ids (no typos)', () => {
    const validDims = new Set([
      'urban-intensity-tolerance',
      'rootedness-vs-access',
      'daily-life-walkability',
      'community-fabric',
      'environmental-openness',
    ]);
    for (const tier of Object.keys(TIER_DELTAS)) {
      for (const dim of Object.keys(TIER_DELTAS[tier])) {
        expect(validDims.has(dim), `${tier}.${dim}`).toBe(true);
      }
    }
  });
});
