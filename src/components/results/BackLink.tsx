'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function BackLink() {
  const sp = useSearchParams();
  const f = sp.get('f');
  const href = f ? `/nyc/results?f=${f}` : '/';
  const label = f ? '← Your results' : '← Sorting Hat';
  return (
    <Link
      href={href}
      className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition"
    >
      {label}
    </Link>
  );
}
