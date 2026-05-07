import Link from 'next/link';
import { notFound } from 'next/navigation';
import { neighborhoodBySlug, neighborhoods } from '@content/neighborhoods';
import { dimensions } from '@content/dimensions';
import { NeighborhoodHero, getPhotoCredit } from '@/components/results/NeighborhoodHero';
import { NeighborhoodFitExplanation } from '@/components/results/NeighborhoodFitExplanation';
import { NeighborhoodScoreTable } from '@/components/results/NeighborhoodScoreTable';
import { BackLink } from '@/components/results/BackLink';
import { Suspense } from 'react';

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
  westchester: 'Westchester',
  'long-island': 'Long Island',
  ct: 'Connecticut',
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
      <Suspense fallback={null}>
        <BackLink />
      </Suspense>

      <p className="mt-12 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        {boroughLabel[n.borough]}
      </p>
      <h1 className="mt-3 font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight">
        {n.name}
      </h1>

      <div className="mt-12 aspect-[3/2] rounded-sm overflow-hidden shadow-md">
        <NeighborhoodHero
          neighborhoodId={n.id}
          neighborhoodName={n.name}
          borough={n.borough}
          className="w-full h-full block"
        />
      </div>
      {(() => {
        const credit = getPhotoCredit(n.id);
        if (!credit) return null;
        const showLicenseLink = credit.licenseUrl && credit.license;
        return (
          <p className="mt-2 text-[11px] text-[var(--color-muted)] text-right">
            Photo: {credit.artist ? <a href={credit.commonsUrl} className="underline hover:text-[var(--color-accent)]">{credit.artist}</a> : <a href={credit.commonsUrl} className="underline hover:text-[var(--color-accent)]">Wikimedia Commons</a>}
            {credit.license ? ' · ' : null}
            {showLicenseLink ? <a href={credit.licenseUrl!} className="underline hover:text-[var(--color-accent)]">{credit.license}</a> : credit.license}
          </p>
        );
      })()}

      <Suspense fallback={null}>
        <NeighborhoodFitExplanation neighborhood={n} dimensions={dimensions} />
      </Suspense>

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
            <li key={i} className="leading-relaxed text-[var(--color-ink)]/75">· {t}</li>
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

      <NeighborhoodScoreTable neighborhood={n} dimensions={dimensions} />

      <footer className="mt-20 pt-8 border-t border-[var(--color-line)] text-xs text-[var(--color-muted)]">
        <Link href="/nyc/quiz" className="hover:text-[var(--color-accent)] transition">
          Take the quiz to see if {n.name} fits you →
        </Link>
      </footer>
    </main>
  );
}
