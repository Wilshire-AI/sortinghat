import type { CommuteMinutes, Dimension, DimensionId, Neighborhood, NeighborhoodId, UserVector } from '@content/types';

const CULTURAL_TAG_BOOST = 0.08;
const COMMUTE_PENALTY_FLOOR = 0.3; // never multiply score below this
const COMMUTE_PENALTY_SLOPE = 0.5; // penalty per (excess / tolerance) unit

// ---- Must-have filters ----
// Each known must-have key maps to a predicate that a neighborhood must
// satisfy to remain in the result set. Unknown keys are ignored.
export type MustHaveFn = (n: Neighborhood, selectedTags: readonly string[]) => boolean;

export const MUST_HAVE_FILTERS: Record<string, MustHaveFn> = {
  'subway-redundancy': (n) => (n.scores['transit-psychology'] ?? 0) >= 0.4,
  'walking-distance-park': (n) => (n.scores['environmental-openness'] ?? 0) >= 0.5,
  'top-schools': (n) => (n.scores['school-quality'] ?? 0) >= 0.7,
  'no-car': (n) => (n.scores['daily-life-walkability'] ?? 0) >= 0.5,
  'house-or-townhouse': (n) =>
    !!n.housingTypes && (n.housingTypes.includes('single-family') || n.housingTypes.includes('townhouse')),
  'luxury-highrise': (n) => !!n.housingTypes && n.housingTypes.includes('luxury-highrise'),
  'quiet-blocks-available': (n) => n.hasQuietBlocks === true,
  'family-infrastructure': (n) => n.hasFamilyInfrastructure === true,
  'cultural-match': (n, selectedTags) => {
    if (selectedTags.length === 0) return true; // user picked no tags; filter is no-op
    if (!n.culturalTags || n.culturalTags.length === 0) return false;
    return n.culturalTags.some((t) => selectedTags.includes(t));
  },
};

export function passesMustHaves(
  neighborhood: Neighborhood,
  mustHaves: readonly string[],
  selectedTags: readonly string[],
): boolean {
  for (const mh of mustHaves) {
    const filter = MUST_HAVE_FILTERS[mh];
    if (!filter) continue;
    if (!filter(neighborhood, selectedTags)) return false;
  }
  return true;
}

// Multiplicative score adjustment in [COMMUTE_PENALTY_FLOOR, 1] reflecting
// how well the neighborhood's commute fits the user's targets and tolerance.
//
// Targets containing only 'remote' or 'other' (or empty) → no adjustment (1.0).
// Each real target: penalty = max(0, (actual - tolerance) / tolerance) * SLOPE.
// Multiple targets are averaged. Missing route data treated as infeasible (worst case).
export function scoreCommute(
  commuteMinutes: CommuteMinutes | undefined,
  targets: readonly string[],
  toleranceMinutes: number,
): number {
  const realTargets = targets.filter((t) => t !== 'remote' && t !== 'other');
  if (realTargets.length === 0 || toleranceMinutes <= 0) return 1.0;

  let sumMult = 0;
  for (const target of realTargets) {
    const actual = commuteMinutes?.[target as keyof CommuteMinutes];
    let excessRatio: number;
    if (actual === undefined) {
      excessRatio = 2.0; // infeasible — treat as 2x tolerance
    } else if (actual <= toleranceMinutes) {
      excessRatio = 0;
    } else {
      excessRatio = (actual - toleranceMinutes) / toleranceMinutes;
    }
    const mult = Math.max(COMMUTE_PENALTY_FLOOR, 1 - COMMUTE_PENALTY_SLOPE * excessRatio);
    sumMult += mult;
  }
  return sumMult / realTargets.length;
}

export type RankedNeighborhood = {
  neighborhood: Neighborhood;
  score: number;
};

