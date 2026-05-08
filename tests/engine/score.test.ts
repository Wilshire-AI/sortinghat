import { describe, it, expect } from 'vitest';
import { rankNeighborhoods, scoreCommute } from '@/lib/engine/score';
import type { Neighborhood, Dimension } from '@content/types';

const sym3: Dimension[] = [
  { id: 'a', name: 'A', kind: 'symmetric', description: 'a description that is long enough', poles: { low: 'low-a', high: 'high-a' } },
  { id: 'b', name: 'B', kind: 'symmetric', description: 'b description that is long enough', poles: { low: 'low-b', high: 'high-b' } },
  { id: 'c', name: 'C', kind: 'symmetric', description: 'c description that is long enough', poles: { low: 'low-c', high: 'high-c' } },
];

function n(id: string, scores: Record<string, number>): Neighborhood {
  return {
    id, slug: id, name: id, borough: 'manhattan', scores,
    basePassages: { whyItFits: '', whoThrivesHere: '', tradeoffs: [] },
    anchors: { transit: [], parks: [], groceries: [] },
    heroImage: '',
  };
}

// scoreNeighborhood (Euclidean primitive) was deleted in commit 5 of the
// Bayesian migration. The Bayesian engine's primitives are tested directly
// in tests/engine/bayesian-scoring.test.ts (sigmaForPopulation,
// logPriorForPopulation, dimensionDelta, logLikelihoodBayesian).

describe('family-infrastructure must-have filter', () => {
  const dim: Dimension[] = sym3;
  const withFlag = { ...n('with', { a: 0, b: 0, c: 0 }), hasFamilyInfrastructure: true };
  const without = n('without', { a: 0, b: 0, c: 0 });

  it('keeps neighborhoods with hasFamilyInfrastructure=true', () => {
    const out = rankNeighborhoods({ a: 0, b: 0, c: 0 }, [withFlag, without], dim, 5, [], ['family-infrastructure']);
    expect(out.map((r) => r.neighborhood.id)).toEqual(['with']);
  });
  it('drops neighborhoods with hasFamilyInfrastructure undefined', () => {
    const out = rankNeighborhoods({ a: 0, b: 0, c: 0 }, [without], dim, 5, [], ['family-infrastructure']);
    expect(out).toHaveLength(0);
  });
});

describe('quiet-blocks-available must-have filter', () => {
  const dim: Dimension[] = sym3;
  const withFlag = { ...n('with', { a: 0, b: 0, c: 0 }), hasQuietBlocks: true };
  const without = n('without', { a: 0, b: 0, c: 0 });
  const explicitFalse = { ...n('false', { a: 0, b: 0, c: 0 }), hasQuietBlocks: false };

  it('keeps neighborhoods with hasQuietBlocks=true', () => {
    const out = rankNeighborhoods({ a: 0, b: 0, c: 0 }, [withFlag, without], dim, 5, [], ['quiet-blocks-available']);
    expect(out.map((r) => r.neighborhood.id)).toEqual(['with']);
  });
  it('drops neighborhoods with hasQuietBlocks undefined', () => {
    const out = rankNeighborhoods({ a: 0, b: 0, c: 0 }, [without], dim, 5, [], ['quiet-blocks-available']);
    expect(out).toHaveLength(0);
  });
  it('drops neighborhoods with hasQuietBlocks=false', () => {
    const out = rankNeighborhoods({ a: 0, b: 0, c: 0 }, [explicitFalse], dim, 5, [], ['quiet-blocks-available']);
    expect(out).toHaveLength(0);
  });
  it('is a no-op when not in mustHaves', () => {
    const out = rankNeighborhoods({ a: 0, b: 0, c: 0 }, [withFlag, without], dim);
    expect(out).toHaveLength(2);
  });
});

