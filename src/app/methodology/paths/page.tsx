import Link from 'next/link';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { neighborhoods } from '@content/neighborhoods';
import { rankNeighborhoods } from '@/lib/engine/score';
import { deriveState, finalizeVector, type Answer, type Answers } from '@/lib/engine/derive';
import { neighborhoodPopulations } from '@content/neighborhood-populations';

export const metadata = {
  title: 'Question paths · Sorting Hat',
  description: 'Admin view: how each quiz answer pulls neighborhoods up or down in the rankings.',
};

// Compute the baseline: no answers at all. Lets us measure "delta" for each
// option as how much it moves a neighborhood relative to "user said nothing."
const baselineRanked = rankNeighborhoods(
  finalizeVector(deriveState(dimensions, questions, {} as Answers)),
  neighborhoods,
  dimensions,
  {
    topN: neighborhoods.length,
    selectedTags: [],
    mustHaves: [],
    populationsByNeighborhood: neighborhoodPopulations,
    touchedDims: deriveState(dimensions, questions, {} as Answers).touchedDims,
  },
);
const baselineRanks: Record<string, number> = {};
baselineRanked.forEach((r, i) => {
  baselineRanks[r.neighborhood.id] = i + 1;
});

type OptionImpact = {
  label: string;
  topN: { name: string; slug: string; rank: number; delta: number }[];
  bottomMovers: { name: string; slug: string; delta: number }[];
};

function rankWithSingleAnswer(qId: string, answer: Answer): typeof baselineRanked {
  const a: Answers = { [qId]: answer };
  const derived = deriveState(dimensions, questions, a);
  return rankNeighborhoods(finalizeVector(derived), neighborhoods, dimensions, {
    topN: neighborhoods.length,
    selectedTags: derived.selectedTags,
    mustHaves: [],
    commuteTargets: derived.commuteTargets,
    commuteToleranceMinutes: derived.commuteToleranceMinutes,
    populationsByNeighborhood: neighborhoodPopulations,
    touchedDims: derived.touchedDims,
  });
}

function impactsForQuestion(q: typeof questions[number]): { id: string; prompt: string; options: OptionImpact[] } {
  const options: OptionImpact[] = [];

  if (q.kind === 'forced_choice') {
    for (let i = 0; i < q.choices.length; i++) {
      const ranked = rankWithSingleAnswer(q.id, { kind: 'forced_choice', choiceIndex: i });
      options.push(buildOptionImpact(q.choices[i].label, ranked));
    }
  } else if (q.kind === 'slider') {
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      const ranked = rankWithSingleAnswer(q.id, { kind: 'slider', value: v });
      const labelMap: Record<string, string> = {
        '-1': `${q.lowLabel} (-1)`,
        '-0.5': `Lean: ${q.lowLabel} (-0.5)`,
        '0': 'Middle (0)',
        '0.5': `Lean: ${q.highLabel} (+0.5)`,
        '1': `${q.highLabel} (+1)`,
      };
      options.push(buildOptionImpact(labelMap[String(v)], ranked));
    }
  } else if (q.kind === 'multi_select' && q.purpose === 'walkable_amenities') {
    // For walkable_amenities, simulate picking ONE option at a time
    for (const opt of q.options) {
      const ranked = rankWithSingleAnswer(q.id, { kind: 'multi_select', selectedValues: [opt.value] });
      options.push(buildOptionImpact(opt.label, ranked));
    }
  } else {
    // Multi-select cultural-tags / must-haves / commute: skip per-option
    return { id: q.id, prompt: q.prompt, options: [] };
  }

  return { id: q.id, prompt: q.prompt, options };
}

function buildOptionImpact(label: string, ranked: typeof baselineRanked): OptionImpact {
  const movers = ranked.slice(0, 30).map((r, i) => ({
    name: r.neighborhood.name,
    slug: r.neighborhood.slug,
    rank: i + 1,
    delta: (baselineRanks[r.neighborhood.id] ?? 999) - (i + 1),
  }));
  const topN = movers.slice(0, 8);
  // Bottom movers: nbhds that DROPPED most relative to baseline
  const allMovers = ranked.map((r, i) => ({
    name: r.neighborhood.name,
    slug: r.neighborhood.slug,
    delta: (baselineRanks[r.neighborhood.id] ?? 999) - (i + 1),
  }));
  const bottomMovers = allMovers
    .filter((m) => m.delta < -10)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);
  return { label, topN, bottomMovers };
}

const data = questions.map(impactsForQuestion);

export default function PathsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/methodology"
        className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
      >
        ← Methodology
      </Link>

      <p className="mt-12 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Admin · Question paths
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight">
        How each answer moves the rankings
      </h1>
      <p className="mt-6 text-base leading-relaxed text-[var(--color-ink)]/85 max-w-2xl">
        For each quiz question, this page shows what happens when a user picks
        only that single option (with everything else neutral). Top 8
        neighborhoods are the ones the option pulls toward. The &ldquo;biggest
        drops&rdquo; section shows neighborhoods that fall the most when this
        option is picked — what the option pushes away from.
      </p>

      <div className="mt-12 space-y-16">
        {data.map((q, i) => (
          <section key={q.id} className="border-t border-[var(--color-line)] pt-10">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] font-mono">
              Q{String(i + 1).padStart(2, '0')} · {q.id}
            </p>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl leading-tight">
              {q.prompt}
            </h2>

            {q.options.length === 0 ? (
              <p className="mt-6 text-sm italic text-[var(--color-muted)]">
                Multi-select question with cultural / must-have / commute purpose — per-option analysis not shown.
              </p>
            ) : (
              <div className="mt-8 space-y-8">
                {q.options.map((opt, j) => (
                  <div key={j}>
                    <p className="text-sm font-medium leading-snug">
                      <span className="text-[var(--color-muted)] mr-2">→</span>
                      {opt.label}
                    </p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-6 ml-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] mb-2">
                          Pulls toward
                        </p>
                        <ol className="space-y-1 text-xs">
                          {opt.topN.map((n) => (
                            <li key={n.slug} className="flex items-baseline gap-2">
                              <span className="text-[var(--color-muted)] font-mono w-6 shrink-0">
                                {String(n.rank).padStart(2, '0')}
                              </span>
                              <Link
                                href={`/nyc/n/${n.slug}`}
                                className="hover:text-[var(--color-accent)] underline decoration-[var(--color-line)] underline-offset-2 transition truncate"
                              >
                                {n.name}
                              </Link>
                              {n.delta > 5 && (
                                <span className="text-emerald-700 font-mono text-[10px] shrink-0">
                                  ↑{n.delta}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] mb-2">
                          Biggest drops
                        </p>
                        {opt.bottomMovers.length === 0 ? (
                          <p className="text-xs italic text-[var(--color-muted)]">No notable drops.</p>
                        ) : (
                          <ul className="space-y-1 text-xs">
                            {opt.bottomMovers.map((n) => (
                              <li key={n.slug} className="flex items-baseline gap-2">
                                <span className="text-rose-700 font-mono text-[10px] w-8 shrink-0">
                                  ↓{Math.abs(n.delta)}
                                </span>
                                <Link
                                  href={`/nyc/n/${n.slug}`}
                                  className="hover:text-[var(--color-accent)] underline decoration-[var(--color-line)] underline-offset-2 transition truncate"
                                >
                                  {n.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-24 pt-8 border-t border-[var(--color-line)] text-xs text-[var(--color-muted)]">
        Computed at build time. Re-run a build to refresh after question or score changes.
      </footer>
    </main>
  );
}
