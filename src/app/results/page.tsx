import Link from 'next/link';
import { redirect } from 'next/navigation';
import { decodeFingerprint } from '@/lib/engine/vector';
import { rankNeighborhoods } from '@/lib/engine/score';
import { matchArchetype } from '@/lib/engine/archetype';
import { resolveCardProse } from '@/lib/engine/explain';
import { neighborhoods } from '@content/neighborhoods';
import { archetypes } from '@content/archetypes';
import { dimensions } from '@content/dimensions';
import { ArchetypeBanner } from '@/components/results/ArchetypeBanner';
import { NeighborhoodCard } from '@/components/results/NeighborhoodCard';
import { DimensionFingerprint } from '@/components/results/DimensionFingerprint';
import { ShareButton } from '@/components/results/ShareButton';

type Props = { searchParams: Promise<{ f?: string }> };

export default async function ResultsPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.f) redirect('/quiz');

  let decoded;
  try {
    decoded = decodeFingerprint(params.f);
  } catch {
    redirect('/quiz');
  }

  const dimIds = dimensions.map((d) => d.id);
  const archetype = matchArchetype(decoded.vector, archetypes, dimIds);
  const ranked = rankNeighborhoods(decoded.vector, neighborhoods, dimIds, 5);

  return (
    <main className="min-h-screen">
      <ArchetypeBanner archetype={archetype} />

      <div className="mx-auto max-w-3xl px-6 pb-2 flex flex-wrap items-center gap-4">
        <ShareButton archetypeName={archetype.name} />
        <Link
          href="/quiz"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
        >
          Retake the quiz
        </Link>
      </div>

      <section className="mx-auto max-w-3xl px-6 pt-12">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Your top five matches
        </p>
        {ranked.map((r, i) => {
          const prose = resolveCardProse(r.neighborhood, undefined);
          return (
            <NeighborhoodCard
              key={r.neighborhood.id}
              rank={i + 1}
              neighborhood={r.neighborhood}
              prose={prose}
              score={r.score}
            />
          );
        })}
      </section>

      <DimensionFingerprint dimensions={dimensions} vector={decoded.vector} />

      <footer className="mx-auto max-w-3xl px-6 py-12 text-xs text-[var(--color-muted)] border-t border-[var(--color-line)]">
        A{' '}
        <a href="https://wilshireai.com" className="hover:text-[var(--color-accent)] transition">
          Wilshire AI
        </a>{' '}
        product
      </footer>
    </main>
  );
}
