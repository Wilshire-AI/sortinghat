'use client';

import Link from 'next/link';
import { clearStoredQuizAnswers } from './useQuizState';

export function BeginButton() {
  return (
    <Link
      href="/nyc/quiz"
      onClick={clearStoredQuizAnswers}
      className="inline-block rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-10 py-4 font-sans text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
    >
      Begin →
    </Link>
  );
}