describe('rankNeighborhoods', () => {
  const user = { a: 1, b: 0, c: 0 };
  const list = [n('match', { a: 1, b: 0, c: 0 }), n('opposite', { a: -1, b: 0, c: 0 }), n('mid', { a: 0.5, b: 0, c: 0 })];
  it('sorts by score descending', () => {
    expect(rankNeighborhoods(user, list, sym3).map((r) => r.neighborhood.id)).toEqual(['match', 'mid', 'opposite']);
  });
  it('respects topN', () => {
    expect(rankNeighborhoods(user, list, sym3, 1)).toHaveLength(1);
  });
  it('breaks ties alphabetically', () => {
    const tied = [n('zebra', { a: 0.5, b: 0, c: 0 }), n('apple', { a: 0.5, b: 0, c: 0 })];
    expect(rankNeighborhoods(user, tied, sym3).map((r) => r.neighborhood.id)).toEqual(['apple', 'zebra']);
  });
});

describe('scoreCommute', () => {
  it('returns 1.0 when no real targets (empty)', () => {
    expect(scoreCommute({ midtown: 30 }, [], 45)).toBe(1.0);
  });
  it('returns 1.0 when only "remote" or "other" picked', () => {
    expect(scoreCommute({ midtown: 30 }, ['remote'], 45)).toBe(1.0);
    expect(scoreCommute({ midtown: 30 }, ['remote', 'other'], 45)).toBe(1.0);
  });
  it('returns 1.0 when actual commute is within tolerance', () => {
    expect(scoreCommute({ midtown: 30 }, ['midtown'], 45)).toBe(1.0);
    expect(scoreCommute({ midtown: 45 }, ['midtown'], 45)).toBe(1.0);
  });
  it('penalizes proportionally when commute exceeds tolerance', () => {
    // actual=60, tolerance=30 → excess ratio = 1.0 → mult = 1 - 0.5*1.0 = 0.5
    expect(scoreCommute({ midtown: 60 }, ['midtown'], 30)).toBeCloseTo(0.5, 4);
  });
  it('clamps penalty at the floor (0.3) for severely over-tolerance commutes', () => {
    // excess ratio ~3 → mult would be -0.5 → clamped to 0.3
    expect(scoreCommute({ midtown: 120 }, ['midtown'], 30)).toBe(0.3);
  });
  it('treats missing-cluster commute as infeasible (excess ratio 2.0 → mult = 0)', () => {
    // excess ratio = 2.0 → 1 - 0.5*2 = 0 → clamped to floor 0.3
    expect(scoreCommute({ fidi: 30 }, ['midtown'], 45)).toBe(0.3);
  });
  it('averages across multiple targets', () => {
    // midtown 30/30 → mult 1.0; westport infeasible → mult 0.3; avg = 0.65
    expect(scoreCommute({ midtown: 30 }, ['midtown', 'westport'], 30)).toBeCloseTo(0.65, 4);
  });
  it('returns 1.0 when tolerance is 0 (no preference)', () => {
    expect(scoreCommute({ midtown: 60 }, ['midtown'], 0)).toBe(1.0);
  });
});

describe('rankNeighborhoods commute integration', () => {
  const dim: Dimension[] = sym3;
  const user = { a: 0, b: 0, c: 0 };
  const list = [
    n('close', { a: 0, b: 0, c: 0 }),     // 20-min commute to midtown
    n('far', { a: 0, b: 0, c: 0 }),       // 90-min commute to midtown
  ];
  const commuteData = {
    close: { midtown: 20 },
    far: { midtown: 90 },
  };

  it('penalizes far-commute neighborhoods when commute scoring active', () => {
    const out = rankNeighborhoods(user, list, dim, {
      commuteTargets: ['midtown'],
      commuteToleranceMinutes: 30,
      commuteMinutesByNeighborhood: commuteData,
    });
    expect(out.map((r) => r.neighborhood.id)).toEqual(['close', 'far']);
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });

  it('does not apply commute penalty when targets is empty', () => {
    const out = rankNeighborhoods(user, list, dim, {
      commuteTargets: [],
      commuteToleranceMinutes: 30,
      commuteMinutesByNeighborhood: commuteData,
    });
    expect(out[0].score).toBe(out[1].score);
  });

  it('skips commute scoring when only "remote" selected', () => {
    const out = rankNeighborhoods(user, list, dim, {
      commuteTargets: ['remote'],
      commuteToleranceMinutes: 30,
      commuteMinutesByNeighborhood: commuteData,
    });
    expect(out[0].score).toBe(out[1].score);
  });
});
