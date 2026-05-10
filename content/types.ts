// content/types.ts. Single source of truth for all static-content shapes.
export type DimensionId = string;
export type ArchetypeId = string;
export type NeighborhoodId = string;

export type Borough =
  | 'manhattan'
  | 'brooklyn'
  | 'queens'
  | 'bronx'
  | 'staten-island'
  | 'nj'
  | 'westchester'
  | 'long-island'
  | 'ct';

// Office clusters used for commute-target scoring. Anchored to canonical
// transit hubs at the center of each NYC-metro office concentration.
// 'remote' and 'other' are quiz-only sentinels — they don't appear here.
export type CommuteCluster =
  | 'midtown'
  | 'fidi'
  | 'hudson-yards'
  | 'lic'
  | 'downtown-brooklyn'
  | 'newport-jc'
  | 'upper-manhattan'
  | 'hoboken'
  | 'newark'
  | 'white-plains'
  | 'stamford'
  | 'greenwich'
  | 'westport';

// Door-to-door transit minutes from a neighborhood centroid to each cluster's
// transit anchor, computed via Google Routes API for a weekday morning rush
// departure. Missing keys = the route is infeasible (>2.5h) or no route found.
export type CommuteMinutes = Partial<Record<CommuteCluster, number>>;

// Dimension scoring kind:
// - 'symmetric': both poles are real lived preferences. Mismatch in either
//   direction hurts. Example: urban intensity (some want calm, some want
//   density; ending up on the wrong side feels wrong either way).
// - 'asymmetric_need': only ONE pole is a real preference (the high side).
//   The low side just means "this isn't a driver for me." If the user is
//   low and the neighborhood is high, that's not a mismatch — they got
//   something they weren't seeking. Penalty only applies when the user
//   wanted MORE of this thing than the neighborhood provides.
//   Example: prestige (not caring about prestige doesn't mean you'd
//   actively dislike a prestigious neighborhood).
export type DimensionKind = 'symmetric' | 'asymmetric_need';

export type Dimension = {
  id: DimensionId;
  name: string;
  description: string;
  poles: { low: string; high: string };
  kind: DimensionKind;
};

export type ForcedChoiceQuestion = {
  id: string;
  kind: 'forced_choice';
  prompt: string;
  helperText?: string;
  choices: {
    label: string;
    impacts: Partial<Record<DimensionId, number>>;
    // Optional commute-tolerance setter (door-to-door minutes). Used by the
    // commute-tolerance question — picking a choice writes this value to
    // DerivedState.commuteToleranceMinutes. No effect on dim impacts.
    commuteToleranceMinutes?: number;
  }[];
  // When true, the next visible question is rendered on the same screen as
  // this one (a "screen group"). Used to merge tightly-coupled question
  // pairs (e.g., commute-target + commute-tolerance) into a single page.
  // Only the FIRST question of a pair carries this flag.
  groupNext?: boolean;
};

export type SliderQuestion = {
  id: string;
  kind: 'slider';
  prompt: string;
  helperText?: string;
  lowLabel: string;
  highLabel: string;
  positionLabels?: readonly [string, string, string, string, string];
  // Optional pole reference photos. When present, the slider renders a small
  // thumbnail at each end of the track. Used for spectrum questions where a
  // visual reference clarifies the abstract axis (cultural-register, lifecycle).
  // Both must be present together. Source from /public/images/quiz/. See
  // .polaris/quiz-photos-research-2026-05-10.md for design rationale.
  lowImage?: { src: string; alt: string; caption: string };
  highImage?: { src: string; alt: string; caption: string };
  // Single-dim slider (legacy). Slider value SETS this dim's user vector
  // value (in [-1, +1]). Use for agree/disagree-style questions where the
  // slider position IS the user's value on a single axis (e.g., safety-need).
  dimensionId?: DimensionId;
  // Multi-dim slider (semantic-differential / spectrum endpoint pairs like
  // "Trendsetting ↔ Traditional"). Each impact's value is multiplied by the
  // slider position s ∈ {-1, -0.5, 0, +0.5, +1} and ADDED to the user vector.
  // Use when the slider's two poles correlate with multiple dims at once.
  // Exactly one of `dimensionId` or `impacts` must be present.
  impacts?: Partial<Record<DimensionId, number>>;
  groupNext?: boolean;
};

