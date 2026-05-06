# Sorting Hat POC — Deployment Status

**Live:** https://sortinghat.wilshireai.com/
**Repo:** https://github.com/Wilshire-AI/sortinghat (public)
**Spec:** `/Users/matt/wilshireai/docs/superpowers/specs/2026-05-06-sortinghat-v1-design.md`
**Plan:** `/Users/matt/wilshireai/docs/superpowers/plans/2026-05-06-sortinghat-v1.md`

## What ships in this POC

- Landing → 18-question quiz → results with top-5 NYC-metro neighborhood matches
- 8 archetypes × 113 neighborhoods across NYC, NJ, Westchester, Long Island, and CT
- 11 lifestyle dimensions, hand-tuned scores per neighborhood
- Pure-functional engine (Euclidean distance scoring, archetype matching)
- Editorial UI (Fraunces serif + Inter sans, cream/ink/terracotta)
- Per-neighborhood deep-dive pages at `/nyc/n/[slug]`
- Lifestyle fingerprint visualization
- Anonymous-shareable URLs (URL-encoded fingerprint, no DB needed)
- Web Share API + clipboard fallback for sharing

## Stack

- Next.js 16 + React 19 + TypeScript strict
- Tailwind v4 (CSS-first config in `globals.css`)
- Vitest unit tests
- `output: 'export'` static site, deployed on Vercel

## What's deferred to v1 (per spec)

- Vercel Postgres + saved-result `/results/[shareId]` URLs
- Auth.js magic-link signup
- LLM-generated (archetype × neighborhood) prose matrix (~1,440 passages); POC uses neighborhood base passages
- Per-result OG image generation
- Real photography (currently uses generated borough SVG heroes)
- Real photography (POC uses borough-themed CSS gradients)
- Sentry, accessibility deep-pass, perf optimization
- Trademark resolution on "Sorting Hat" name

## When you return — recommended next steps

1. **Take the quiz.** Verify the recommendations feel right for several different answer patterns. Spot-check a few neighborhood deep-dive pages.
2. **Finish Vercel domain setup.** The Vercel project should own `sortinghat.wilshireai.com`; Cloudflare should have a DNS-only `sortinghat` CNAME pointing at Vercel's required target.
3. **Decide on the name.** "Sorting Hat" is a Warner Bros / J.K. Rowling trademark. Variants: The Sorter, Roost, Bearings, Hearth, Habitat, The Local.
4. **Audit the editorial content.** Each `content/neighborhoods.ts` entry has hand-written `whyItFits` / `whoThrivesHere` / `tradeoffs`. They're decent first drafts but you'll have stronger opinions on tone — easiest to PR a batch at a time.
5. **Plan v1 build.** The next big chunks are: Postgres + save flow, auth, saved-result URLs, and richer generated prose.

## Quick reference

```bash
cd /Users/matt/sortinghat
npm test
npm run dev      # local dev
npm run build    # static export → out/
npm run lint     # eslint clean
```
