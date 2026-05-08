import { describe, it, expect } from 'vitest';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { neighborhoods } from '@content/neighborhoods';
import { CONTENT_VERSION } from '@content/types';
import { runMonteCarlo, type MonteCarloResult } from './simulate';

const SAMPLES = 5000;
const SEED = 42;
const FIXTURE_PATH = join(__dirname, '..', 'fixtures', 'monte-carlo-baseline.json');

// The baseline fixture was captured pre-Step-3 (before place-tier was Q1).
// This test asserts that the current engine's distribution still represents
// a sensible delta from that historical baseline — not strict equality.
// Step 9 of the strategic execution plan will tighten these criteria.
//
// MC_WRITE_BASELINE=1 overrides the comparison and re-captures the fixture
// (only do this when intentionally resetting the historical reference).
// SKIPPED: this regression compares against the pre-Step-3 Euclidean baseline,
// which is meaningless under the Bayesian engine. Commit 4 of the Bayesian
// migration (per .polaris/bayesian-engine-design.md) rebaselines this fixture
// and rewrites the criteria around new Bayesian goals (Crown Heights < 10%,
// UWS > 1.5%, no nbhd > 12%, all 121 reachable).
describe.skip('Monte Carlo regression vs pre-Step-3 baseline (skipped pending Bayesian rebaseline)', () => {
  const result = runMonteCarlo({
    samples: SAMPLES,
    seed: SEED,
    questions,
    dimensions,
    neighborhoods,
    contentVersion: CONTENT_VERSION,
  });

  if (process.env.MC_WRITE_BASELINE === '1') {
    it('writes a fresh baseline fixture', () => {
      writeFileSync(FIXTURE_PATH, JSON.stringify(result, null, 2) + '\n');
      const totalTallies = Object.values(result.perNeighborhoodTopOne).reduce((a, b) => a + b, 0);
      expect(totalTallies).toBe(SAMPLES);
    });
    return;
  }

  if (!existsSync(FIXTURE_PATH)) {
    throw new Error(`No baseline at ${FIXTURE_PATH}. Run with MC_WRITE_BASELINE=1.`);
  }
  const baseline = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as MonteCarloResult;

  it('Manhattan #1 share drops by 3-10 percentage points (place-tier effect)', () => {
    const baseManhattan = (baseline.perBoroughTopOne['manhattan'] ?? 0) / SAMPLES;
    const currentManhattan = (result.perBoroughTopOne['manhattan'] ?? 0) / SAMPLES;
    const deltaPP = (currentManhattan - baseManhattan) * 100;
    expect(deltaPP).toBeLessThanOrEqual(-3);
    expect(deltaPP).toBeGreaterThanOrEqual(-10);
  });

  it('top-5 borough diversity does not regress', () => {
    expect(result.averageDistinctBoroughsTop5).toBeGreaterThanOrEqual(
      baseline.averageDistinctBoroughsTop5 - 0.05,
    );
  });

  it('neighborhood coverage does not collapse', () => {
    const beforeCount = Object.keys(baseline.perNeighborhoodTopOne).length;
    const afterCount = Object.keys(result.perNeighborhoodTopOne).length;
    // Allow slight drift in either direction; alarm only on a real collapse.
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount - 5);
  });

  it('losses concentrate in the deliberately-redistributed Manhattan-core cluster', () => {
    // Step-3's place-tier redistributes weight away from the Manhattan-core
    // cluster. This is intended. The criterion is that any neighborhood
    // losing >30% relative share belongs to that cluster, not to a borough
    // we didn't intend to touch.
    const MANHATTAN_REDISTRIBUTED = new Set<string>([
      'nolita-little-italy', 'west-village', 'upper-west-side', 'fort-greene',
      'upper-east-side', 'lincoln-square', 'soho', 'tribeca', 'noho',
      'gramercy', 'chelsea', 'flatiron', 'east-village', 'lower-east-side',
      'midtown-east', 'midtown-west', 'turtle-bay', 'murray-hill',
      'kips-bay', 'yorkville', 'carnegie-hill', 'hells-kitchen',
      'manhattan-valley', 'morningside-heights',
    ]);
    const losers: string[] = [];
    for (const [id, before] of Object.entries(baseline.perNeighborhoodTopOne)) {
      if (before < 20) continue;
      const after = result.perNeighborhoodTopOne[id] ?? 0;
      if (after < before * 0.7 && !MANHATTAN_REDISTRIBUTED.has(id)) {
        losers.push(`${id}: ${before} → ${after}`);
      }
    }
    expect(losers, 'unexpected non-Manhattan-core losses').toEqual([]);
  });
});