export type MultiSelectQuestion = {
  id: string;
  kind: 'multi_select';
  prompt: string;
  helperText?: string;
  groupNext?: boolean;
  // selecting any of these adds the value(s) to either selectedTags or
  // mustHaves depending on `purpose` (default: cultural_tags).
  options: {
    value: string;
    label: string;
    // Optional per-option dimension impacts. ADD semantics with clamp to
    // [-1, 1] in deriveState (see useQuizState.ts). Used by the
    // walking-distance-amenities question where each pick maps to a
    // different dim contribution.
    impacts?: Partial<Record<DimensionId, number>>;
    // Optional vibe-reference photo. Renders as a small thumbnail beside
    // the option label. Used for high-cognitive-load multi-selects where
    // a visual anchor materially helps users orient (place-archetype).
    // Source from /public/images/quiz/.
    image?: { src: string; alt: string };
  }[];
  // optionally, picking ANY option also nudges a dimension (legacy; prefer
  // per-option `impacts` above for new questions).
  dimensionImpactPerSelection?: Partial<Record<DimensionId, number>>;
  // 'cultural_tags' (default): selections feed the soft cultural-tag boost
  // 'must_haves': selections become hard filters (excluded if not satisfied)
  // 'commute_targets': selections name office clusters the user commutes to
  // 'walkable_amenities': selections add per-option dim impacts
  // 'place_archetype': selections name place types the user would be happy
  //   in. Per-option impacts ADD to the user vector (same code path as
  //   walkable_amenities). Each option carries half-strength impacts so 1
  //   pick = moderate signal, 2 picks compound, 3 picks compound to clamp.
  // 'street_energy': selections describe the kind of street energy the user
  //   wants — creative scene, commercial corridor, diverse/multicultural,
  //   visitor-facing, family, quiet residential. Per-option impacts ADD
  //   (same code path as walkable_amenities + place_archetype).
  // 'housing_acceptance': selections name housing-stock types the user would
  //   accept; engine multiplies score by housing-overlap multiplier (mirrors
  //   cultural-tag boost). Picking nothing = no effect (passes everywhere).
  purpose?:
    | 'cultural_tags'
    | 'must_haves'
    | 'commute_targets'
    | 'walkable_amenities'
    | 'place_archetype'
    | 'street_energy'
    | 'housing_acceptance';
  // Optional cap on how many options the user can select.
  maxSelections?: number;
};

export type Question = ForcedChoiceQuestion | SliderQuestion | MultiSelectQuestion;

export type Archetype = {
  id: ArchetypeId;
  name: string;
  identity: string;
  vector: Record<DimensionId, number>;
};

export type Neighborhood = {
  id: NeighborhoodId;
  slug: string;
  name: string;
  shortName?: string;
  borough: Borough;
  scores: Record<DimensionId, number>;
  // Optional cultural community tags. When the user selects any of these via
  // the cultural-communities multi-select question, neighborhoods with matching
  // tags get a score boost.
  culturalTags?: string[];
  // Housing-stock types meaningfully present (not exhaustive — only flagged
  // when there's enough of the type to be a real residential option). Used
  // by must-have filters AND by the housing-acceptance soft multiplier.
  //
  // Form-factor types: 'single-family', 'townhouse'.
  // Tenure types: 'condo', 'co-op', 'rental'. Mostly legacy — orthogonal
  //   to character so they don't help discriminate building style; kept
  //   for backward compatibility with any callers that still read them.
  // Character types (used by housing-acceptance):
  //   'prewar-character' = intact prewar/brownstone/loft, original details,
  //     period systems. Walkups, no doorman, quirks.
  //   'prewar-renovated' = prewar shell with modernized interior systems
  //     (often co-ops with renovation budgets, or gut-renovated condos).
  //   'newer-lowrise' = post-2000ish low/mid-rise construction, recent
  //     condos, modern stacked townhouses.
  //   'luxury-highrise' = newer high-rise with full amenities (doorman,
  //     gym, concierge). Boolean must-have filter still uses this.
  housingTypes?: (
    | 'single-family'
    | 'townhouse'
    | 'condo'
    | 'co-op'
    | 'rental'
    | 'luxury-highrise'
    | 'prewar-character'
    | 'prewar-renovated'
    | 'newer-lowrise'
  )[];
  // True when the neighborhood has notable, recognizable calm residential
  // enclaves (historic district, gated section, signature side streets) that
  // someone seeking a quiet block would specifically know to seek out. Distinct
  // from `friction-sensitivity` (whole-neighborhood calm) — this captures
  // block-level refuge, including in mixed-energy neighborhoods.
  hasQuietBlocks?: boolean;
  // True when the neighborhood has notable family-life infrastructure that
  // makes daily life with kids meaningfully easier: playground density within
  // walking distance, pediatric care access, kid-friendly third places,
  // visible family cohort, stroller-friendly streets. Distinct from
  // `school-quality` (a separate dimension) — this is about *infrastructure*
  // of daily kid-life, not school district fit.
  hasFamilyInfrastructure?: boolean;
  basePassages: {
    whyItFits: string;
    whoThrivesHere: string;
    tradeoffs: string[];
  };
  anchors: {
    transit: string[];
    parks: string[];
    groceries: string[];
  };
  heroImage: string;
};

export type Passage = {
  archetypeId: ArchetypeId;
  neighborhoodId: NeighborhoodId;
  fitProse: string;
  tradeoffsForYou: string[];
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type UserVector = Record<DimensionId, number>;

// Bumped per schema change. Older fingerprints still decode (vector +
// optional tags) but won't have mustHaves; that's a no-op default.
export const CONTENT_VERSION = '2026-05-10-poc-v18' as const;
