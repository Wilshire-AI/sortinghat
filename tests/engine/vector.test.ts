import { describe, it, expect } from 'vitest';
import {
  encodeFingerprint,
  decodeFingerprint,
  clampVector,
  zeroVector,
} from '@/lib/engine/vector';
import type { Dimension } from '@content/types';

const fakeDims: Dimension[] = [
  { id: 'a', name: 'A', description: 'a description that is long enough', poles: { low: 'low-a', high: 'high-a' } },
  { id: 'b', name: 'B', description: 'b description that is long enough', poles: { low: 'low-b', high: 'high-b' } },
];

describe('zeroVector', () => {
  it('returns 0 for every dimension', () => {
    const v = zeroVector(fakeDims);
    for (const d of fakeDims) expect(v[d.id]).toBe(0);
  });
});

describe('clampVector', () => {
  it('clamps values into [-1, 1]', () => {
    const v = { a: 1.5, b: -2 };
    const c = clampVector(v);
    expect(c.a).toBe(1);
    expect(c.b).toBe(-1);
  });
  it('passes values inside [-1, 1] through unchanged', () => {
    expect(clampVector({ a: 0.3 }).a).toBeCloseTo(0.3);
  });
});

describe('encodeFingerprint / decodeFingerprint', () => {
  it('round-trips a vector', () => {
    const v = { a: 0.42, b: -0.7 };
    const encoded = encodeFingerprint(v, 'cv-test');
    const decoded = decodeFingerprint(encoded);
    expect(decoded.contentVersion).toBe('cv-test');
    expect(decoded.vector.a).toBeCloseTo(0.42, 3);
    expect(decoded.vector.b).toBeCloseTo(-0.7, 3);
  });

  it('produces URL-safe output (no +, /, =)', () => {
    const encoded = encodeFingerprint({ a: 0 }, 'cv');
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('rejects malformed input', () => {
    expect(() => decodeFingerprint('YWFh')).toThrow(); // valid base64, wrong shape
  });
});
