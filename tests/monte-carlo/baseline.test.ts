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

// This file does two things depending on env:
// - MC_WRITE_BASELINE=1: run MC and (over)write the baseline fixture.
// - default: run MC and assert the result matches the stored baseline
//   exactly (deterministic seed). This catches accidental engine drift.
//
// Step 9 of the strategic execution plan replaces the simple equality
// check below with the merge-gate criteria (Manhattan #1 share drops
// 5-8pp; no neighborhood loses >30% relative #1 share).
describe('Monte Carlo baseline', () => {
  it('produces deterministic distribution', () => {
    const result = runMonteCarlo({
      samples: SAMPLES,
      seed: SEED,
      questions,
      dimensions,
      neighborhoods,
      contentVersion: CONTENT_VERSION,
    });

    if (process.env.MC_WRITE_BASELINE === '1') {
      writeFileSync(FIXTURE_PATH, JSON.stringify(result, null, 2) + '\n');
      // Sanity: at least every sample tallied, and Manhattan share is positive.
      const totalTallies = Object.values(result.perNeighborhoodTopOne).reduce((a, b) => a + b, 0);
      expect(totalTallies).toBe(SAMPLES);
      const manhattanShare = (result.perBoroughTopOne['manhattan'] ?? 0) / SAMPLES;
      expect(manhattanShare).toBeGreaterThan(0);
      return;
    }

    if (!existsSync(FIXTURE_PATH)) {
      throw new Error(
        `No baseline at ${FIXTURE_PATH}. Run with MC_WRITE_BASELINE=1 to capture.`,
      );
    }
    const baseline = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as MonteCarloResult;
    // Same seed + same content + same engine → exact match.
    // After Step 3 lands, this assertion will fail with the calibration
    // shift; replace with Step 9's regression criteria at that point.
    expect(result.perNeighborhoodTopOne).toEqual(baseline.perNeighborhoodTopOne);
    expect(result.averageDistinctBoroughsTop5).toBeCloseTo(baseline.averageDistinctBoroughsTop5, 5);
  });
});
