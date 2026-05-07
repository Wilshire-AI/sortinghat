# Sorting Hat — handoff notes

Last updated: end of session 2026-05-07. Production: `https://sortinghat.wilshireai.com/`. Latest commit on `origin/main`: `a2a0c8c`.

This is a handoff for whoever picks up next (you-future, or another agent). Read AGENTS.md for the architectural baseline; this doc captures what changed in the recent push and what's queued.

---

## What's shipped (the big picture)

**Engine grew from 11 → 16 dimensions, survey from 17 → 22 questions.** All 113 neighborhoods scored on all 16 dimensions via Polaris dual-model passes (Codex + Claude xhigh, independent + averaged + disagreements documented under `.polaris/`).

**Five new dimensions added during the recent session:**

| Dimension | Kind | What it tests |
|---|---|---|
| `social-register` | symmetric | Bohemian/progressive ↔ establishment/polished. Splits UES from UWS, Brooklyn Heights from Park Slope. |
| `visitor-facing-energy` | symmetric | Resident-rooted ↔ destination-facing. Splits BPC from Hudson Yards, Carroll Gardens from SoHo. |
| `built-form-register` | symmetric | Prewar/brownstone ↔ modern/amenity-tower. Splits West Village from Hudson Yards. |
| `rootedness-vs-access` | symmetric | Local community ↔ everything-at-fingertips. Closest psychographic proxy for borough identity. |
| `daily-life-walkability` | asymmetric_need | Walking distance to groceries, gyms, fitness studios, daily errands. Discriminates suburb-with-downtown (Larchmont) from car-only (Cresskill). |

**Other shipped this session:**
- Per-neighborhood "How [name] fits you" explanation when arriving from quiz (top 3 alignments + top 3 gaps + overall %)
- Quiz answers persist in localStorage — refresh / browser-close / nav-away all preserve progress
- Excluded neighborhoods now explain *why* they were ruled out ("Ruled out: requires a car for daily life.")
- All neighborhoods (passing + excluded) shown on the map and in the "Where else you might fit" list
- Per-nbhd score table collapsed behind a "Show ↓" toggle
- 904 archetype-specific passages (8 archetypes × 113 neighborhoods) generated via Anthropic Messages API
- Commute-target geography: 9 office clusters (NYC + NJ + 3 CT) with door-to-door minutes via Google Routes API
- Brand icons (favicon, apple-icon, OG image) — programmatic via Next.js metadata routes
- School-quality scores refreshed via Polaris dual-model
- Must-have conflict warnings (inline during quiz when known-impossible pairs are picked)
- Question rewrites: transit-redundancy now 3-way (drive / one transit / multiple), social-register/visitor-facing/built-form questions in plain language, etc.

---

## Open punch list (what's next)

Roughly priority-ordered:

### Tier 1 — Pre-launch blockers
1. **Trademark / rename decision.** "Sorting Hat" is a Warner Bros / J.K. Rowling registered mark. Rename candidates from AGENTS.md §10: The Sorter, Roost, Bearings, Hearth, Habitat. Decide before any public marketing push.
2. **Real photography.** Currently SVG borough heroes (programmatic in `src/components/results/BoroughHero.tsx`). Real photos for top ~30 nbhds + fallback to SVG would meaningfully improve editorial register. Unsplash API was set up but never executed (account approval pending? — confirm via SSM `/wilshireai/prod/unsplash`).
3. **A11y audit.** Forms need keyboard nav + screen reader pass. Quick audit with axe DevTools, fix what surfaces.

### Tier 2 — Real product gaps
4. **Methodology / about page.** Explains the 16 dims, scoring math, data sources (NY State DOE + Niche-as-reference for schools, Google Routes for commute, Polaris dual-model for editorial dims). Useful for journalists, partners, skeptics. Not yet built.
5. **LGBTQ split out of `cultural-communities`.** Currently bundled with ethnic communities (category error both reviewers flagged). Either pull into separate "identity communities" question or rebrand the parent question. Deferred this session.
6. **Conditional follow-ups.** When user picks `top-schools`, ask grade-band (K-5 / middle / high) — Westchester/LI district fit varies dramatically by band. Audit punch list.
7. **Save/share flow with DB.** Vercel Postgres + Auth.js magic-link per the v1 spec at `/Users/matt/wilshireai/docs/superpowers/specs/2026-05-06-sortinghat-v1-design.md`.

