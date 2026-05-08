import Link from 'next/link';
import { questions } from '@content/questions';
import { dimensions } from '@content/dimensions';
import { neighborhoods } from '@content/neighborhoods';
import { runMonteCarloReachability } from '../../../../tests/monte-carlo/simulate';

export const metadata = {
  title: 'Path reachability · Sorting Hat',
  description: 'For each neighborhood, what fraction of quiz answer combinations land it in the user\'s top results.',
};

const SAMPLES = 5000;
const SEED = 42;
const TOP_K = [1, 3, 5, 10] as const;

export default function ReachabilityPage() {
  const result = runMonteCarloReachability({
    samples: SAMPLES,
    seed: SEED,
    topK: TOP_K,
    questions,
    dimensions,
    neighborhoods,
  });

  type Row = {
    id: string;
    name: string;
    borough: string;
    counts: Record<number, number>;
  };

  const rows: Row[] = neighborhoods.map((n) => ({
    id: n.id,
    name: n.name,
    borough: n.borough,
    counts: result.perNeighborhood[n.id] ?? { 1: 0, 3: 0, 5: 0, 10: 0 },
  }));

  rows.sort((a, b) => (b.counts[3] ?? 0) - (a.counts[3] ?? 0));

  const pct = (n: number) => ((n / SAMPLES) * 100).toFixed(1);

  const voiceless = rows.filter((r) => (r.counts[10] ?? 0) === 0);
  const dominant = rows.filter((r) => (r.counts[3] ?? 0) > SAMPLES * 0.10);
  const reachable = rows.filter((r) => (r.counts[10] ?? 0) > 0).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/methodology"
        className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
      >
        ← Methodology
      </Link>

      <h1 className="mt-6 font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight font-medium">
        Path reachability
      </h1>

      <p className="mt-6 text-base leading-relaxed text-[var(--color-ink)]/85 max-w-2xl">
        For each neighborhood, how often it lands in the user&rsquo;s top-N results
        across {SAMPLES.toLocaleString()} random quiz paths. Useful for spotting
        neighborhoods that dominate (over-represented) or that almost no path
        ever surfaces (voiceless).
      </p>

      <p className="mt-3 text-sm text-[var(--color-muted)] max-w-2xl">
        Method: {SAMPLES.toLocaleString()} synthetic users with uniformly-random
        answers (must-haves and commute targets excluded so the geometry of the
        engine is what&rsquo;s measured). Deterministic seed = {SEED}.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-sm border border-[var(--color-line)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Reachable</p>
          <p className="mt-2 font-serif text-3xl">
            {reachable} <span className="text-base text-[var(--color-muted)]">/ {neighborhoods.length}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">land in top 10 at least once</p>
        </div>
        <div className="rounded-sm border border-[var(--color-line)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Dominant (top 3 &gt; 10%)</p>
          <p className="mt-2 font-serif text-3xl">{dominant.length}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">over-represented vs cohort</p>
        </div>
        <div className="rounded-sm border border-[var(--color-line)] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Voiceless</p>
          <p className="mt-2 font-serif text-3xl">{voiceless.length}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">never reach top 10</p>
        </div>
      </div>

      <div className="mt-12 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)] border-b border-[var(--color-line)]">
            <tr>
              <th className="text-left py-3 pr-4 font-normal">Neighborhood</th>
              <th className="text-left py-3 pr-4 font-normal">Borough</th>
              <th className="text-right py-3 px-3 font-normal">Top 1</th>
              <th className="text-right py-3 px-3 font-normal">Top 3</th>
              <th className="text-right py-3 px-3 font-normal">Top 5</th>
              <th className="text-right py-3 px-3 font-normal">Top 10</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isVoiceless = (r.counts[10] ?? 0) === 0;
              const isDominant = (r.counts[3] ?? 0) > SAMPLES * 0.10;
              return (
                <tr
                  key={r.id}
                  className={
                    'border-b border-[var(--color-line)]/50 ' +
                    (isVoiceless ? 'opacity-50' : '')
                  }
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/nyc/n/${r.id}`}
                      className="hover:text-[var(--color-accent)] transition"
                    >
                      {r.name}
                    </Link>
                    {isDominant && (
                      <span className="ml-2 text-xs text-[var(--color-muted)]">dominant</span>
                    )}
                    {isVoiceless && (
                      <span className="ml-2 text-xs text-[var(--color-muted)]">voiceless</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-[var(--color-muted)]">{r.borough}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(r.counts[1] ?? 0)}%</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{pct(r.counts[3] ?? 0)}%</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(r.counts[5] ?? 0)}%</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(r.counts[10] ?? 0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-12 text-xs text-[var(--color-muted)] max-w-2xl">
        Sorted by top-3 share descending. Percentages are out of {SAMPLES.toLocaleString()} samples;
        a 1.0% reading has roughly ±0.3pp standard error. Compare neighborhoods within a borough
        to spot lane-twins (similar profiles competing for the same paths) vs underserved profiles.
      </p>
    </main>
  );
}
