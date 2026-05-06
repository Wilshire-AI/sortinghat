import { describe, it, expect } from 'vitest';
import { scoreNeighborhood, rankNeighborhoods } from '@/lib/engine/score';
import type { Neighborhood, Dimension } from '@content/types';

const sym3: Dimension[] = [
  { id: 'a', name: 'A', kind: 'symmetric', description: 'a description that is long enough', poles: { low: 'low-a', high: 'high-a' } },
  { id: 'b', name: 'B', kind: 'symmetric', description: 'b description that is long enough', poles: { low: 'low-b', high: 'high-b' } },
  { id: 'c', name: 'C', kind: 'symmetric', description: 'c description that is long enough', poles: { low: 'low-c', high: 'high-c' } },
];

const asym1: Dimension[] = [
  { id: 'p', name: 'Prestige', kind: 'asymmetric_need', description: 'a long enough description for the test', poles: { low: 'low-p', high: 'high-p' } },
];

function n(id: string, scores: Record<string, number>): Neighborhood {
  return {
    id, slug: id, name: id, borough: 'manhattan', scores,
    basePassages: { whyItFits: '', whoThrivesHere: '', tradeoffs: [] },
    anchors: { transit: [], parks: [], groceries: [] },
    heroImage: '',
  };
}

describe('scoreNeighborhood (symmetric dimensions)', () => {
  it('returns 1.0 when user matches neighborhood exactly', () => {
    expect(scoreNeighborhood({ a: 0.5, b: -0.3, c: 0.8 }, n('x', { a: 0.5, b: -0.3, c: 0.8 }), sym3)).toBeCloseTo(1.0, 6);
  });
  it('returns 0.0 when user and neighborhood are opposite poles', () => {
    expect(scoreNeighborhood({ a: 1, b: 1, c: 1 }, n('x', { a: -1, b: -1, c: -1 }), sym3)).toBeCloseTo(0.0, 6);
  });
  it('returns 0.5 for a neutral user against a fully-positive neighborhood', () => {
    expect(scoreNeighborhood({ a: 0, b: 0, c: 0 }, n('x', { a: 1, b: 1, c: 1 }), sym3)).toBeCloseTo(0.5, 6);
  });
  it('does not divide by zero on a neutral pair', () => {
    expect(scoreNeighborhood({ a: 0, b: 0, c: 0 }, n('x', { a: 0, b: 0, c: 0 }), sym3)).toBe(1.0);
  });
});

describe('scoreNeighborhood (asymmetric_need dimensions)', () => {
  it('NO penalty when user is low and neighborhood is high (you got more than you needed)', () => {
    // user p=-1.0 (doesn't care about prestige), neighborhood p=+1.0 (very prestigious)
    // For asymmetric_need, this should be a perfect match — user wasn't seeking prestige
    expect(scoreNeighborhood({ p: -1.0 }, n('x', { p: 1.0 }), asym1)).toBeCloseTo(1.0, 6);
  });
  it('FULL penalty when user is high and neighborhood is low (under-delivers)', () => {
    expect(scoreNeighborhood({ p: 1.0 }, n('x', { p: -1.0 }), asym1)).toBeCloseTo(0.0, 6);
  });
  it('partial penalty when neighborhood is below user need', () => {
    // user p=+0.5, neighborhood p=0. Shortfall=0.5. Distance=0.5. Max=2. Score = 1 - 0.5/2 = 0.75
    expect(scoreNeighborhood({ p: 0.5 }, n('x', { p: 0.0 }), asym1)).toBeCloseTo(0.75, 6);
  });
  it('mid-low user with high neighborhood: still no penalty', () => {
    expect(scoreNeighborhood({ p: -0.3 }, n('x', { p: 0.7 }), asym1)).toBeCloseTo(1.0, 6);
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
