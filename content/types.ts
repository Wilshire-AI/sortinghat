// content/types.ts — single source of truth for all static-content shapes
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

export type Dimension = {
  id: DimensionId;
  name: string;
  description: string;
  poles: { low: string; high: string };
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

export type Question = ForcedChoiceQuestion | SliderQuestion;

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

export const CONTENT_VERSION = '2026-05-06-poc' as const;
