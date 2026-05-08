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
        <h1 className="font-serif text-5xl sm:text-7xl leading-[0.98] tracking-tight">
          The New York
          <br />
          that fits you.
        </h1>
        <p className="mt-10 text-lg leading-relaxed max-w-xl text-[var(--color-ink)]/80">
          A short quiz. Honest answers about the neighborhoods you&rsquo;d actually thrive in,
          based on how you live and what you value.
        </p>

        <div className="mt-14">
          <Link
            href="/nyc/quiz"
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
        project · Manhattan, Brooklyn, Queens, Bronx, Staten Island & near-NJ ·{" "}
        <Link href="/methodology" className="hover:text-[var(--color-accent)] transition">
          Methodology
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:text-[var(--color-accent)] transition">
          Privacy
        </Link>
      </footer>
    </main>
  );
}
