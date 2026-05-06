import { describe, it, expect } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';

describe('neighborhoods', () => {
  it('has at least 30 neighborhoods', () => {
    expect(neighborhoods.length).toBeGreaterThanOrEqual(30);
  });
  it('all ids and slugs unique kebab-case', () => {
    const ids = neighborhoods.map((n) => n.id);
    const slugs = neighborhoods.map((n) => n.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
  });
  it('every neighborhood scored on every dimension in [-1, 1]', () => {
    for (const n of neighborhoods) {
      for (const d of dimensions) {
        expect(typeof n.scores[d.id]).toBe('number');
        expect(n.scores[d.id]).toBeGreaterThanOrEqual(-1);
        expect(n.scores[d.id]).toBeLessThanOrEqual(1);
      }
    }
  });
  it('every neighborhood has substantive base passages', () => {
    for (const n of neighborhoods) {
      expect(n.basePassages.whyItFits.length).toBeGreaterThan(80);
      expect(n.basePassages.whoThrivesHere.length).toBeGreaterThan(20);
      expect(n.basePassages.tradeoffs.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('covers all 6 boroughs', () => {
    const boroughs = new Set(neighborhoods.map((n) => n.borough));
    expect(boroughs.has('manhattan')).toBe(true);
    expect(boroughs.has('brooklyn')).toBe(true);
    expect(boroughs.has('queens')).toBe(true);
    expect(boroughs.has('bronx')).toBe(true);
    expect(boroughs.has('staten-island')).toBe(true);
    expect(boroughs.has('nj')).toBe(true);
  });
});
