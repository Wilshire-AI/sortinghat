import { describe, it, expect } from 'vitest';
import {
  MUST_HAVE_CONFLICTS,
  findActiveConflicts,
} from '@content/must-have-conflicts';

describe('MUST_HAVE_CONFLICTS', () => {
  it('every conflict has a non-empty editorial message', () => {
    for (const c of MUST_HAVE_CONFLICTS) {
      expect(c.message.length).toBeGreaterThan(40);
      expect(c.pair[0]).not.toBe(c.pair[1]);
    }
  });
  it('no duplicate pairs (in either direction)', () => {
    const seen = new Set<string>();
    for (const c of MUST_HAVE_CONFLICTS) {
      const key = [...c.pair].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe('findActiveConflicts', () => {
  it('returns empty when no must-haves selected', () => {
    expect(findActiveConflicts([])).toHaveLength(0);
  });
  it('returns empty when only one must-have selected', () => {
    expect(findActiveConflicts(['no-car'])).toHaveLength(0);
  });
  it('returns empty when selected pair is not a known conflict', () => {
    expect(findActiveConflicts(['walking-distance-park', 'subway-redundancy'])).toHaveLength(0);
  });
  it('returns the conflict when both pair members are selected', () => {
    const out = findActiveConflicts(['no-car', 'top-schools']);
    expect(out).toHaveLength(1);
    expect(out[0].pair).toEqual(['no-car', 'top-schools']);
  });
  it('returns multiple conflicts when several pairs are active', () => {
    const out = findActiveConflicts([
      'no-car',
      'top-schools',
      'luxury-highrise',
      'calm-blocks',
    ]);
    // expects at least: (no-car + top-schools), (luxury-highrise + calm-blocks)
    expect(out.length).toBeGreaterThanOrEqual(2);
  });
});
