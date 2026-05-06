import { describe, it, expect } from 'vitest';
import { scoreNeighborhood, rankNeighborhoods } from '@/lib/engine/score';
import type { Neighborhood } from '@content/types';

const fakeDims = ['a', 'b', 'c'] as const;

function n(id: string, scores: Record<string, number>): Neighborhood {
  return {
    id, slug: id, name: id, borough: 'manhattan', scores,
    basePassages: { whyItFits: '', whoThrivesHere: '', tradeoffs: [] },
    anchors: { transit: [], parks: [], groceries: [] },
    heroImage: '',
  };
}

describe('scoreNeighborhood', () => {
  it('returns 1.0 when user matches neighborhood exactly', () => {
    expect(scoreNeighborhood({ a: 0.5, b: -0.3, c: 0.8 }, n('x', { a: 0.5, b: -0.3, c: 0.8 }), fakeDims)).toBeCloseTo(1.0, 6);
  });
  it('returns 0.0 when user and neighborhood are opposite poles', () => {
    expect(scoreNeighborhood({ a: 1, b: 1, c: 1 }, n('x', { a: -1, b: -1, c: -1 }), fakeDims)).toBeCloseTo(0.0, 6);
  });
  it('returns 0.5 for a neutral user against a fully-positive neighborhood', () => {
    expect(scoreNeighborhood({ a: 0, b: 0, c: 0 }, n('x', { a: 1, b: 1, c: 1 }), fakeDims)).toBeCloseTo(0.5, 6);
  });
  it('does not divide by zero on a neutral pair', () => {
    expect(scoreNeighborhood({ a: 0, b: 0, c: 0 }, n('x', { a: 0, b: 0, c: 0 }), fakeDims)).toBe(1.0);
  });
});

describe('rankNeighborhoods', () => {
  const user = { a: 1, b: 0, c: 0 };
  const list = [n('match', { a: 1, b: 0, c: 0 }), n('opposite', { a: -1, b: 0, c: 0 }), n('mid', { a: 0.5, b: 0, c: 0 })];
  it('sorts by score descending', () => {
    expect(rankNeighborhoods(user, list, fakeDims).map((r) => r.neighborhood.id)).toEqual(['match', 'mid', 'opposite']);
  });
  it('respects topN', () => {
    expect(rankNeighborhoods(user, list, fakeDims, 1)).toHaveLength(1);
  });
  it('breaks ties alphabetically', () => {
    const tied = [n('zebra', { a: 0.5, b: 0, c: 0 }), n('apple', { a: 0.5, b: 0, c: 0 })];
    expect(rankNeighborhoods(user, tied, fakeDims).map((r) => r.neighborhood.id)).toEqual(['apple', 'zebra']);
  });
});
