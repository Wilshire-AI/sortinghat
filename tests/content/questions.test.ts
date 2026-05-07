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
  it('every dimension touched by at least 1 question', () => {
    const touched = new Set<string>();
    for (const q of questions) {
      if (q.kind === 'forced_choice') {
        for (const c of q.choices) for (const k of Object.keys(c.impacts)) touched.add(k);
      } else {
        touched.add(q.dimensionId);
      }
    }
    for (const d of dimensions) expect(touched.has(d.id), `dim ${d.id} not touched`).toBe(true);
  });
});
