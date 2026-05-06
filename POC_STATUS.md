# Sorting Hat POC — Deployment Status

**Live:** https://maplelemondragon.github.io/sortinghat/
**Repo:** https://github.com/maplelemondragon/sortinghat (public)
**Spec:** `/Users/matt/wilshireai/docs/superpowers/specs/2026-05-06-sortinghat-v1-design.md`
**Plan:** `/Users/matt/wilshireai/docs/superpowers/plans/2026-05-06-sortinghat-v1.md`

## What ships in this POC

- Landing → 14-question quiz → results with top-5 NYC neighborhood matches
- 8 archetypes × 25 neighborhoods (representative slice across all 6 boroughs)
- 9 lifestyle dimensions, hand-tuned scores per neighborhood
- Pure-functional engine (Euclidean distance scoring, archetype matching)
- Editorial UI (Fraunces serif + Inter sans, cream/ink/terracotta)
- Per-neighborhood deep-dive pages at `/n/[slug]` (25 routes)
- Lifestyle fingerprint visualization
- Anonymous-shareable URLs (URL-encoded fingerprint, no DB needed)
- Web Share API + clipboard fallback for sharing

## Stack

- Next.js 16 + React 19 + TypeScript strict
- Tailwind v4 (CSS-first config in `globals.css`)
- Vitest unit tests (38 passing)
- `output: 'export'` static site, deployed to GitHub Pages via Actions

## What's deferred to v1 (per spec)

- Vercel deployment + custom domain at `sortinghat.wilshireai.com` (POC pivoted to GH Pages because Vercel CLI auth is browser-only)
- Vercel Postgres + saved-result `/results/[shareId]` URLs
- Auth.js magic-link signup
- LLM-generated (archetype × neighborhood) prose matrix (~1,440 passages); POC uses neighborhood base passages
- Per-result OG image generation
- Full ~80 neighborhood coverage (POC has 25)
- Real photography (POC uses borough-themed CSS gradients)
- Sentry, accessibility deep-pass, perf optimization
- Trademark resolution on "Sorting Hat" name

## When you return — recommended next steps

1. **Take the quiz.** Verify the recommendations feel right for several different answer patterns. Spot-check a few neighborhood deep-dive pages.
2. **Decide on hosting target.** Two clean paths:
   - **Stay on GitHub Pages:** free forever, works as-is. Need to manually map a custom domain (`sortinghat.wilshireai.com` → CNAME to `maplelemondragon.github.io`) in Cloudflare.
   - **Move to Vercel:** unlocks DB + auth path for v1. `vercel login` from terminal, then `vercel link`, set env vars, remove `output: 'export'` from `next.config.ts`, deploy.
3. **Decide on the name.** "Sorting Hat" is a Warner Bros / J.K. Rowling trademark — fine for prototype phase, real risk if visibility grows. Variants: The Sorter, Roost, Bearings, Hearth, Habitat, The Local. The repo name + URL are easy to change before any meaningful launch.
4. **Audit the editorial content.** Each `content/neighborhoods.ts` entry has hand-written `whyItFits` / `whoThrivesHere` / `tradeoffs`. They're decent first drafts but you'll have stronger opinions on tone — easiest to PR a batch at a time.
5. **Plan v1 build.** The full plan in `2026-05-06-sortinghat-v1.md` has 50 ordered tasks; the POC has completed roughly tasks 1-26 in lighter form. The next big chunks are: Postgres + save flow (Milestone 5), full content authoring (Milestone 8), production deploy on real domain (Milestone 9).

## Quick reference

```bash
cd /Users/matt/sortinghat
npm test         # 38 tests
npm run dev      # local dev
npm run build    # static export → out/
npm run lint     # eslint clean
```

Workflow at `.github/workflows/pages.yml` rebuilds + redeploys on every push to `main`.
