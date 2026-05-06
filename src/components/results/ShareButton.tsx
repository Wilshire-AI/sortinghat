'use client';
import { useState } from 'react';

export function ShareButton({ archetypeName }: { archetypeName: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: `Sorting Hat: ${archetypeName}`,
          url,
        });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // ignore — clipboard might not be available
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full border border-[var(--color-ink)] px-7 py-3 text-sm tracking-wide hover:bg-[var(--color-ink)] hover:text-[var(--color-bg)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]"
    >
      {copied ? 'Link copied!' : 'Send to a friend →'}
    </button>
  );
}
