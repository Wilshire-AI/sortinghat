import { describe, it } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { neighborhoodPopulations } from '@content/neighborhood-populations';
import { rankNeighborhoods } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answers } from '@/lib/engine/derive';

describe.skipIf(!process.env.WALK)('walkthrough rank dump', () => {
  it('dumps top 15 + bottom 5 for the current answer set', () => {
    const answers: Answers = {
      // Q1: place-archetype — walkable-city + quiet-city
      'place-archetype': {
        kind: 'multi_select',
        selectedValues: ['walkable-city', 'quiet-city'],
      },
      // Q2: commute-target — somewhere else (skips commute scoring)
      'commute-target': { kind: 'multi_select', selectedValues: ['other'] },
      // Q4: family-horizon — yes kids
      'family-horizon': { kind: 'forced_choice', choiceIndex: 0 },
      // Q5: housing-acceptance — open to most types except raw walkups
      'housing-acceptance': {
        kind: 'multi_select',
        selectedValues: ['prewar-renovated', 'newer-lowrise', 'luxury-highrise', 'house-townhouse'],
      },
      // Q6: walking-distance-amenities — grocery, gym, park
      'walking-distance-amenities': {
        kind: 'multi_select',
        selectedValues: ['errands', 'gym', 'parks-water'],
      },
      // Q7: walk-scenery — waterfront + leafy + lively-retail
      'walk-scenery': {
        kind: 'multi_select',
        selectedValues: ['waterfront', 'leafy-residential', 'lively-retail'],
      },
      // Q8: cultural-communities — east-asian
      'cultural-communities': {
        kind: 'multi_select',
        selectedValues: ['east-asian'],
      },
      // Q9: safety-need — strongly agree
      'safety-need': { kind: 'slider', value: 1.0 },
      // Q10: school-need — neutral
      'school-need': { kind: 'slider', value: 0 },
      // Q11: street-energy — quiet + family
      'street-energy': {
        kind: 'multi_select',
        selectedValues: ['quiet', 'family'],
      },
      // Q12: noise-tolerance — quiet block
      'noise-tolerance': { kind: 'forced_choice', choiceIndex: 0 },
      // Q13: aesthetic-register-fit — neutral
      'aesthetic-register-fit': { kind: 'slider', value: 0 },
      // Q14: lifecycle-stage-fit — neutral
      'lifecycle-stage-fit': { kind: 'slider', value: 0 },
      // Q15: rootedness-vs-access-fit — either
      'rootedness-vs-access-fit': { kind: 'forced_choice', choiceIndex: 2 },
      // (Q16 community-fabric-mode dropped from quiz)
    };

    const derived = deriveState(dimensions, questions, answers);
    const ranked = rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
      topN: neighborhoods.length,
      selectedTags: derived.selectedTags,
      mustHaves: [],
      commuteTargets: derived.commuteTargets,
      commuteToleranceMinutes: derived.commuteToleranceMinutes,
      softPrefs: derived.softPrefs,
      housingAcceptance: derived.housingAcceptance,
      populationsByNeighborhood: neighborhoodPopulations,
      touchedDims: derived.touchedDims,
    });

    console.log('\n=== TOP 15 ===');
    for (let i = 0; i < 15; i++) {
      const r = ranked[i];
      const pop = neighborhoodPopulations[r.neighborhood.id];
      console.log(`${(i + 1).toString().padStart(2)}. ${r.neighborhood.name.padEnd(30)} ${(r.score * 100).toFixed(1).padStart(5)}%  pop=${pop}`);
    }
    console.log('\n=== BOTTOM 5 ===');
    for (let i = ranked.length - 5; i < ranked.length; i++) {
      const r = ranked[i];
      const pop = neighborhoodPopulations[r.neighborhood.id];
      console.log(`${(i + 1).toString().padStart(2)}. ${r.neighborhood.name.padEnd(30)} ${(r.score * 100).toFixed(1).padStart(5)}%  pop=${pop}`);
    }
  });
});
