import { describe, it, expect } from 'vitest';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';

const validDimIds = new Set(dimensions.map((d) => d.id));

describe('questions', () => {
  it('has 12-22 questions', () => {
    expect(questions.length).toBeGreaterThanOrEqual(12);
    expect(questions.length).toBeLessThanOrEqual(22);
  });
  it('all ids unique', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('forced-choice impacts reference valid dimensions in [-1, 1]', () => {
    for (const q of questions) {
      if (q.kind === 'forced_choice') {
        for (const c of q.choices) {
          for (const [dimId, val] of Object.entries(c.impacts)) {
            expect(validDimIds.has(dimId)).toBe(true);
            expect(val).toBeGreaterThanOrEqual(-1);
            expect(val).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
  it('slider questions reference valid dimensions', () => {
    for (const q of questions) {
      if (q.kind === 'slider') {
        // Sliders are EITHER single-dim (legacy `dimensionId`) OR multi-dim
        // (new `impacts` map for semantic-differential spectrums). Exactly
        // one must be present; both must reference valid dim ids.
        const hasSingle = q.dimensionId !== undefined;
        const hasMulti = q.impacts !== undefined;
        expect(hasSingle || hasMulti, `slider ${q.id} must have dimensionId or impacts`).toBe(true);
        expect(hasSingle && hasMulti, `slider ${q.id} cannot have both`).toBe(false);
        if (q.dimensionId) expect(validDimIds.has(q.dimensionId)).toBe(true);
        if (q.impacts) {
          for (const [dimId, val] of Object.entries(q.impacts)) {
            expect(validDimIds.has(dimId)).toBe(true);
            expect(val).toBeGreaterThanOrEqual(-1);
            expect(val).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
  it('place-archetype is questions[0] (multi-select up to 3, replaces the old triple-Q archetype)', () => {
    expect(questions[0].id).toBe('place-archetype');
    const q = questions[0];
    if (q.kind !== 'multi_select') throw new Error('place-archetype must be multi_select');
    expect(q.purpose).toBe('place_archetype');
    expect(q.maxSelections).toBe(3);
  });

  it('place-archetype has 6 archetypes, each with non-empty impacts', () => {
    const q = questions[0];
    if (q.kind !== 'multi_select') throw new Error('must be multi_select');
    expect(q.options).toHaveLength(6);
    for (const o of q.options) {
      expect(o.impacts, `archetype "${o.label}" must have impacts`).toBeDefined();
      expect(Object.keys(o.impacts!).length).toBeGreaterThan(0);
    }
  });

  it('every dimension touched by at least 1 question (or explicitly inert)', () => {
    // Dimensions intentionally not queried by any question. The neighborhood
    // scores remain in the data model but contribute zero to ranking because
    // every user vector is 0 on these. Listed here so the test still catches
    // accidentally-orphaned dimensions.
    const intentionallyInert = new Set<string>([]);
    const touched = new Set<string>();
    for (const q of questions) {
      if (q.kind === 'forced_choice') {
        for (const c of q.choices) for (const k of Object.keys(c.impacts)) touched.add(k);
      } else if (q.kind === 'slider') {
        if (q.dimensionId) touched.add(q.dimensionId);
        if (q.impacts) for (const k of Object.keys(q.impacts)) touched.add(k);
      } else if (q.kind === 'multi_select') {
        for (const o of q.options) {
          if (o.impacts) for (const k of Object.keys(o.impacts)) touched.add(k);
        }
        if (q.dimensionImpactPerSelection) {
          for (const k of Object.keys(q.dimensionImpactPerSelection)) touched.add(k);
        }
      }
    }
    for (const d of dimensions) {
      if (intentionallyInert.has(d.id)) continue;
      expect(touched.has(d.id), `dim ${d.id} not touched`).toBe(true);
    }
  });
});
