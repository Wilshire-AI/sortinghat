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
  | 'nj';

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
  choices: {
    label: string;
    impacts: Partial<Record<DimensionId, number>>;
  }[];
};

export type SliderQuestion = {
  id: string;
  kind: 'slider';
  prompt: string;
  lowLabel: string;
  highLabel: string;
  dimensionId: DimensionId;
};

export type MultiSelectQuestion = {
  id: string;
  kind: 'multi_select';
  prompt: string;
  helperText?: string;
  // selecting any of these adds the value(s) to either selectedTags or
  // mustHaves depending on `purpose` (default: cultural_tags).
  options: { value: string; label: string }[];
  // optionally, picking ANY option also nudges a dimension
  dimensionImpactPerSelection?: Partial<Record<DimensionId, number>>;
  // 'cultural_tags' (default): selections feed the soft cultural-tag boost
  // 'must_haves': selections become hard filters (excluded if not satisfied)
  purpose?: 'cultural_tags' | 'must_haves';
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
  // True for neighborhoods where day-to-day life is significantly better with
  // a car (errands, off-NYC trips, etc.). Used by the 'no car required'
  // must-have filter.
  carDependent?: boolean;
  // Housing-stock types meaningfully present (not exhaustive — only flagged
  // when there's enough of the type to be a real residential option).
  // Used by the 'house-or-townhouse' must-have filter.
  housingTypes?: ('single-family' | 'townhouse' | 'condo' | 'co-op' | 'rental')[];
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
export const CONTENT_VERSION = '2026-05-06-poc-v3' as const;
