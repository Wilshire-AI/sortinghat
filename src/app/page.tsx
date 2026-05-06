import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 sm:py-32 min-h-screen flex flex-col">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Sorting Hat · NYC
        </p>
      </header>

      <section className="mt-20 flex-1">
        <h1 className="font-serif text-4xl sm:text-6xl leading-[1.05] tracking-tight">
          Where in NYC will you actually thrive?
        </h1>
        <p className="mt-8 text-lg leading-relaxed max-w-xl text-[var(--color-ink)]/80">
          A few questions about how you live, what drains you, and what you&rsquo;re building toward —
          and a real answer about which neighborhoods fit who you are.
        </p>

        <div className="mt-14">
          <Link
            href="/quiz"
            className="inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-10 py-4 font-sans text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
          >
            Begin →
          </Link>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            About 4 minutes. No signup required.
          </p>
        </div>
      </section>

      <footer className="mt-24 pt-8 border-t border-[var(--color-line)] text-xs text-[var(--color-muted)]">
        A{" "}
        <a
          href="https://wilshireai.com"
          className="hover:text-[var(--color-accent)] transition"
        >
          Wilshire AI
        </a>{" "}
        product · Manhattan, Brooklyn, Queens, Bronx, Staten Island & near-NJ
      </footer>
    </main>
  );
}
