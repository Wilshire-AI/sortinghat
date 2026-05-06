import type { Archetype } from '@content/types';

export function ArchetypeBanner({ archetype }: { archetype: Archetype }) {
  return (
    <header className="mx-auto max-w-3xl px-6 pt-16 sm:pt-24 pb-12">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">You are</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-6xl leading-[1.05] tracking-tight">
        {archetype.name}
      </h1>
      <p className="mt-8 text-lg leading-relaxed max-w-2xl text-[var(--color-ink)]/85">
        {archetype.identity}
      </p>
    </header>
  );
}