export type RankOptions = {
  topN?: number;
  selectedTags?: readonly string[];
  mustHaves?: readonly string[];
  commuteTargets?: readonly string[];
  commuteToleranceMinutes?: number;
  commuteMinutesByNeighborhood?: Readonly<Record<NeighborhoodId, CommuteMinutes>>;
  softPrefs?: readonly string[];
  housingAcceptance?: readonly string[];
  // Population data — when supplied, the engine multiplies in the population
  // prior and uses pop-scaled σ for the Gaussian likelihood. When omitted,
  // every nbhd is scored at the median-pop default.
  populationsByNeighborhood?: Readonly<Record<NeighborhoodId, number>>;
  // Dims where the user expressed any signal. Untouched dims contribute no
  // likelihood penalty regardless of nbhd value. When omitted, the engine
  // falls back to "any dim with non-zero user value is touched" — accurate
  // for fresh quizzes, imprecise for pre-Bayesian fingerprints where impacts
  // happened to cancel to exactly 0.
  touchedDims?: ReadonlySet<DimensionId>;
};

// ---- Bayesian engine primitives ----
// Cross-model design at .polaris/bayesian-engine-design.md.
//
// Each neighborhood is a Gaussian-shaped basin of attraction in the dim space.
// σ scales with population: larger nbhds genuinely accept more user-types.
// Score = unnormalized RBF likelihood × population prior, with orthogonal
// modifiers (cultural tags, commute, softPrefs) multiplied in. Final display
// is per-user max-normalized.
//
// We deliberately drop the strict Gaussian density's 1/σ^d normalizer. In
// 18 dims that term scales as σ^-18 and would invert the population effect,
// punishing big nbhds for being permissive. The Bayesian frame is a useful
// mental model; the math is similarity-based, not strict probabilistic
// inference. See .polaris/bayesian-engine-design.md "Likelihood function"
// for the derivation.

const POP_REF = 30_000;
const SIGMA_BASE = 0.40;
const SIGMA_ALPHA = 0.35;
const SIGMA_MIN = 0.45;
const SIGMA_MAX = 0.45;
const PRIOR_BETA = 0.30;
const CULTURAL_TAG_MAX_MATCHES = 3;
const SOFT_PREF_MULT_PER_MATCH = 1.05;
const SOFT_PREF_MULT_CAP = 1.15;
const HOUSING_ACCEPTANCE_BOOST = 0.05;
const HOUSING_ACCEPTANCE_MAX_MATCHES = 4;

// User-facing housing-acceptance values map to one or more concrete
// housingTypes on neighborhoods. The mapping is one-to-many for cases
// where the user vocabulary collapses distinctions the data preserves
// (e.g., townhouse and single-family are one user choice, two data
// values).
const HOUSING_ACCEPTANCE_MAP: Record<string, readonly string[]> = {
  'prewar-character': ['prewar-character'],
  'prewar-renovated': ['prewar-renovated'],
  'newer-lowrise': ['newer-lowrise'],
  'luxury-highrise': ['luxury-highrise'],
  'house-townhouse': ['single-family', 'townhouse'],
};

export function sigmaForPopulation(population: number): number {
  if (population <= 0) return SIGMA_MIN;
  const raw = SIGMA_BASE * Math.pow(population / POP_REF, SIGMA_ALPHA);
  return Math.max(SIGMA_MIN, Math.min(SIGMA_MAX, raw));
}

export function logPriorForPopulation(population: number): number {
  if (population <= 0) return PRIOR_BETA * Math.log(1 / POP_REF);
  return PRIOR_BETA * Math.log(population / POP_REF);
}

export function dimensionDelta(
  userValue: number,
  neighborhoodValue: number,
  kind: Dimension['kind'],
): number {
  if (kind === 'asymmetric_need') {
    if (userValue <= 0) return 0;
    return Math.max(0, userValue - neighborhoodValue);
  }
  return userValue - neighborhoodValue;
}

export function logLikelihoodBayesian(
  user: UserVector,
  neighborhood: Neighborhood,
  dimensions: readonly Dimension[],
  touchedDims: ReadonlySet<string>,
  sigma: number,
): number {
  let sumSquaredDelta = 0;
  for (const d of dimensions) {
    if (!touchedDims.has(d.id)) continue;
    const delta = dimensionDelta(user[d.id] ?? 0, neighborhood.scores[d.id] ?? 0, d.kind);
    sumSquaredDelta += delta * delta;
  }
  return -0.5 * sumSquaredDelta / (sigma * sigma);
}

function culturalMultiplier(neighborhood: Neighborhood, selectedTags: readonly string[]): number {
  if (selectedTags.length === 0 || !neighborhood.culturalTags) return 1;
  const matched = neighborhood.culturalTags.filter((t) => selectedTags.includes(t)).length;
  return 1 + CULTURAL_TAG_BOOST * Math.min(matched, CULTURAL_TAG_MAX_MATCHES);
}

