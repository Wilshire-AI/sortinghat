'use client';

import { useState } from 'react';
import type { Dimension, Neighborhood } from '@content/types';

type Props = {
  neighborhood: Neighborhood;
  dimensions: readonly Dimension[];
};

// Translate a numeric score into plain-language about the neighborhood,
// keyed off the dimension's own pole text.
function interpretScore(value: number, low: string, high: string): string {
  const abs = Math.abs(value);
  if (abs < 0.15) return 'Neutral / mixed';
  const poleText = (value > 0 ? high : low).split('.')[0].trim();
  let prefix = '';
  if (abs >= 0.75) prefix = 'Strong: ';
  else if (abs >= 0.4) prefix = 'Leans: ';
  else prefix = 'Slight: ';
  return prefix + poleText;
}

export function NeighborhoodScoreTable({ neighborhood, dimensions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-14 pt-10 border-t border-[var(--color-line)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 text-left hover:text-[var(--color-accent)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
        aria-expanded={open}
      >
        <h2 className="font-serif text-2xl">How {neighborhood.name} scores on each dimension</h2>
        <span
          className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] mt-2"
          aria-hidden
        >
          {open ? 'Hide ↑' : 'Show ↓'}
        </span>
      </button>

      {open && (
        <div className="mt-6">
          <p className="text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
            These are the engine&rsquo;s editorial ratings for this place across the
            dimensions the quiz tests. Your fit comes from how closely your answers
            align with these. Numbers are on a -1 to +1 scale.
          </p>
          <ul className="mt-6 space-y-4 text-sm">
            {dimensions.map((d) => {
              const v = neighborhood.scores[d.id] ?? 0;
              const interpretation = interpretScore(v, d.poles.low, d.poles.high);
              return (
                <li
                  key={d.id}
                  className="border-b border-[var(--color-line)] last:border-b-0 pb-3 last:pb-0"
                >
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium">{d.name}</span>
                    <span className="font-mono text-[var(--color-muted)] text-xs tabular-nums">
                      {v >= 0 ? '+' : ''}
                      {v.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted)] italic leading-relaxed">
                    {interpretation}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
