import { describe, it, expect } from 'vitest';
import { dimensions } from '@content/dimensions';

describe('dimensions', () => {
  it('has 9 dimensions', () => {
    expect(dimensions).toHaveLength(9);
  });
  it('all ids unique kebab-case', () => {
    const ids = dimensions.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });
  it('each has poles + substantive description', () => {
    for (const d of dimensions) {
      expect(d.poles.low.length).toBeGreaterThan(5);
      expect(d.poles.high.length).toBeGreaterThan(5);
      expect(d.description.length).toBeGreaterThan(50);
    }
  });
});
