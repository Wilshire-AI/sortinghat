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
  m?: string[]; // must-have filter keys (optional, omitted when empty)
  ct?: string[]; // commute targets (office cluster ids) (optional)
  ctm?: number; // commute tolerance in minutes (optional)
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
  mustHaves: string[];
  commuteTargets: string[];
  commuteToleranceMinutes: number;
};

export type FingerprintInput = {
  vector: UserVector;
  contentVersion: string;
  selectedTags?: string[];
  mustHaves?: string[];
  commuteTargets?: string[];
  commuteToleranceMinutes?: number;
};

export function encodeFingerprint(input: FingerprintInput): string;
// Legacy positional signature retained for backwards compatibility with
// existing callers that pass (vector, contentVersion, tags, mustHaves).
export function encodeFingerprint(
  vector: UserVector,
  contentVersion: string,
  selectedTags?: string[],
  mustHaves?: string[],
): string;
export function encodeFingerprint(
  arg1: UserVector | FingerprintInput,
  contentVersion?: string,
  selectedTags: string[] = [],
  mustHaves: string[] = [],
): string {
  const isInput = (a: UserVector | FingerprintInput): a is FingerprintInput =>
    typeof (a as FingerprintInput).contentVersion === 'string' &&
    typeof (a as FingerprintInput).vector === 'object';
  const opts: FingerprintInput = isInput(arg1)
    ? arg1
    : { vector: arg1, contentVersion: contentVersion!, selectedTags, mustHaves };
  const payload: EncodedPayload = {
    v: Object.fromEntries(
      Object.entries(opts.vector).map(([k, val]) => [k, Math.round(val * 1000) / 1000]),
    ),
    cv: opts.contentVersion,
  };
  if (opts.selectedTags && opts.selectedTags.length > 0) payload.t = opts.selectedTags;
  if (opts.mustHaves && opts.mustHaves.length > 0) payload.m = opts.mustHaves;
  if (opts.commuteTargets && opts.commuteTargets.length > 0) payload.ct = opts.commuteTargets;
  if (opts.commuteToleranceMinutes && opts.commuteToleranceMinutes > 0) {
    payload.ctm = opts.commuteToleranceMinutes;
  }
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
  const obj = parsed as {
    v: Record<string, unknown>;
    cv: string;
    t?: unknown;
    m?: unknown;
    ct?: unknown;
    ctm?: unknown;
  };
  const vector: UserVector = {};
  for (const [k, val] of Object.entries(obj.v)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Invalid value for dimension ${k}`);
    }
    vector[k as DimensionId] = val;
  }
  const selectedTags: string[] = Array.isArray(obj.t)
    ? obj.t.filter((x): x is string => typeof x === 'string')
    : [];
  const mustHaves: string[] = Array.isArray(obj.m)
    ? obj.m.filter((x): x is string => typeof x === 'string')
    : [];
  const commuteTargets: string[] = Array.isArray(obj.ct)
    ? obj.ct.filter((x): x is string => typeof x === 'string')
    : [];
  const commuteToleranceMinutes: number =
    typeof obj.ctm === 'number' && Number.isFinite(obj.ctm) && obj.ctm > 0 ? obj.ctm : 0;
  return {
    vector,
    contentVersion: obj.cv,
    selectedTags,
    mustHaves,
    commuteTargets,
    commuteToleranceMinutes,
  };
}
