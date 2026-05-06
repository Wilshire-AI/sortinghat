import type { Dimension, UserVector, DimensionId } from '@content/types';

export function zeroVector(dimensions: readonly Dimension[]): UserVector {
  const v: UserVector = {};
  for (const d of dimensions) v[d.id] = 0;
  return v;
}

export function clampVector(v: UserVector): UserVector {
  const out: UserVector = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = Math.max(-1, Math.min(1, val));
  }
  return out;
}

type EncodedPayload = {
  v: Record<string, number>;
  cv: string;
  t?: string[]; // selected cultural tags (optional, omitted when empty)
};

function toBase64Url(input: string): string {
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(input, 'utf8').toString('base64')
    : btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  return decodeURIComponent(escape(atob(padded)));
}

export type Fingerprint = {
  vector: UserVector;
  contentVersion: string;
  selectedTags: string[];
};

export function encodeFingerprint(
  vector: UserVector,
  contentVersion: string,
  selectedTags: string[] = [],
): string {
  const payload: EncodedPayload = {
    v: Object.fromEntries(
      Object.entries(vector).map(([k, val]) => [k, Math.round(val * 1000) / 1000]),
    ),
    cv: contentVersion,
  };
  if (selectedTags.length > 0) payload.t = selectedTags;
  return toBase64Url(JSON.stringify(payload));
}

export function decodeFingerprint(encoded: string): Fingerprint {
  let json: string;
  try {
    json = fromBase64Url(encoded);
  } catch {
    throw new Error('Invalid fingerprint encoding');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid fingerprint payload');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('v' in parsed) ||
    !('cv' in parsed) ||
    typeof (parsed as Record<string, unknown>).cv !== 'string'
  ) {
    throw new Error('Malformed fingerprint payload');
  }
  const v = (parsed as { v: Record<string, unknown>; cv: string; t?: unknown }).v;
  const cv = (parsed as { v: Record<string, unknown>; cv: string; t?: unknown }).cv;
  const t = (parsed as { v: Record<string, unknown>; cv: string; t?: unknown }).t;
  const vector: UserVector = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Invalid value for dimension ${k}`);
    }
    vector[k as DimensionId] = val;
  }
  let selectedTags: string[] = [];
  if (Array.isArray(t)) {
    selectedTags = t.filter((x): x is string => typeof x === 'string');
  }
  return { vector, contentVersion: cv, selectedTags };
}
