import { describe, it, expect } from 'vitest';
import { matchArchetype } from '@/lib/engine/archetype';
import type { Archetype } from '@content/types';

const dims = ['a', 'b'] as const;
const arch = (id: string, vec: Record<string, number>): Archetype => ({ id, name: id, identity: '', vector: vec });

describe('matchArchetype', () => {
  const list = [arch('calm', { a: -1, b: 0 }), arch('intense', { a: 1, b: 0 }), arch('balanced', { a: 0, b: 0 })];

  it('returns nearest', () => {
    expect(matchArchetype({ a: -0.9, b: 0.1 }, list, dims).id).toBe('calm');
  });
  it('exact match wins', () => {
    expect(matchArchetype({ a: 1, b: 0 }, list, dims).id).toBe('intense');
  });
  it('breaks ties alphabetically', () => {
    const ties = [arch('zebra', { a: 0, b: 0 }), arch('apple', { a: 0, b: 0 })];
    expect(matchArchetype({ a: 0.5, b: 0.5 }, ties, dims).id).toBe('apple');
  });
  it('throws on empty list', () => {
    expect(() => matchArchetype({ a: 0 }, [], dims)).toThrow();
  });
});
