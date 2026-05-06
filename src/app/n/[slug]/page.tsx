import Link from 'next/link';
import { notFound } from 'next/navigation';
import { neighborhoodBySlug, neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';

export async function generateStaticParams() {
  return neighborhoods.map((n) => ({ slug: n.slug }));
}

const boroughLabel: Record<string, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'The Bronx',
  'staten-island': 'Staten Island',
  nj: 'New Jersey',
};

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const n = neighborhoodBySlug(slug);
  if (!n) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
      >
        ← Sorting Hat
      </Link>

      <p className="mt-12 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        {boroughLabel[n.borough]}
      </p>
      <h1 className="mt-3 font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight">
        {n.name}
      </h1>

      <div className={`mt-12 borough-${n.borough} aspect-[3/2] rounded-sm`} />

      <section className="mt-14">
        <h2 className="font-serif text-2xl">Why people live here</h2>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/85">{n.basePassages.whyItFits}</p>
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-2xl">Who thrives here</h2>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/85">{n.basePassages.whoThrivesHere}</p>
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-2xl">The tradeoffs</h2>
        <ul className="mt-4 space-y-3">
          {n.basePassages.tradeoffs.map((t, i) => (
            <li key={i} className="leading-relaxed text-[var(--color-ink)]/75">— {t}</li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-2xl">Anchors</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="uppercase tracking-[0.22em] text-xs text-[var(--color-muted)]">Transit</dt>
            <dd className="mt-1">{n.anchors.transit.join(' · ')}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.22em] text-xs text-[var(--color-muted)]">Parks</dt>
            <dd className="mt-1">{n.anchors.parks.join(' · ')}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.22em] text-xs text-[var(--color-muted)]">Groceries</dt>
            <dd className="mt-1">{n.anchors.groceries.join(' · ')}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-14 pt-10 border-t border-[var(--color-line)]">
        <h2 className="font-serif text-2xl">Lifestyle scores</h2>
        <ul className="mt-6 space-y-3 text-sm">
          {dimensions.map((d) => {
            const v = n.scores[d.id] ?? 0;
            return (
              <li key={d.id} className="flex justify-between">
                <span>{d.name}</span>
                <span className="font-mono text-[var(--color-muted)]">
                  {v >= 0 ? '+' : ''}
                  {v.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-20 pt-8 border-t border-[var(--color-line)] text-xs text-[var(--color-muted)]">
        <Link href="/quiz" className="hover:text-[var(--color-accent)] transition">
          Take the quiz to see if {n.name} fits you →
        </Link>
      </footer>
    </main>
  );
}
