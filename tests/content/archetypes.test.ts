import { describe, it, expect } from 'vitest';
import { archetypes } from '@content/archetypes';
import { dimensions } from '@content/dimensions';

describe('archetypes', () => {
  it('has 8 archetypes', () => {
    expect(archetypes).toHaveLength(8);
  });
  it('all ids unique kebab-case', () => {
    const ids = archetypes.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });
  it('every archetype scores every dimension in [-1, 1]', () => {
    for (const a of archetypes) {
      for (const d of dimensions) {
        expect(typeof a.vector[d.id]).toBe('number');
        expect(a.vector[d.id]).toBeGreaterThanOrEqual(-1);
        expect(a.vector[d.id]).toBeLessThanOrEqual(1);
      }
    }
  });
  it('every archetype has substantive identity prose', () => {
    for (const a of archetypes) expect(a.identity.length).toBeGreaterThan(80);
  });
  it('each dimension has at least one high-scoring archetype', () => {
    for (const d of dimensions) {
      const max = Math.max(...archetypes.map((a) => a.vector[d.id] ?? 0));
      expect(max, `no archetype scores >0.5 on ${d.id}`).toBeGreaterThan(0.5);
    }
  });
});
