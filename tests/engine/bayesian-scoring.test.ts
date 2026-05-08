import { describe, it, expect } from 'vitest';
import {
  sigmaForPopulation,
  logPriorForPopulation,
  dimensionDelta,
  logLikelihoodBayesian,
  rankNeighborhoods,
} from '@/lib/engine/score';
import type { Dimension, Neighborhood } from '@content/types';

const dims: Dimension[] = [
  { id: 'urban', name: 'Urban', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'symmetric' },
  { id: 'rooted', name: 'Rooted', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'symmetric' },
  { id: 'safety', name: 'Safety', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'asymmetric_need' },
  { id: 'school', name: 'School', description: 'long enough description here', poles: { low: 'l', high: 'h' }, kind: 'asymmetric_need' },
];

function n(id: string, scores: Record<string, number>): Neighborhood {
  return {
    id, slug: id, name: id, borough: 'manhattan', scores,
    basePassages: { whyItFits: '', whoThrivesHere: '', tradeoffs: [] },
    anchors: { transit: [], parks: [], groceries: [] },
    heroImage: '',
  };
}

describe('sigmaForPopulation', () => {
  // SIGMA_MIN === SIGMA_MAX === SIGMA_BASE === 0.40 → flat σ across the entire
  // corpus. Empirical sweep showed σ scaling produced worse population fidelity
  // than flat σ + moderate prior. The Gaussian basins are uniform width;
  // population enters scoring only via the multiplicative prior.
  it('returns 0.40 for every population (flat σ design)', () => {
    expect(sigmaForPopulation(1_000)).toBeCloseTo(0.40, 3);
    expect(sigmaForPopulation(30_000)).toBeCloseTo(0.40, 3);
    expect(sigmaForPopulation(150_000)).toBeCloseTo(0.40, 3);
    expect(sigmaForPopulation(10_000_000)).toBeCloseTo(0.40, 3);
  });
});

describe('logPriorForPopulation', () => {
  it('is zero at the reference population', () => {
    expect(logPriorForPopulation(30_000)).toBe(0);
  });

  it('is positive for above-median pops', () => {
    expect(logPriorForPopulation(120_000)).toBeGreaterThan(0);
  });

  it('is negative for below-median pops', () => {
    expect(logPriorForPopulation(6_300)).toBeLessThan(0);
  });

  it('Williamsburg vs Chappaqua difference is ~1.1 log-units (β=0.25)', () => {
    const diff = logPriorForPopulation(120_000) - logPriorForPopulation(1_500);
    expect(diff).toBeCloseTo(1.095, 1);
  });
});

describe('dimensionDelta', () => {
  it('symmetric dim: signed delta', () => {
    expect(dimensionDelta(0.5, 0.3, 'symmetric')).toBeCloseTo(0.2);
    expect(dimensionDelta(-0.5, 0.5, 'symmetric')).toBeCloseTo(-1.0);
  });

  it('asymmetric_need: zero when user value is non-positive', () => {
    expect(dimensionDelta(0, 0.5, 'asymmetric_need')).toBe(0);
    expect(dimensionDelta(-0.5, 0.5, 'asymmetric_need')).toBe(0);
  });

  it('asymmetric_need: shortfall only when nbhd under-delivers', () => {
    expect(dimensionDelta(0.7, 0.4, 'asymmetric_need')).toBeCloseTo(0.3);
  });

  it('asymmetric_need: zero when nbhd over-delivers (extra is fine)', () => {
    expect(dimensionDelta(0.4, 0.9, 'asymmetric_need')).toBe(0);
  });
});

describe('logLikelihoodBayesian — touched-dim masking', () => {
  const nbhd = n('test', { urban: 0.5, rooted: 0.3, safety: 0.7 });

  it('untouched dim contributes nothing', () => {
    const user = { urban: 0.5, rooted: 0.3, safety: 0.7 };
    const touched = new Set<string>(['urban']);
    const ll = logLikelihoodBayesian(user, nbhd, dims, touched, 0.4);
    // Only urban contributes, and it matches → 0 delta → 0 contribution
    expect(ll).toBeCloseTo(0);
  });

  it('symmetric dim mismatch produces negative log-likelihood', () => {
    const user = { urban: -0.5, rooted: 0, safety: 0 };
    const touched = new Set<string>(['urban']);
    const ll = logLikelihoodBayesian(user, nbhd, dims, touched, 0.4);
    // delta = -1.0, sumSq = 1.0, ll = -0.5 / 0.16 = -3.125
    expect(ll).toBeCloseTo(-3.125, 2);
  });

  it('asymmetric_need with user=0 contributes nothing even if touched', () => {
    const user = { urban: 0, rooted: 0, safety: 0 };
    const touched = new Set<string>(['safety']);
    const ll = logLikelihoodBayesian(user, nbhd, dims, touched, 0.4);
    expect(ll).toBeCloseTo(0); // toBe(0) fails on -0/+0 JS quirk
  });

  it('asymmetric_need shortfall scales as expected', () => {
    const user = { urban: 0, rooted: 0, safety: 0.9 };
    const touched = new Set<string>(['safety']);
    // safety: shortfall = 0.9 - 0.7 = 0.2, sumSq = 0.04, σ=0.4 → ll = -0.04/0.32 = -0.125
    const ll = logLikelihoodBayesian(user, nbhd, dims, touched, 0.4);
    expect(ll).toBeCloseTo(-0.125, 3);
  });

  it('larger σ produces gentler likelihood drop for the same delta', () => {
    const user = { urban: -0.5 };
    const touched = new Set<string>(['urban']);
    const llTight = logLikelihoodBayesian(user, nbhd, dims, touched, 0.22);
    const llLoose = logLikelihoodBayesian(user, nbhd, dims, touched, 0.90);
    expect(llLoose).toBeGreaterThan(llTight); // less-negative (likelier)
  });
});

