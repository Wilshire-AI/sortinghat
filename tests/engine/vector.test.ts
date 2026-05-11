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

  it('round-trips culturalImportance when set', () => {
    const encoded = encodeFingerprint({
      vector: { a: 0.5 },
      contentVersion: 'cv-test',
      culturalImportance: 3,
    });
    const decoded = decodeFingerprint(encoded);
    expect(decoded.culturalImportance).toBe(3);
  });

  it('omits ci field from payload when culturalImportance is the default (2)', () => {
    const encoded = encodeFingerprint({
      vector: { a: 0.5 },
      contentVersion: 'cv-test',
      culturalImportance: 2,
    });
    // Decode the payload to inspect its shape; absent `ci` keeps URLs short
    // for the default-behavior case (which is most users pre-feature).
    const payload = JSON.parse(
      Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );
    expect(payload.ci).toBeUndefined();
  });

  it('legacy fingerprint without ci decodes to culturalImportance = 2', () => {
    // Pre-feature fingerprint: no ci field at all.
    const encoded = encodeFingerprint({ vector: { a: 0.5 }, contentVersion: 'cv-test' });
    const decoded = decodeFingerprint(encoded);
    expect(decoded.culturalImportance).toBe(2);
  });

  it('clamps out-of-range ci values to the default', () => {
    // Manually craft a malformed payload to confirm guard.
    const payload = JSON.stringify({ v: { a: 0 }, cv: 'cv', ci: 99 });
    const encoded = Buffer.from(payload, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const decoded = decodeFingerprint(encoded);
    expect(decoded.culturalImportance).toBe(2);
  });
});
