import Link from 'next/link';
import { dimensions } from '@content/dimensions';
import { questions } from '@content/questions';
import { neighborhoods } from '@content/neighborhoods';
import { archetypes } from '@content/archetypes';
import photos from '@content/neighborhood-photos.json';

export const metadata = {
  title: 'Methodology · Sorting Hat',
  description:
    'How Sorting Hat scores neighborhoods: 16 lifestyle dimensions, 22 questions, and the engine that turns honest answers into ranked fits.',
};

function countByKey<T, K extends string>(items: readonly T[], key: (t: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export default function MethodologyPage() {
  const questionsByKind = countByKey(questions, (q) => q.kind);
  const dimsByKind = countByKey(dimensions, (d) => d.kind);
  const photoCount = Object.keys(photos as Record<string, unknown>).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
      >
        ← Sorting Hat
      </Link>

      <p className="mt-12 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Methodology
      </p>
      <h1 className="mt-3 font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight">
        How this works
      </h1>

      <p className="mt-10 text-lg leading-relaxed text-[var(--color-ink)]/85">
        Sorting Hat is a psychographic neighborhood recommender. It asks {questions.length} questions
        about how you actually live, scores you on {dimensions.length} lifestyle dimensions, and
        ranks {neighborhoods.length} neighborhoods across the NYC metro by fit. The goal is to
        surface places where you&rsquo;d genuinely thrive, with honest tradeoffs called out — not
        broker copy.
      </p>

      <section className="mt-16">
        <h2 className="font-serif text-3xl">The dimensions</h2>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/80">
          Every neighborhood is scored on these {dimensions.length} dimensions. Each score lives in
          [-1, 1]. {dimsByKind['symmetric']} are <em>symmetric</em> (both poles are real lived
          preferences — landing on the wrong one hurts in either direction).{' '}
          {dimsByKind['asymmetric_need']} are <em>asymmetric needs</em> (only the high end is an
          active preference; landing low just means &ldquo;not a driver&rdquo; and the
          neighborhood&rsquo;s abundance can&rsquo;t hurt you).
        </p>

        <ul className="mt-8 space-y-6">
          {dimensions.map((d) => (
            <li key={d.id} className="border-t border-[var(--color-line)] pt-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-serif text-xl">{d.name}</h3>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  {d.kind === 'symmetric' ? 'Symmetric' : 'Asymmetric need'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/75">
                {d.description}
              </p>
              <p className="mt-3 text-xs text-[var(--color-muted)]">
                <span className="font-medium">Low</span> · {d.poles.low}{' '}
                <span className="mx-2">·</span>{' '}
                <span className="font-medium">High</span> · {d.poles.high}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-3xl">The questions</h2>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/80">
          Across the {questions.length} questions, three formats appear:
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--color-ink)]/80">
          <li>
            <b>Forced-choice</b> ({questionsByKind['forced_choice']}). Two or three mutually
            exclusive options. Each option contributes a small impact to one or more dimensions.
          </li>
          <li>
            <b>Slider</b> ({questionsByKind['slider']}). A 5-point agree/disagree scale on a
            single declarative statement. Snaps to {[-1, -0.5, 0, 0.5, 1].join(', ')}.
          </li>
          <li>
            <b>Multi-select</b> ({questionsByKind['multi_select']}). Checkboxes. Used for
            cultural-community tags and non-negotiable filters.
          </li>
        </ul>
        <p className="mt-6 leading-relaxed text-[var(--color-ink)]/80">
          The vector of dimension scores is <em>derived</em> from your answers, not accumulated.
          Editing an earlier answer recomputes everything from scratch — no drift across
          back-navigation.
        </p>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-3xl">The math</h2>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/80">
          For each neighborhood, the engine measures how far its profile sits from yours, dimension
          by dimension. Symmetric dimensions contribute the squared difference in either
          direction. Asymmetric-need dimensions contribute the squared <em>shortfall</em> only —
          if the neighborhood over-delivers what you&rsquo;d already deemed unimportant, no penalty.
          Distances are mapped to a 0&ndash;100% match score.
        </p>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/80">
          A small cultural-tag boost (+8% per match, capped) rewards alignment between cultural
          communities you selected and the neighborhood&rsquo;s tagged communities. Non-negotiable
          must-haves operate as hard filters — neighborhoods that fail any one are excluded from
          the ranked list entirely, with the failing constraint surfaced so you can see why.
        </p>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-3xl">Where the data comes from</h2>
        <ul className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--color-ink)]/80">
          <li>
            <b>Editorial scoring</b> on most dimensions (urban-intensity, social-register,
            visitor-facing-energy, daily-life-walkability, etc.) is the result of a dual-model
            pass: two large language models score every neighborhood independently at maximum
            reasoning depth, the scores are averaged within a tight disagreement bound, and edge
            cases are reconciled by hand.
          </li>
          <li>
            <b>School-quality scores</b> use NY State DOE data plus Niche as a cross-reference,
            normalized to the same [-1, 1] scale.
          </li>
          <li>
            <b>Commute minutes</b> are computed door-to-door via the Google Routes API for nine
            office clusters across NYC, NJ, and Connecticut. Editorial overrides patch a few cases
            where automated routing misreads available transit (e.g., the Metro-North New Canaan
            branch).
          </li>
          <li>
            <b>Cultural tags, housing types, car-dependence flags</b> are hand-curated from on-the-ground
            knowledge of the neighborhoods.
          </li>
          <li>
            <b>Neighborhood photographs</b> ({photoCount} of {neighborhoods.length}) are sourced
            from Wikipedia&rsquo;s lead images, with attribution and license shown on each
            neighborhood page. The remaining neighborhood falls back to an illustrated borough
            hero.
          </li>
        </ul>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-3xl">Archetypes</h2>
        <p className="mt-4 leading-relaxed text-[var(--color-ink)]/80">
          Each result page opens with a named archetype: a {archetypes.length}-way clustering of
          common lifestyle profiles in this metro. The match is the archetype whose profile sits
          closest to your vector. The archetype label is descriptive, not prescriptive — your
          ranked neighborhoods come from your actual vector, not the archetype&rsquo;s.
        </p>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-3xl">Honest limitations</h2>
        <ul className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--color-ink)]/80">
          <li>
            <b>Coverage skews where users actually move.</b> Manhattan, Brooklyn, Queens, NJ
            commuter belt, lower Westchester, southern CT, near-LI suburbs are well-mapped. The
            Bronx (Riverdale) and Staten Island (St. George) are intentionally lighter — most
            users moving into the metro don&rsquo;t consider them.
          </li>
          <li>
            <b>Suburbs share an engine designed for urban tradeoffs.</b> Family-trajectory and
            school-quality dominate suburb scoring, which is roughly right but flattens differences
            among, say, Westchester villages. A separate suburb-tier calibration is on the
            roadmap.
          </li>
          <li>
            <b>Cultural-community granularity is coarse.</b> &ldquo;East Asian&rdquo; bundles
            Chinese, Korean, Japanese, and Taiwanese communities; &ldquo;Latin American&rdquo;
            bundles Mexican, Dominican, Puerto Rican, Colombian, and Ecuadorian. Splitting these
            is on the roadmap.
          </li>
          <li>
            <b>Bundled neighborhoods get a single hero photo.</b> Areas like Nolita / Little Italy
            and Flatiron / NoMad each show one Wikipedia photo of one half of the bundle.
          </li>
          <li>
            <b>The map color gradient is stretched to your range.</b> Worst score in your list
            renders red, best renders green, so the map stays readable even when raw scores cluster.
            Don&rsquo;t read the colors as absolute fits.
          </li>
        </ul>
      </section>

      <p className="mt-16 text-sm text-[var(--color-muted)]">
        Want to see how individual answers move neighborhoods up or down in the ranking?{' '}
        <Link href="/methodology/sandbox" className="underline hover:text-[var(--color-accent)] transition">
          Open the sandbox
        </Link>
        {' '}— same engine as the real quiz, with a live ranking panel. Or browse a static
        per-question{' '}
        <Link href="/methodology/paths" className="underline hover:text-[var(--color-accent)] transition">
          paths report
        </Link>{' '}showing which neighborhoods each answer pulls toward. For the inverse view —
        what fraction of quiz combinations land each neighborhood in the user&rsquo;s top results —{' '}
        <Link href="/methodology/reachability" className="underline hover:text-[var(--color-accent)] transition">
          path reachability
        </Link>.
      </p>

      <footer className="mt-24 pt-8 border-t border-[var(--color-line)] text-xs text-[var(--color-muted)]">
        A{' '}
        <a href="https://wilshireai.com" className="hover:text-[var(--color-accent)] transition">
          Wilshire AI
        </a>{' '}
        project.
      </footer>
    </main>
  );
}
