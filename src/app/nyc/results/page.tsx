import { Suspense } from 'react';
import { ResultsClient } from './results-client';

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    }>
      <ResultsClient />
    </Suspense>
  );
}