describe('rankNeighborhoods — Bayesian behavior', () => {
  const small = n('small', { urban: 0.5 });
  const medium = n('medium', { urban: 0.5 });
  const large = n('large', { urban: 0.5 });
  const populations = { small: 5_000, medium: 30_000, large: 200_000 };

  it('without populations: same-fit nbhds tie; alphabetical breaks the tie', () => {
    const user = { urban: 0.5 };
    const ranked = rankNeighborhoods(user, [small, medium, large], dims, { topN: 3 });
    expect(ranked.length).toBe(3);
    // All have zero log-likelihood (perfect match); no prior; alphabetical: large < medium < small
    expect(ranked[0].neighborhood.id).toBe('large');
  });

  it('with populations: same-fit nbhds, larger pop wins via prior', () => {
    const user = { urban: 0.5 };
    const ranked = rankNeighborhoods(user, [small, medium, large], dims, {
      topN: 3,
      populationsByNeighborhood: populations,
      touchedDims: new Set(['urban']),
    });
    // All have zero log-likelihood (perfect match). Population prior favors largest.
    expect(ranked[0].neighborhood.id).toBe('large');
    expect(ranked[1].neighborhood.id).toBe('medium');
    expect(ranked[2].neighborhood.id).toBe('small');
  });

  it('Bayesian: top displayed score is 1.0; others scaled relative', () => {
    const user = { urban: 0.5 };
    const ranked = rankNeighborhoods(user, [small, medium, large], dims, {
      topN: 3,
      populationsByNeighborhood: populations,
      touchedDims: new Set(['urban']),
    });
    expect(ranked[0].score).toBeCloseTo(1.0, 6);
    expect(ranked[1].score).toBeLessThan(1.0);
    expect(ranked[2].score).toBeLessThan(ranked[1].score);
  });

  it('Bayesian: small nbhd CAN beat large one when user is a perfect match (moderate pop differential)', () => {
    // At β=0.5, the prior + σ-scaling combination is strong enough that
    // very-tiny populations (e.g., 1500 vs 200_000) lose even to a poor-fit
    // large nbhd. This is a known design property (see spec risk register).
    // For populations within ~5x of each other, perfect-match likelihood
    // overrides the prior — verified here.
    const niche = n('niche', { urban: -0.7, rooted: -0.7 });
    const generic = n('generic', { urban: 0.0, rooted: 0.0 });
    const pops = { niche: 15_000, generic: 80_000 };
    const user = { urban: -0.7, rooted: -0.7 };
    const ranked = rankNeighborhoods(user, [niche, generic], dims, {
      topN: 2,
      populationsByNeighborhood: pops,
      touchedDims: new Set(['urban', 'rooted']),
    });
    expect(ranked[0].neighborhood.id).toBe('niche');
  });

  it('Bayesian: untouched dims do not penalize nbhd even when scored away from 0', () => {
    const userOnlyUrban = { urban: 0.5 };
    const touched = new Set<string>(['urban']);
    const specific = n('specific', { urban: 0.5, rooted: 0.7, safety: 0.7 });
    const generic = n('generic', { urban: 0.5, rooted: 0.0, safety: 0.0 });
    const pops = { specific: 30_000, generic: 30_000 }; // same pop → prior tie
    const ranked = rankNeighborhoods(userOnlyUrban, [specific, generic], dims, {
      topN: 2,
      populationsByNeighborhood: pops,
      touchedDims: touched,
    });
    // Both should tie at 1.0 because rooted/safety aren't touched
    expect(ranked[0].score).toBeCloseTo(1.0);
    expect(ranked[1].score).toBeCloseTo(1.0);
  });

  it('Bayesian: touchedDims fallback uses non-zero user values', () => {
    const user = { urban: 0.5, rooted: 0 };
    const matching = n('match', { urban: 0.5, rooted: 0.7 });
    const offurban = n('off', { urban: -0.5, rooted: 0 });
    const ranked = rankNeighborhoods(user, [matching, offurban], dims, {
      topN: 2,
      populationsByNeighborhood: { match: 30_000, off: 30_000 },
      // no touchedDims — should default to {urban} (rooted is 0)
    });
    expect(ranked[0].neighborhood.id).toBe('match');
  });

  it('Bayesian: must-haves still filter the candidate set', () => {
    const passes = n('passes', { urban: 0.5, 'school-quality': 0.8 });
    const fails = n('fails', { urban: 0.5, 'school-quality': 0.2 });
    const user = { urban: 0.5 };
    const ranked = rankNeighborhoods(user, [passes, fails], dims, {
      topN: 5,
      mustHaves: ['top-schools'],
      populationsByNeighborhood: { passes: 30_000, fails: 30_000 },
      touchedDims: new Set(['urban']),
    });
    expect(ranked.length).toBe(1);
    expect(ranked[0].neighborhood.id).toBe('passes');
  });
});
