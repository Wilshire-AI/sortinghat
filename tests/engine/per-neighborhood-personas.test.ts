import { describe, it, expect } from 'vitest';
import { neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { rankNeighborhoods } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answers } from '@/components/quiz/useQuizState';
import personasJson from '@content/neighborhood-personas.json';

// Per-neighborhood prototypical user gate.
//
// content/neighborhood-personas.json maps each neighborhood id →
// {
//   description: string | null  (optional editorial narrative)
//   answers: Answers             (the quiz answer set)
// }
//
// Programmatic baseline: cumulative-greedy. Hand-edit `description` for
// editorial polish on specific entries, or hand-edit `answers` to tune
// a persona toward a specific lifestyle pattern.
//
// Test asserts each persona's neighborhood reaches a reasonable top-N
// rank in their own quiz result. Catches regressions where a future
// change drops a neighborhood below its expected lane.

type PersonaEntry = { description: string | null; answers: Answers };
const personas = personasJson as Record<string, PersonaEntry>;

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
      const entry = personas[target.id];
      const answers = entry.answers;
      const derived = deriveState(dimensions, questions, answers);
      const ranked = rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
        topN: neighborhoods.length,
        selectedTags: derived.selectedTags,
        mustHaves: [],
        commuteTargets: derived.commuteTargets,
        commuteToleranceMinutes: derived.commuteToleranceMinutes,
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
