import { describe, it, expect } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { rankNeighborhoods } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answers } from '@/components/quiz/useQuizState';

// Hand-built personas validating the amenity-function axis split. Each
// persona expresses a vector signature the spec calls out (see
// .polaris/amenity-tier-axis-2026-05-09.md lines 188-198). The hard gate
// is the function-over-form persona: it must surface real-deal food
// places and must NOT surface polished/wealthy ones.

function rankFor(answers: Answers) {
  const derived = deriveState(dimensions, questions, answers);
  return rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
    topN: neighborhoods.length,
    selectedTags: derived.selectedTags,
    mustHaves: derived.mustHaves,
    commuteTargets: derived.commuteTargets,
    commuteToleranceMinutes: derived.commuteToleranceMinutes,
    housingAcceptance: derived.housingAcceptance,
    touchedDims: derived.touchedDims,
  });
}

function top15ids(answers: Answers): string[] {
  return rankFor(answers).slice(0, 15).map((r) => r.neighborhood.id);
}

describe('amenity-function persona panel', () => {
  it('Williamsburg-shape: walkable casual + premium-but-not-prestige', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['walkable-city', 'transit-hub'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 1 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 1 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: [] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['cafes', 'parks-water'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['lively-retail', 'waterfront', 'real-park'],
      },
      'cultural-communities': { kind: 'multi_select', selectedValues: [] },
      'safety-need': { kind: 'slider', value: 1 },
      'school-need': { kind: 'slider', value: -1 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['commercial'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 2 },
      'lifecycle-stage-fit': { kind: 'slider', value: 0 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 2 },
      'must-haves': { kind: 'multi_select', selectedValues: [] },
    };
    const top15 = top15ids(answers);
    const expected = ['williamsburg', 'greenpoint', 'dumbo', 'park-slope', 'cobble-hill'];
    const hits = expected.filter((id) => top15.includes(id));
    expect(
      hits.length,
      `expected >=3 of [${expected.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('UES-shape: walkable polished established premium', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['walkable-city', 'transit-hub'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 1 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 1 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: [] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['errands', 'gym'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['leafy-residential', 'real-park'],
      },
      'cultural-communities': { kind: 'multi_select', selectedValues: [] },
      'safety-need': { kind: 'slider', value: 1 },
      'school-need': { kind: 'slider', value: 0.5 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['established-traditional', 'commercial', 'quiet'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 0 },
      'lifecycle-stage-fit': { kind: 'slider', value: 1 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 1 },
      'must-haves': { kind: 'multi_select', selectedValues: [] },
    };
    const top15 = top15ids(answers);
    const expected = ['upper-east-side', 'carnegie-hill', 'upper-west-side', 'brooklyn-heights', 'lincoln-square'];
    const hits = expected.filter((id) => top15.includes(id));
    expect(
      hits.length,
      `expected >=3 of [${expected.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('Bushwick-shape: walkable casual creative + basic-amenity tolerant', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['transit-hub', 'walkable-city'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 2 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 2 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: [] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['cafes', 'bars-nightlife'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['arts-scene', 'industrial-loft'],
      },
      'cultural-communities': { kind: 'multi_select', selectedValues: [] },
      'safety-need': { kind: 'slider', value: 0 },
      'school-need': { kind: 'slider', value: -1 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['creative-scene', 'diverse'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 1 },
      'lifecycle-stage-fit': { kind: 'slider', value: -0.5 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 2 },
      'must-haves': { kind: 'multi_select', selectedValues: [] },
    };
    const top15 = top15ids(answers);
    const expected = ['bushwick', 'east-williamsburg', 'ridgewood', 'mott-haven'];
    const hits = expected.filter((id) => top15.includes(id));
    expect(
      hits.length,
      `expected >=2 of [${expected.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(2);
  });

  it('Bay Ridge-shape: quiet-city traditional family basic-medium amenities', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['quiet-city', 'walkable-suburb'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 2 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 0 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: [] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['errands', 'family-infra'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['leafy-residential', 'real-park', 'suburban-streets'],
      },
      'cultural-communities': { kind: 'multi_select', selectedValues: [] },
      'safety-need': { kind: 'slider', value: 1 },
      'school-need': { kind: 'slider', value: 0.5 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['family', 'quiet'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 0 },
      'lifecycle-stage-fit': { kind: 'slider', value: 0.5 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 0 },
      'must-haves': { kind: 'multi_select', selectedValues: [] },
    };
    const top15 = top15ids(answers);
    const expected = ['bay-ridge', 'forest-hills', 'sunnyside', 'astoria'];
    const hits = expected.filter((id) => top15.includes(id));
    expect(
      hits.length,
      `expected >=2 of [${expected.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(2);
  });

  it('Greenwich-shape: larger-lot polished established + top-schools must-have', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['larger-lot-suburb'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 3 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 0 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: ['house-townhouse'] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['family-infra'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['suburban-streets', 'leafy-residential', 'small-downtown'],
      },
      'cultural-communities': { kind: 'multi_select', selectedValues: [] },
      'safety-need': { kind: 'slider', value: 1 },
      'school-need': { kind: 'slider', value: 1 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['established-traditional', 'refined-contemporary'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 0 },
      'lifecycle-stage-fit': { kind: 'slider', value: 1 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 0 },
      'must-haves': { kind: 'multi_select', selectedValues: ['top-schools'] },
    };
    const top15 = top15ids(answers);
    const expected = ['greenwich', 'westport', 'manhasset', 'darien', 'scarsdale'];
    const hits = expected.filter((id) => top15.includes(id));
    expect(
      hits.length,
      `expected >=3 of [${expected.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('Park Slope-shape: walkable refined-casual premium mid-high prestige family', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['walkable-city', 'walkable-suburb'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 1 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 0 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: [] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['family-infra'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['leafy-residential', 'real-park', 'small-downtown'],
      },
      'cultural-communities': { kind: 'multi_select', selectedValues: [] },
      'safety-need': { kind: 'slider', value: 1 },
      'school-need': { kind: 'slider', value: 0.5 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['family', 'commercial'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 0 },
      'lifecycle-stage-fit': { kind: 'slider', value: 0.5 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 0 },
      'must-haves': { kind: 'multi_select', selectedValues: [] },
    };
    const top15 = top15ids(answers);
    const expected = ['park-slope', 'cobble-hill', 'prospect-heights', 'brooklyn-heights'];
    const hits = expected.filter((id) => top15.includes(id));
    expect(
      hits.length,
      `expected >=3 of [${expected.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('Function-over-form persona surfaces real-deal food places, NOT polished/wealthy', () => {
    const answers: Answers = {
      'place-archetype': { kind: 'multi_select', selectedValues: ['walkable-city', 'transit-hub'] },
      'commute-target': { kind: 'multi_select', selectedValues: [] },
      'commute-tolerance': { kind: 'forced_choice', choiceIndex: 2 },
      'family-horizon': { kind: 'forced_choice', choiceIndex: 1 },
      'housing-acceptance': { kind: 'multi_select', selectedValues: [] },
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['errands', 'cafes'],
      },
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['lively-retail', 'industrial-loft'],
      },
      'cultural-communities': {
        kind: 'multi_select',
        selectedValues: ['east-asian', 'latin-american', 'caribbean'],
      },
      'safety-need': { kind: 'slider', value: 0.5 },
      'school-need': { kind: 'slider', value: -1 },
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['diverse', 'commercial'],
      },
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 2 },
      'lifecycle-stage-fit': { kind: 'slider', value: -0.5 },
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 0 },
      'must-haves': { kind: 'multi_select', selectedValues: [] },
    };
    const top15 = top15ids(answers);
    const goodList = [
      'flushing', 'jackson-heights', 'sunset-park', 'elmhurst', 'astoria',
      'east-harlem', 'central-harlem', 'bay-ridge', 'sunnyside', 'crown-heights',
      'williamsburg', 'bed-stuy', 'woodside',
    ];
    const badList = ['upper-west-side', 'hudson-yards', 'scarsdale', 'greenwich'];
    const hits = goodList.filter((id) => top15.includes(id));
    const banned = badList.filter((id) => top15.includes(id));
    expect(
      banned,
      `function-over-form persona should not surface polished/wealthy places. banned=[${banned.join(',')}] in top15=[${top15.join(',')}]`,
    ).toEqual([]);
    expect(
      hits.length,
      `expected >=6 of [${goodList.join(',')}] in top15. top15=[${top15.join(',')}] hits=[${hits.join(',')}]`,
    ).toBeGreaterThanOrEqual(6);
  });
});
