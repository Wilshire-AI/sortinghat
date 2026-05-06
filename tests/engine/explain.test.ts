import { describe, it, expect } from 'vitest';
import { resolveCardProse } from '@/lib/engine/explain';
import type { Neighborhood, Passage } from '@content/types';

const baseN: Neighborhood = {
  id: 'park-slope', slug: 'park-slope', name: 'Park Slope', borough: 'brooklyn',
  scores: {},
  basePassages: { whyItFits: 'base-fit', whoThrivesHere: 'base-thrives', tradeoffs: ['base-t1', 'base-t2'] },
  anchors: { transit: [], parks: [], groceries: [] },
  heroImage: '',
};

const passage: Passage = {
  archetypeId: 'a', neighborhoodId: 'park-slope',
  fitProse: 'archetype-fit', tradeoffsForYou: ['arch-t1'],
  reviewedAt: '2026-05-06', reviewedBy: 'mp',
};

describe('resolveCardProse', () => {
  it('uses passage prose when present', () => {
    const r = resolveCardProse(baseN, passage);
    expect(r.fitProse).toBe('archetype-fit');
    expect(r.tradeoffs).toEqual(['arch-t1']);
    expect(r.source).toBe('passage');
  });
  it('falls back to base when passage absent', () => {
    const r = resolveCardProse(baseN, undefined);
    expect(r.fitProse).toBe('base-fit');
    expect(r.source).toBe('base');
  });
  it('whoThrivesHere always from neighborhood base', () => {
    expect(resolveCardProse(baseN, passage).whoThrivesHere).toBe('base-thrives');
    expect(resolveCardProse(baseN, undefined).whoThrivesHere).toBe('base-thrives');
  });
});