### Tier 3 — Operational / longer-term
8. OpenTripPlanner migration (replace Google Routes API with self-hosted GTFS-based routing for better NYC accuracy + zero ongoing cost; ~1-2 days)
9. Bronx / Staten Island expansion (Mott Haven, Stapleton, etc. — currently only Riverdale + St. George)
10. Cultural tag granularity (split East Asian → Korean / Chinese / Japanese / Taiwanese, etc. — audit punch list)
11. Editing answers — the quiz is linear; jumping to "edit Q3 from results" requires clicking back through all questions. UI for "jump to question N" would help.
12. Commute weighting verification — Polaris flagged this once (false alarm; we DO have it via `scoreCommute` in `score.ts`).

---

## Architectural decisions made this session

- **Engine: 16 dimensions, all symmetric or asymmetric_need per `Dimension['kind']`.** Per-neighborhood scoring stays in `content/neighborhoods.ts` literal data; commute minutes side-loaded from `content/commute-minutes.json` (machine-generated, refreshable via `scripts/compute-commutes.mjs`).
- **Per-archetype prose lives in `content/passages/<archetype-id>.json`.** 904 entries. Generated by `scripts/generate-passages.ts` against Anthropic Messages API. Each entry has `reviewedAt: null` to indicate auto-generated; mark reviewed over time as desired.
- **Score-explanation flow:** results page passes user fingerprint to per-nbhd links via `?f=<fingerprint>`. Per-nbhd page reads with `useSearchParams` (client component) and renders `<NeighborhoodFitExplanation>` if present. Direct visitors with no fingerprint see only the static profile.
- **Quiz persistence:** `useQuizState` syncs answers to `localStorage` key `sortinghat:quiz-answers` on every change. Hydrates on mount via useEffect (not useState initializer) to avoid SSR hydration mismatch. Quiz starts at first unanswered question after hydration.
- **Polaris dual-model pattern is now the standard for editorial scoring.** Used for: hasQuietBlocks list, hasFamilyInfrastructure list, school-quality refresh, 3 new dim scoring, rootedness scoring, walkability scoring, and dimension-brainstorm. Pattern: spawn parallel Codex + Claude at xhigh, average within 0.2 disagreement bound, document gaps. Saved outputs under `.polaris/` (gitignored).

---

## Gotchas

- **Suburb scores in `content/neighborhoods.ts` use a hybrid format:** the original `scores: { ... }` line is single-line, but every dim added since uses multi-line append. Scripts that modify `scores` need to handle both formats. See `/tmp/apply_*.mjs` history for working patterns.
- **Persona-fit test vectors must be updated when adding a new dimension.** Otherwise the persona's vector lacks the new dim → defaults to 0 → may produce false-positive cross-borough matches. Same goes for archetype vectors (8 of them).
- **Polaris ephemeral state:** worker outputs aren't retained across session reaps. ALWAYS instruct Polaris to save synthesized scores to a file under `.polaris/` AND inline them in the response. Don't rely on the agent's memory.
- **Vercel auto-deploys on push to `origin/main`.** No manual step. Watch deploy ID change as proof of new build serving.
- **Custom remote URL banner:** the repo moved to `Wilshire-AI/sortinghat`; local remote points to `maplelemondragon/sortinghat` and gets a redirect warning on every push. Run `git remote set-url origin https://github.com/Wilshire-AI/sortinghat.git` when convenient.

---

## Useful files / scripts

- `scripts/compute-commutes.mjs` — pulls Google Maps API key from AWS SSM `/wilshireai/prod/google-maps`, computes 113 × 9 commute matrix. Re-run quarterly for fresh data.
- `scripts/generate-passages.ts` — uses Anthropic API key from `/wilshireai/prod/anthropic`, generates 904 archetype-specific passages. Re-run if archetypes change or to regenerate stale passages.
- `content/commute-minutes-overrides.json` — editorial overrides for cases Google routes poorly (SI Ferry data gap, Metro-North New Canaan Branch). Persists across recomputes.
- `tests/engine/persona-fit.test.ts` — 7 archetypal personas; loose assertion (top 5 contains expected borough). Doesn't test survey→vector mapping, only engine→ranking.
- `.polaris/` — synthesized outputs from dual-model passes. Gitignored. Worth peeking at when curious about specific scoring decisions.

---

## When picking back up

1. Pull latest from `origin/main`
2. `npm install` if anything changed in `package.json`
3. `npm test` to verify clean baseline (should be 74/74)
4. Read the most recent commits to understand what's freshest
5. Check this doc for what's queued
6. Either pick from the punch list or address whatever surfaced from real users since last session

End.
