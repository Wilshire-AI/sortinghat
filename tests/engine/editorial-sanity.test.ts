import { describe, it, expect } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { neighborhoodPopulations } from '@content/neighborhood-populations';
import { rankNeighborhoods } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answers } from '@/components/quiz/useQuizState';
import personasJson from '@content/neighborhood-personas.json';

// Editorial sanity panel. Each test takes a regenerated persona for a named
// neighborhood and asserts the engine surfaces it within a generous top-N.
// Distinct from per-neighborhood-personas.test.ts (which checks every nbhd
// against a 95% top-15 floor) — this one names the *expected* outcome for
// landmark neighborhoods that should clearly be reachable. If editorial
// drift makes (e.g.) a Park Slope persona stop reaching Park Slope, this
// is the test that surfaces that.

type PersonaEntry = { description: string | null; answers: Answers };
const personas = personasJson as Record<string, PersonaEntry>;

function rankPersona(targetId: string) {
  const entry = personas[targetId];
  if (!entry) throw new Error(`No persona for ${targetId}`);
  const derived = deriveState(dimensions, questions, entry.answers);
  const ranked = rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
    topN: neighborhoods.length,
    selectedTags: derived.selectedTags,
    softPrefs: derived.softPrefs,
    populationsByNeighborhood: neighborhoodPopulations,
    touchedDims: derived.touchedDims,
  });
  return {
    rank: ranked.findIndex((r) => r.neighborhood.id === targetId) + 1,
    topNames: ranked.slice(0, 3).map((r) => r.neighborhood.name),
  };
}

describe('Editorial sanity — landmark personas reach their targets', () => {
  // Tight expectations for high-population, character-strong neighborhoods.
  // These are the editorial flagships — if they don't reach top 5 for their
  // own persona, something structural is wrong.
  it.each([
    ['upper-west-side', 5],
    ['upper-east-side', 5],
    ['williamsburg', 5],
    ['park-slope', 5],
    ['astoria', 5],
    ['west-village', 10],
    ['tribeca', 10],
  ])('%s persona reaches top %i', (id, k) => {
    const { rank, topNames } = rankPersona(id);
    expect(rank, `${id} ranked ${rank}; top: ${topNames.join(', ')}`).toBeGreaterThan(0);
    expect(rank, `${id} ranked ${rank}; top: ${topNames.join(', ')}`).toBeLessThanOrEqual(k);
  });

  // Much looser expectations for tiny-population suburbs. Under Bayesian,
  // these places have narrow σ and small priors. The regen's greedy can't
  // always produce a user-vector tight enough to overcome larger competitors'
  // wider basins. In practice, tiny-pop nbhds surface in two correct ways:
  // (a) a user with a quiz answer set MORE specific than any greedy persona
  // (rare in synthetic samples), or (b) a user with explicit commute /
  // must-have alignment that filters out the bigger competitors. The asserted
  // ranks below reflect the engine's structural ceiling for greedy personas
  // alone — anything tighter would mean small places dominate, which is
  // exactly the Crown-Heights problem in the other direction.
  it.each([
    ['scarsdale', 25],
    ['bronxville', 60],
    ['mamaroneck', 35], // 'larchmont' was merged into 'mamaroneck' (Larchmont/Mamaroneck combined)
    ['chappaqua', 100],
    ['battery-park-city', 90],
  ])('%s persona reaches top %i', (id, k) => {
    const { rank, topNames } = rankPersona(id);
    expect(rank, `${id} ranked ${rank}; top: ${topNames.join(', ')}`).toBeGreaterThan(0);
    expect(rank, `${id} ranked ${rank}; top: ${topNames.join(', ')}`).toBeLessThanOrEqual(k);
  });
});
