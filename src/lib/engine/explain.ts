import type { Neighborhood, Passage } from '@content/types';

export type ResolvedCardProse = {
  fitProse: string;
  tradeoffs: string[];
  whoThrivesHere: string;
  source: 'passage' | 'base';
};

export function resolveCardProse(
  neighborhood: Neighborhood,
  passage: Passage | undefined,
): ResolvedCardProse {
  if (passage) {
    return {
      fitProse: passage.fitProse,
      tradeoffs: passage.tradeoffsForYou,
      whoThrivesHere: neighborhood.basePassages.whoThrivesHere,
      source: 'passage',
    };
  }
  return {
    fitProse: neighborhood.basePassages.whyItFits,
    tradeoffs: neighborhood.basePassages.tradeoffs,
    whoThrivesHere: neighborhood.basePassages.whoThrivesHere,
    source: 'base',
  };
}
