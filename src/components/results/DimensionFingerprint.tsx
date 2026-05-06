import type { Dimension, UserVector } from '@content/types';

export function DimensionFingerprint({
  dimensions,
  vector,
}: {
  dimensions: readonly Dimension[];
  vector: UserVector;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 border-t border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Your lifestyle fingerprint
      </p>
      <h2 className="mt-3 font-serif text-3xl">How you scored across nine dimensions</h2>
      <ul className="mt-10 space-y-7">
        {dimensions.map((d) => {
          const v = vector[d.id] ?? 0;
          const pct = ((v + 1) / 2) * 100;
          return (
            <li key={d.id}>
              <p className="font-serif text-lg">{d.name}</p>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-[var(--color-muted)]">
                <span className="text-right">{d.poles.low}</span>
                <span className="font-mono text-[var(--color-ink)]">{v.toFixed(2)}</span>
                <span>{d.poles.high}</span>
              </div>
              <div className="mt-2 h-px relative bg-[var(--color-line)]">
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]"
                  style={{ left: `calc(${pct}% - 0.3125rem)` }}
                  aria-label={`${d.name} score: ${v.toFixed(2)}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
