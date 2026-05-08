import { describe, it, expect } from 'vitest';
import { deriveState, type Answers } from '@/lib/engine/derive';
import type { Dimension, Question } from '@content/types';

const dims: Dimension[] = [
  { id: 'urban', name: 'Urban', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'symmetric' },
  { id: 'family', name: 'Family', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'asymmetric_need' },
  { id: 'safety', name: 'Safety', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'asymmetric_need' },
  { id: 'culture', name: 'Culture', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'asymmetric_need' },
];

const fcWithImpacts: Question = {
  id: 'q-fc',
  kind: 'forced_choice',
  prompt: 'pick',
  choices: [
    { label: 'a', impacts: { urban: 0.5, family: 0.3 } },
    { label: 'b', impacts: { urban: -0.5 } },
    { label: 'unsure', impacts: {} },
    { label: 'neutral-explicit', impacts: { urban: 0 } },
  ],
};

const sliderQ: Question = {
  id: 'q-slide',
  kind: 'slider',
  prompt: 'how much',
  lowLabel: 'low',
  highLabel: 'high',
  dimensionId: 'safety',
};

const multiPerOption: Question = {
  id: 'q-multi',
  kind: 'multi_select',
  purpose: 'walkable_amenities',
  prompt: 'pick all',
  options: [
    { value: 'park', label: 'park', impacts: { urban: 0.2 } },
    { value: 'cafe', label: 'cafe', impacts: { culture: 0.3 } },
    { value: 'untouched', label: 'untouched' },
  ],
};

const multiPerSelection: Question = {
  id: 'q-tags',
  kind: 'multi_select',
  purpose: 'cultural_tags',
  prompt: 'tags',
  options: [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ],
  dimensionImpactPerSelection: { culture: 0.1 },
};

const mustHavesQ: Question = {
  id: 'q-mh',
  kind: 'multi_select',
  purpose: 'must_haves',
  prompt: 'mh',
  options: [{ value: 'top-schools', label: 'schools' }],
};

describe('deriveState — touchedDims tracking', () => {
  it('forced_choice with non-empty impacts marks those dims', () => {
    const answers: Answers = { 'q-fc': { kind: 'forced_choice', choiceIndex: 0 } };
    const out = deriveState(dims, [fcWithImpacts], answers);
    expect(out.touchedDims.has('urban')).toBe(true);
    expect(out.touchedDims.has('family')).toBe(true);
    expect(out.touchedDims.has('safety')).toBe(false);
  });

  it('forced_choice with empty impacts (place-tier "unsure") touches no dims', () => {
    const answers: Answers = { 'q-fc': { kind: 'forced_choice', choiceIndex: 2 } };
    const out = deriveState(dims, [fcWithImpacts], answers);
    expect(out.touchedDims.size).toBe(0);
  });

  it('forced_choice with explicit impact:0 still marks the dim as touched', () => {
    const answers: Answers = { 'q-fc': { kind: 'forced_choice', choiceIndex: 3 } };
    const out = deriveState(dims, [fcWithImpacts], answers);
    expect(out.touchedDims.has('urban')).toBe(true);
  });

  it('slider answer marks the dim even at value=0', () => {
    const answers: Answers = { 'q-slide': { kind: 'slider', value: 0 } };
    const out = deriveState(dims, [sliderQ], answers);
    expect(out.touchedDims.has('safety')).toBe(true);
  });

  it('multi_select with per-option impacts touches the union of selected options', () => {
    const answers: Answers = { 'q-multi': { kind: 'multi_select', selectedValues: ['park', 'cafe'] } };
    const out = deriveState(dims, [multiPerOption], answers);
    expect(out.touchedDims.has('urban')).toBe(true);
    expect(out.touchedDims.has('culture')).toBe(true);
    expect(out.touchedDims.has('family')).toBe(false);
  });

  it('multi_select with empty selection touches no dims', () => {
    const answers: Answers = { 'q-multi': { kind: 'multi_select', selectedValues: [] } };
    const out = deriveState(dims, [multiPerOption], answers);
    expect(out.touchedDims.size).toBe(0);
  });

  it('multi_select with selecting only an option that has no impacts touches no dims', () => {
    const answers: Answers = { 'q-multi': { kind: 'multi_select', selectedValues: ['untouched'] } };
    const out = deriveState(dims, [multiPerOption], answers);
    expect(out.touchedDims.size).toBe(0);
  });

  it('multi_select with dimensionImpactPerSelection touches dims when selections present', () => {
    const answers: Answers = { 'q-tags': { kind: 'multi_select', selectedValues: ['a', 'b'] } };
    const out = deriveState(dims, [multiPerSelection], answers);
    expect(out.touchedDims.has('culture')).toBe(true);
  });

  it('multi_select with dimensionImpactPerSelection but empty selections touches NO dims', () => {
    const answers: Answers = { 'q-tags': { kind: 'multi_select', selectedValues: [] } };
    const out = deriveState(dims, [multiPerSelection], answers);
    expect(out.touchedDims.size).toBe(0);
  });

  it('must-haves multi-select touches no dims (orthogonal)', () => {
    const answers: Answers = { 'q-mh': { kind: 'multi_select', selectedValues: ['top-schools'] } };
    const out = deriveState(dims, [mustHavesQ], answers);
    expect(out.touchedDims.size).toBe(0);
    expect(out.mustHaves).toEqual(['top-schools']);
  });

  it('unanswered question contributes nothing to touched set', () => {
    const out = deriveState(dims, [fcWithImpacts, sliderQ], {});
    expect(out.touchedDims.size).toBe(0);
  });

  it('multiple answered questions union their touched dims', () => {
    const answers: Answers = {
      'q-fc': { kind: 'forced_choice', choiceIndex: 0 },
      'q-slide': { kind: 'slider', value: 0.5 },
      'q-multi': { kind: 'multi_select', selectedValues: ['cafe'] },
    };
    const out = deriveState(dims, [fcWithImpacts, sliderQ, multiPerOption], answers);
    expect(out.touchedDims.has('urban')).toBe(true);
    expect(out.touchedDims.has('family')).toBe(true);
    expect(out.touchedDims.has('safety')).toBe(true);
    expect(out.touchedDims.has('culture')).toBe(true);
  });
});

describe('deriveState — vector behavior unchanged', () => {
  // Sanity check that adding touchedDims didn't drift the existing math.
  it('forced_choice impacts still sum into vector', () => {
    const answers: Answers = { 'q-fc': { kind: 'forced_choice', choiceIndex: 0 } };
    const out = deriveState(dims, [fcWithImpacts], answers);
    expect(out.vector['urban']).toBeCloseTo(0.5);
    expect(out.vector['family']).toBeCloseTo(0.3);
  });

  it('slider sets dim value', () => {
    const answers: Answers = { 'q-slide': { kind: 'slider', value: 0.5 } };
    const out = deriveState(dims, [sliderQ], answers);
    expect(out.vector['safety']).toBe(0.5);
  });

  it('per-option multi-select impacts sum across selections', () => {
    const answers: Answers = { 'q-multi': { kind: 'multi_select', selectedValues: ['park', 'cafe'] } };
    const out = deriveState(dims, [multiPerOption], answers);
    expect(out.vector['urban']).toBeCloseTo(0.2);
    expect(out.vector['culture']).toBeCloseTo(0.3);
  });
});
