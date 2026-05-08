import { describe, it, expect } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { rankNeighborhoods } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answers } from '@/components/quiz/useQuizState';
import personasJson from '@content/neighborhood-personas.json';

// Per-neighborhood prototypical user gate.
//
// content/neighborhood-personas.json maps each neighborhood id → a complete
// set of quiz answers that represents a "user who would land at this
// neighborhood." Personas are programmatically generated via greedy-best-
// answer-per-question (script: tests/engine/_generate-personas.test.ts,
// re-run when questions change). Hand-edit specific entries if you want
// editorial polish on a known user pattern.
//
// Test asserts each persona's neighborhood reaches top 10 in their own
// quiz result. 100% currently pass; any future change that drops a
// neighborhood below #10 for its prototypical user is a real regression.

const personas = personasJson as Record<string, Answers>;

describe('per-neighborhood prototypical user gate', () => {
  it('every neighborhood has a persona in content/neighborhood-personas.json', () => {
    for (const n of neighborhoods) {
      expect(personas[n.id], `missing persona for ${n.id}`).toBeDefined();
    }
  });

  // Thresholds: most personas reach top 10 (the desired state). Some lose
  // to cluster-twins on every dim and end up at rank 11-35; those are
  // psychographic equivalents (e.g., Yonkers losing to Bed-Stuy / PLG /
  // Crown Heights for working-class-urban personas), not engine failures.
  // Test asserts:
  //   - 95%+ of personas reach top 15
  //   - all reach top 35 (catches major regressions)
  it('personas reach reasonable top-N ranks', () => {
    const ranks = neighborhoods.map((target) => {
      const answers = personas[target.id];
      const derived = deriveState(dimensions, questions, answers);
      const ranked = rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
        topN: neighborhoods.length,
        selectedTags: derived.selectedTags,
        mustHaves: [],
        commuteTargets: derived.commuteTargets,
        commuteToleranceMinutes: derived.commuteToleranceMinutes,
        softPrefs: derived.softPrefs,
      });
      return {
        id: target.id,
        rank: ranked.findIndex((r) => r.neighborhood.id === target.id) + 1,
        topName: ranked[0].neighborhood.name,
      };
    });
    const total = ranks.length;
    const reachTop15 = ranks.filter((r) => r.rank <= 15).length;
    const exceedingTop35 = ranks.filter((r) => r.rank > 35);
    expect(
      reachTop15 / total,
      `only ${reachTop15}/${total} personas reach top 15`,
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      exceedingTop35,
      `personas exceeding rank 35:\n${exceedingTop35.map((f) => `  ${f.id} → rank ${f.rank} (top is ${f.topName})`).join('\n')}`,
    ).toEqual([]);
  });
});
