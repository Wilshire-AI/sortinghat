import { describe, it, expect } from 'vitest';
import { rankNeighborhoods } from '@/lib/engine/score';
import type { Dimension, Neighborhood } from '@content/types';

// Three identically-scored neighborhoods; only differ in cultural-tag
// presence. The user's vector matches all three equally on dim axes, so
// any ranking difference is attributable to the cultural multiplier alone.
const dims: Dimension[] = [
  { id: 'urban', name: 'Urban', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'symmetric' },
];

function n(id: string, tags: string[] | undefined): Neighborhood {
  return {
    id,
    slug: id,
    name: id,
    borough: 'manhattan',
    scores: { urban: 0.5 },
    culturalTags: tags,
    basePassages: { whyItFits: '', whoThrivesHere: '', tradeoffs: [] },
    anchors: { transit: [], parks: [], groceries: [] },
    heroImage: '',
  };
}

// A and B match the user equally on dims; only A has the cultural tag.
// C is a clear loser (worse on urban) — its presence anchors the lower
// end of the linear-in-log² normalization so A and B can spread freely
// in between. Without C, the normalization collapses A→1, B→0 regardless
// of the boost magnitude (range = full span between only 2 candidates).
const tagged = n('tagged', ['east-asian']);
const untagged = n('untagged', undefined);
const anchor = n('anchor', undefined);
anchor.scores = { urban: -1 };
const user = { urban: 0.5 };
const candidates = [tagged, untagged, anchor];
const opts = { topN: 3, selectedTags: ['east-asian'], touchedDims: new Set(['urban']) };

function untaggedScore(culturalImportance: number | undefined): number {
  const ranked = rankNeighborhoods(user, candidates, dims, {
    ...opts,
    ...(culturalImportance === undefined ? {} : { culturalImportance }),
  });
  return ranked.find((r) => r.neighborhood.id === 'untagged')!.score;
}

describe('rankNeighborhoods — culturalImportance scaling', () => {
  it('importance=0 (Not a factor) yields no cultural boost; tagged + untagged tie at top', () => {
    const ranked = rankNeighborhoods(user, candidates, dims, { ...opts, culturalImportance: 0 });
    const a = ranked.find((r) => r.neighborhood.id === 'tagged')!;
    const b = ranked.find((r) => r.neighborhood.id === 'untagged')!;
    expect(a.score).toBeCloseTo(b.score, 6);
  });

  it('importance=2 (Important = current default) gives tagged the standard boost — untagged drops below tagged', () => {
    const ranked = rankNeighborhoods(user, candidates, dims, { ...opts, culturalImportance: 2 });
    expect(ranked[0].neighborhood.id).toBe('tagged');
    const b = ranked.find((r) => r.neighborhood.id === 'untagged')!;
    expect(b.score).toBeLessThan(1);
  });

  it('importance=3 (Essential) widens the gap vs Important', () => {
    expect(untaggedScore(3)).toBeLessThan(untaggedScore(2));
  });

  it('importance=1 (Nice to have) softens the boost vs Important', () => {
    expect(untaggedScore(1)).toBeGreaterThan(untaggedScore(2));
  });

  it('omitted culturalImportance defaults to importance=2 (preserves pre-feature ranking)', () => {
    expect(untaggedScore(undefined)).toBeCloseTo(untaggedScore(2), 6);
  });

  it('monotonic across the full importance range', () => {
    const at0 = untaggedScore(0);
    const at1 = untaggedScore(1);
    const at2 = untaggedScore(2);
    const at3 = untaggedScore(3);
    // Higher importance → larger penalty for untagged → lower normalized score.
    expect(at0).toBeGreaterThan(at1);
    expect(at1).toBeGreaterThan(at2);
    expect(at2).toBeGreaterThan(at3);
  });
});