function softPrefMultiplier(neighborhood: Neighborhood, softPrefs: readonly string[]): number {
  if (softPrefs.length === 0) return 1;
  let mult = 1;
  if (softPrefs.includes('car-friendly') && (neighborhood.scores['daily-life-walkability'] ?? 0) < 0.5) {
    mult *= SOFT_PREF_MULT_PER_MATCH;
  }
  return Math.min(SOFT_PREF_MULT_CAP, mult);
}

function housingMultiplier(neighborhood: Neighborhood, housingAcceptance: readonly string[]): number {
  if (housingAcceptance.length === 0 || !neighborhood.housingTypes) return 1;
  const nbhdTypes = new Set<string>(neighborhood.housingTypes);
  let matches = 0;
  for (const userValue of housingAcceptance) {
    const acceptableNbhdTypes = HOUSING_ACCEPTANCE_MAP[userValue];
    if (!acceptableNbhdTypes) continue;
    if (acceptableNbhdTypes.some((t) => nbhdTypes.has(t))) matches += 1;
  }
  return 1 + HOUSING_ACCEPTANCE_BOOST * Math.min(matches, HOUSING_ACCEPTANCE_MAX_MATCHES);
}

// Heuristic fallback for callers that don't provide touchedDims (pre-Bayesian
// fingerprints, etc.): every dim with a non-zero user value is "touched."
// Imprecise for edge cases where impacts canceled to exactly 0, but reasonable
// for most flows.
function touchedDimsFromUserVector(
  user: UserVector,
  dimensions: readonly Dimension[],
): Set<string> {
  const touched = new Set<string>();
  for (const d of dimensions) {
    if ((user[d.id] ?? 0) !== 0) touched.add(d.id);
  }
  return touched;
}

export function rankNeighborhoods(
  user: UserVector,
  neighborhoods: readonly Neighborhood[],
  dimensions: readonly Dimension[],
  topNOrOptions: number | RankOptions = 5,
  selectedTags: readonly string[] = [],
  mustHaves: readonly string[] = [],
): RankedNeighborhood[] {
  // Backwards-compatible signature: legacy callers pass topN (number) +
  // selectedTags + mustHaves. New callers pass an options object as 4th arg.
  const opts =
    typeof topNOrOptions === 'object'
      ? {
          topN: topNOrOptions.topN ?? 5,
          selectedTags: topNOrOptions.selectedTags ?? [],
          mustHaves: topNOrOptions.mustHaves ?? [],
          commuteTargets: topNOrOptions.commuteTargets ?? [],
          commuteToleranceMinutes: topNOrOptions.commuteToleranceMinutes ?? 0,
          commuteMinutesByNeighborhood: topNOrOptions.commuteMinutesByNeighborhood,
          softPrefs: topNOrOptions.softPrefs ?? [],
          housingAcceptance: topNOrOptions.housingAcceptance ?? [],
          populationsByNeighborhood: topNOrOptions.populationsByNeighborhood,
          touchedDims: topNOrOptions.touchedDims,
        }
      : {
          topN: topNOrOptions,
          selectedTags,
          mustHaves,
          commuteTargets: [] as readonly string[],
          commuteToleranceMinutes: 0,
          commuteMinutesByNeighborhood: undefined,
          softPrefs: [] as readonly string[],
          housingAcceptance: [] as readonly string[],
          populationsByNeighborhood: undefined as Readonly<Record<NeighborhoodId, number>> | undefined,
          touchedDims: undefined as ReadonlySet<DimensionId> | undefined,
        };

  const filtered = opts.mustHaves.length > 0
    ? neighborhoods.filter((n) => passesMustHaves(n, opts.mustHaves, opts.selectedTags))
    : neighborhoods;

  return rankBayesian(user, filtered, dimensions, opts);
}

