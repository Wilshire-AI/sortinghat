import type { CommuteMinutes, Dimension, Neighborhood, NeighborhoodId, UserVector } from '@content/types';

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
  'calm-blocks': (n) => (n.scores['friction-sensitivity'] ?? 0) >= 0.5,
  'no-car': (n) => !n.carDependent,
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

// ---- Scoring ----
function dimensionContribution(
  userValue: number,
  neighborhoodValue: number,
  kind: Dimension['kind'],
): number {
  if (kind === 'asymmetric_need') {
    const shortfall = Math.max(0, userValue - neighborhoodValue);
    return shortfall * shortfall;
  }
  const diff = userValue - neighborhoodValue;
  return diff * diff;
}

export function scoreNeighborhood(
  user: UserVector,
  neighborhood: Neighborhood,
  dimensions: readonly Dimension[],
  selectedTags: readonly string[] = [],
): number {
  let sumSq = 0;
  for (const d of dimensions) {
    const u = user[d.id] ?? 0;
    const n = neighborhood.scores[d.id] ?? 0;
    sumSq += dimensionContribution(u, n, d.kind);
  }
  const distance = Math.sqrt(sumSq);
  const maxDistance = Math.sqrt(dimensions.length * 4);
  const baseScore = maxDistance === 0 ? 1 : 1 - distance / maxDistance;

  if (selectedTags.length > 0 && neighborhood.culturalTags) {
    const matched = neighborhood.culturalTags.filter((t) => selectedTags.includes(t)).length;
    return Math.min(1, baseScore + matched * CULTURAL_TAG_BOOST);
  }
  return baseScore;
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
};

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
  const opts: Required<Omit<RankOptions, 'commuteMinutesByNeighborhood'>> & Pick<RankOptions, 'commuteMinutesByNeighborhood'> =
    typeof topNOrOptions === 'object'
      ? {
          topN: topNOrOptions.topN ?? 5,
          selectedTags: topNOrOptions.selectedTags ?? [],
          mustHaves: topNOrOptions.mustHaves ?? [],
          commuteTargets: topNOrOptions.commuteTargets ?? [],
          commuteToleranceMinutes: topNOrOptions.commuteToleranceMinutes ?? 0,
          commuteMinutesByNeighborhood: topNOrOptions.commuteMinutesByNeighborhood,
        }
      : {
          topN: topNOrOptions,
          selectedTags,
          mustHaves,
          commuteTargets: [],
          commuteToleranceMinutes: 0,
          commuteMinutesByNeighborhood: undefined,
        };

  const filtered = opts.mustHaves.length > 0
    ? neighborhoods.filter((n) => passesMustHaves(n, opts.mustHaves, opts.selectedTags))
    : neighborhoods;

  const applyCommute =
    opts.commuteTargets.length > 0 &&
    opts.commuteToleranceMinutes > 0 &&
    !!opts.commuteMinutesByNeighborhood;

  const scored = filtered.map((neighborhood) => {
    const baseScore = scoreNeighborhood(user, neighborhood, dimensions, opts.selectedTags);
    const commuteMult = applyCommute
      ? scoreCommute(
          opts.commuteMinutesByNeighborhood![neighborhood.id],
          opts.commuteTargets,
          opts.commuteToleranceMinutes,
        )
      : 1.0;
    return { neighborhood, score: baseScore * commuteMult };
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
