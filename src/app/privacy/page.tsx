import Link from 'next/link';
import { ResetDataButton } from '@/components/results/ResetDataButton';

export const metadata = {
  title: 'Privacy and your data · Sorting Hat',
  description:
    'What Sorting Hat stores about you (very little) and how to clear it.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
      >
        ← Sorting Hat
      </Link>

      <p className="mt-12 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
        Privacy and your data
      </p>
      <h1 className="mt-3 font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight">
        What we store about you
      </h1>

      <section className="mt-10">
        <p className="text-base leading-relaxed text-[var(--color-ink)]/85">
          Sorting Hat is a static site with no backend, no auth, and no analytics.
          The only thing we store is your in-progress quiz answers, kept locally
          in your browser so you can refresh the page or come back later without
          losing progress.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">What&rsquo;s stored</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-ink)]/80">
          <li>
            <b>Quiz answers</b> in your browser&rsquo;s <code className="bg-[var(--color-ink)]/[0.04] px-1 rounded text-xs">localStorage</code>{' '}
            under the key <code className="bg-[var(--color-ink)]/[0.04] px-1 rounded text-xs">sortinghat:quiz-answers</code>.
            Cleared automatically when you finish the quiz and click &ldquo;Retake&rdquo; — or manually via the button below.
          </li>
          <li>
            <b>Your fingerprint in the URL</b> after you finish the quiz (the{' '}
            <code className="bg-[var(--color-ink)]/[0.04] px-1 rounded text-xs">?f=...</code>{' '}
            parameter on the results page). It encodes your dimension scores and selected tags so the same URL re-creates the same results. It&rsquo;s not stored on any server. Sharing the URL shares the encoded fingerprint.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">What we don&rsquo;t store</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--color-ink)]/80">
          <li>No cookies.</li>
          <li>No analytics or tracking pixels.</li>
          <li>No third-party scripts.</li>
          <li>No server-side database. Sorting Hat is a static site.</li>
          <li>No personal information ever leaves your browser.</li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-2xl">Clear my data</h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-ink)]/85">
          One click removes the locally stored quiz answers from your browser. If you also have a results URL bookmarked, delete that bookmark to remove the encoded fingerprint.
        </p>
        <div className="mt-6">
          <ResetDataButton />
        </div>
      </section>

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
