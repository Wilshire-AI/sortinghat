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
        expect(validDimIds.has(q.dimensionId)).toBe(true);
      }
    }
  });
  it('transit-redundancy is questions[0] (concrete behavior, instant opener)', () => {
    expect(questions[0].id).toBe('transit-redundancy');
  });

  it('place-tier is reachable and has 6 choices including a zero-impact unsure option', () => {
    const q = questions.find((x) => x.id === 'place-tier');
    if (!q) throw new Error('place-tier missing from questions');
    if (q.kind !== 'forced_choice') throw new Error('place-tier must be forced_choice');
    expect(q.choices).toHaveLength(6);
    const last = q.choices[q.choices.length - 1];
    expect(Object.keys(last.impacts)).toHaveLength(0);
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
        touched.add(q.dimensionId);
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
