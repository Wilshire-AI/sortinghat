import { describe, it, expect } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { rankNeighborhoods } from '@/lib/engine/score';

// Reachability canaries for the rooted-pole psychographic group.
//
// These neighborhoods score deeply on rootedness-vs-access (low pole = rooted
// local-community feel) and represent ~half the dataset's psychographic
// territory. If a quiz change accidentally drops the rooted lane (e.g., by
// removing the rootedness-vs-access question, or by miscalibrating its
// impacts), one or more of these will fail to reach top 3 with their own
// optimal user — a signal that real users matching this profile would also
// stop seeing them.
//
// Canary list curated from the 2026-05-08 Polaris dual-model audit.
const ROOTED_CANARIES = [
  'park-slope',
  'cobble-hill',
  'carroll-gardens',
  'forest-hills',
  'astoria',
  'bed-stuy',
  'sunnyside',
  'ditmas-park',
];

describe('rooted-pole reachability gate', () => {
  it.each(ROOTED_CANARIES)(
    '%s reaches top 3 with its optimal user',
    (id) => {
      const target = neighborhoods.find((n) => n.id === id);
      expect(target, `canary ${id} not found in dataset`).toBeDefined();
      const ranked = rankNeighborhoods(
        { ...target!.scores },
        neighborhoods,
        dimensions,
        {
          topN: neighborhoods.length,
          selectedTags: target!.culturalTags ?? [],
          mustHaves: [],
        },
      );
      const rank = ranked.findIndex((r) => r.neighborhood.id === id) + 1;
      expect(rank, `${id} ranked #${rank} (top is ${ranked[0].neighborhood.name})`).toBeLessThanOrEqual(3);
    },
  );
});