// Bayesian ranking path. Caller has already filtered by must-haves.
function rankBayesian(
  user: UserVector,
  candidates: readonly Neighborhood[],
  dimensions: readonly Dimension[],
  opts: {
    topN: number;
    selectedTags: readonly string[];
    commuteTargets: readonly string[];
    commuteToleranceMinutes: number;
    commuteMinutesByNeighborhood?: Readonly<Record<NeighborhoodId, CommuteMinutes>>;
    softPrefs: readonly string[];
    housingAcceptance: readonly string[];
    populationsByNeighborhood?: Readonly<Record<NeighborhoodId, number>>;
    touchedDims?: ReadonlySet<DimensionId>;
  },
): RankedNeighborhood[] {
  const touchedDims = opts.touchedDims ?? touchedDimsFromUserVector(user, dimensions);
  const applyCommute =
    opts.commuteTargets.length > 0 &&
    opts.commuteToleranceMinutes > 0 &&
    !!opts.commuteMinutesByNeighborhood;

  // Compute log-posterior for every candidate. We work in log space so the
  // unnormalized RBF likelihood and log-prior sum cleanly with the log of
  // each multiplicative modifier.
  const logScored = candidates.map((neighborhood) => {
    const pop = opts.populationsByNeighborhood?.[neighborhood.id] ?? POP_REF;
    const sigma = sigmaForPopulation(pop);
    const logLik = logLikelihoodBayesian(user, neighborhood, dimensions, touchedDims, sigma);
    const logPrior = logPriorForPopulation(pop);

    const culMult = culturalMultiplier(neighborhood, opts.selectedTags);
    const commuteMult = applyCommute
      ? scoreCommute(
          opts.commuteMinutesByNeighborhood![neighborhood.id],
          opts.commuteTargets,
          opts.commuteToleranceMinutes,
        )
      : 1;
    const softMult = softPrefMultiplier(neighborhood, opts.softPrefs);
    const housingMult = housingMultiplier(neighborhood, opts.housingAcceptance);

    const logScore =
      logLik +
      logPrior +
      Math.log(culMult) +
      Math.log(Math.max(commuteMult, 1e-9)) +
      Math.log(softMult) +
      Math.log(housingMult);
    return { neighborhood, logScore };
  });

  // Per-user normalization for display. We deliberately don't show
  // exp(logScore - maxLog) directly — that collapses exponentially and
  // paints ~90% of the dataset near zero (whole map reads red).
  // Pure linear-in-log goes the other way — median lands at 50% which
  // renders as yellow-green, so most places look like decent fits even
  // when they aren't. We squarethe linear-in-log score: top stays at
  // 100%, worst stays at 0%, but the middle compresses toward red so
  // mid-fit places read as honestly "meh" rather than misleadingly green.
  // Rank order preserved (squaring a non-negative monotonic mapping is
  // still monotonic).
  let maxLog = -Infinity;
  let minLog = Infinity;
  for (const s of logScored) {
    if (s.logScore > maxLog) maxLog = s.logScore;
    if (s.logScore < minLog) minLog = s.logScore;
  }
  const range = maxLog - minLog;
  const scored = logScored.map((s) => {
    if (maxLog === -Infinity) return { neighborhood: s.neighborhood, score: 0 };
    if (range <= 0) return { neighborhood: s.neighborhood, score: 1 };
    const linear = (s.logScore - minLog) / range;
    return { neighborhood: s.neighborhood, score: linear * linear };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.neighborhood.id.localeCompare(b.neighborhood.id);
  });
  return scored.slice(0, opts.topN);
}

// Returns IDs of neighborhoods excluded by the must-haves filter, for UI display.
export function excludedByMustHaves(
  neighborhoods: readonly Neighborhood[],
  mustHaves: readonly string[],
  selectedTags: readonly string[],
): string[] {
  if (mustHaves.length === 0) return [];
  return neighborhoods
    .filter((n) => !passesMustHaves(n, mustHaves, selectedTags))
    .map((n) => n.id);
}

// Returns which must-have keys this neighborhood failed, for inline UI explanation.
// Empty array means the neighborhood passes all the user's must-haves.
export function failedMustHaves(
  neighborhood: Neighborhood,
  mustHaves: readonly string[],
  selectedTags: readonly string[],
): string[] {
  const failed: string[] = [];
  for (const mh of mustHaves) {
    const filter = MUST_HAVE_FILTERS[mh];
    if (!filter) continue;
    if (!filter(neighborhood, selectedTags)) failed.push(mh);
  }
  return failed;
}
