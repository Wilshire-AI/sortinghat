'use client';

import { useState } from 'react';

const STORAGE_KEY = 'sortinghat:quiz-answers';

export function ResetDataButton() {
  const [state, setState] = useState<'idle' | 'confirming' | 'cleared'>('idle');

  const handleClear = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Disabled storage / private mode — nothing to do.
    }
    setState('cleared');
  };

  if (state === 'cleared') {
    return (
      <p className="text-sm leading-relaxed text-[var(--color-ink)]/85">
        Cleared. Your local quiz answers are gone. If you have a results URL bookmarked,
        delete that bookmark to remove the encoded fingerprint as well.
      </p>
    );
  }

  if (state === 'confirming') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] px-6 py-2.5 text-sm tracking-wide hover:opacity-90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
        >
          Yes, clear it
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setState('confirming')}
      className="rounded-full border border-[var(--color-ink)] text-[var(--color-ink)] px-6 py-2.5 text-sm tracking-wide hover:bg-[var(--color-ink)] hover:text-[var(--color-bg)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
    >
      Clear my quiz data
    </button>
  );
}
