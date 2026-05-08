# Sorting Hat — handoff notes

Last updated: end of session 2026-05-08. Production: `https://sortinghat.wilshireai.com/`. Latest commit on `origin/main`: `48c9536`.

This is a handoff for whoever picks up next (you-future, or another agent). Read AGENTS.md for the architectural baseline; this doc captures what changed in the recent sessions and what's queued.

---

## What's shipped (the big picture, current state)

**Engine: 17 lifestyle dimensions, 21 questions, 113 neighborhoods.** All scored via Polaris dual-model passes (Codex + Claude xhigh, parallel + averaged + disagreements documented under `.polaris/`). Live at `https://sortinghat.wilshireai.com/`.

**The 2026-05-07 → 2026-05-08 session was a big engine + UX cleanup pass.** It started with a Wikipedia-photo wiring task, then a full Polaris cross-model audit of the quiz turned up multiple structural issues, and we worked through them.

### Major changes this session (2026-05-08)

**Engine math fixes (the load-bearing ones):**
- **Asymmetric-need + symmetric "user=0 → no penalty"** unified. Previously a default-zero user value (skipped question or "either" middle option) silently penalized neighborhoods scored away from zero on symmetric dimensions, and on asymmetric dims it penalized those scored below zero. Both kinds now treat `user === 0` as "no preference, no penalty." The right semantic; eliminates a class of "weird Q1 ranking" bugs.
- **Slider/forced-choice overwrite bug fixed.** The `friction-tolerance` slider SET friction-sensitivity, wiping the +0.7 ADD from `noise-tolerance` (Q7). Q7's friction signal was effectively dead code. Resolved by dropping the slider and keeping Q7 as the single source.

**Question structural changes:**
- **Q1 (transit-redundancy):** "multiple options" now hits `urban-intensity-tolerance: +0.4` (logical entailment — multi-transit only exists in dense urban areas in NYC metro). "I'd drive" now uses `softPrefs: ['car-friendly']` instead of the old hidden urban-intensity penalty.
- **Q2 (was prestige-vs-space, now access-vs-space):** reframed away from prestige toward urban-intensity + space tradeoff (more universal axis).
- **Q3 (family-trajectory):** changed `kind` from `symmetric` to `asymmetric_need`. Picking "no kids" no longer penalizes family-coded nbhds.
- **Q4 (NEW — income-tier-fit):** resurrects `prestige-orientation` (previously inert). Asks income/polish tier rather than fame; rescued ~12 voiceless nbhds.
- **Q6 (creative-immersion):** rewritten as a slider on creative-energy (was forced_choice). Concise Likert: "I want art galleries and indie music venues on my own block."
- **Q7 (was noise-tolerance-fit, kept the same dim):** vignette structure preserved.
- **Q8 (commute-personality)** dropped — redundant with Q1 (transit-psychology) + Q7 (friction-sensitivity).
- **Q9 (weekend-life):** stripped two hidden side-effects (creative-energy on "in the city," friction on "slow morning").
- **Q11 (green-need):** reframed as single-axis park importance (was a false dichotomy with restaurants/bars).
- **Q14 (apartment-size-feel)** dropped — strict subset of Q2.
- **Q15 (friction-tolerance slider)** dropped — overwrite bug, see above.
- **Q21 (must-haves):** capped at 3 selections via `maxSelections`.
- **`commute-tolerance`** marked `maxSelections: 1` (type-clarity; UI was already single-pick).
- **Conditional skip:** if `commute-target` is only "remote" / "other," `commute-tolerance` is skipped automatically (works in forward-nav, back-nav, and resume effect).
- **Concision pass:** all 21 prompts ≤ 12 words; helper texts ≤ 18.

**New dimension: `streetscape-quality` (17th).** Asymmetric_need; captures stroll-worthy character (tree-lined blocks, brownstones, water-adjacent, café spillover). Distinct from `daily-life-walkability` (errand reach) and `environmental-openness` (parks). 113 nbhd scores + 8 archetype scores from Polaris dual-model. Hudson Yards now correctly ranks low on streetscape (functional walkability ≠ stroll pleasure); West Village / Park Slope / Brooklyn Heights / Greenwich Village / Carroll Gardens top the list.

**New mechanism: `softPrefs` channel.** ForcedChoice options can include `softPrefs: ['car-friendly', ...]`. Threaded through DerivedState, fingerprint encoding, scoring (`+5%` boost). Currently used for Q1 "I'd drive" → boost car-dependent nbhds.

**Engine UX:**
- **Always render rankings.** Empty-state (when must-haves filter excludes everyone) used to hijack the whole page. Now renders a banner + the full ranked list (with `failedMustHaves` annotations on excluded entries) + the map.
- **"Same fit tier" callout** per top match. Cards in headline top-N show 1-3 peers within 2% of their score (Polaris-reviewed UX choice). Surfaces the cluster reality (Park Slope / Cobble Hill / Carroll Gardens / Brooklyn Heights are equivalents for the same user) without paradigm shift.
- **Live "what's moving" panel** below each quiz question. Collapsed by default, hidden until 5+ answers (signal-poor before that). Shows top-15 + recent-movement deltas with ↑N green / ↓N red arrows.
- **Methodology page** at `/methodology` (auto-generated counts/dims from content modules) with link to interactive sandbox.
- **Sandbox** at `/methodology/sandbox` — answer all 21 questions on one screen, live ranking + dimension vector + neighborhood-finder search box. Used to QA "why isn't X showing up" cases.
- **Retake bug fixed:** completed-quiz returnees now land on Q1 instead of Q22 (resume logic detects "fully answered" and resets).
- **Back link from per-nbhd page** now returns to results (with fingerprint preserved) when arriving from results.
- **Must-haves capped at 3** with disabled state on remaining options.

**Photos:** 112/113 nbhds with real Wikipedia lead images, sized to ~600KB JPG, attribution on each per-nbhd page (CC-BY / CC-BY-SA / public domain). Reproducible via `scripts/fetch-wikimedia-photos.mjs` + `scripts/build-photo-metadata.mjs`. Only `st-george` lacks an infobox image; falls back to BoroughHero.

**Polaris cross-model audits run this session:**
- Full quiz audit (`.polaris/quiz-audit.md`) — surfaced the slider-overwrite bug, asymmetric math edge case, several hidden couplings.
- Streetscape-quality scoring (`.polaris/streetscape-quality-scores.json`) — 14 reconciled disagreements documented.
- Cluster-UX review (`.polaris/cluster-ux-review.md`) — selected Option 1 ("Same fit tier" callout) over alternatives, refined to 0.02 threshold.

### Reachability metrics (current state)

With each neighborhood's perfect-match user as the test vector:
- **#1: 82/113 (73%)**
- **Top 3: 102/113 (90%)**
- **Top 5: 110/113 (97%)**
- **Top 10: 113/113 (100%)** — every neighborhood is reachable in some sense

The 27% that don't reach #1 tie at perfect score (1.000) with cluster mates and lose the alphabetical tie-break. The "Same fit tier" callout makes this transparent in the UI.

With greedy answer paths (the practical user experience):
- Top-1: 22%, Top-3: 54%, Top-5: 59%, Top-10: 76%.
- 27 voiceless (don't reach top 10 via greedy).

---

## Open punch list

Roughly priority-ordered:

### Tier 1 — Pre-launch blockers
1. **Trademark / rename decision.** "Sorting Hat" is a Warner Bros / J.K. Rowling registered mark. Rename candidates from earlier session: The Sorter, Roost, Bearings, Hearth, Habitat. Decide before any public marketing push.
2. **A11y audit.** Forms need keyboard nav + screen reader pass. Quick audit with axe DevTools, fix what surfaces.

### Tier 2 — Real product gaps
3. **Q19 commute target list expansion.** Polaris flagged this in the audit. Missing: UWS medical / universities, White Plains, Newark, Hoboken (commute target), Williamsburg, Flushing, JFK / LGA, New Haven. Expansion needs a commute-minutes recompute via `scripts/compute-commutes.mjs` against Google Routes API ($, but cheap).
4. **Tie-break determinism.** Currently alphabetical-by-id, so Park Slope always wins the tie over Cobble Hill regardless of user. Polaris suggested a stable hash of user fingerprint to break ties differently across users. Cosmetic but real fairness improvement.
5. **Suburb cluster substitution-set UI.** Polaris noted the Scarsdale / Roslyn / Manhasset / Great Neck cluster is a *substitution set*, not a lifestyle distinction — they're the same neighborhood in different counties. Could surface as a single "tier 1 NY/NJ family suburb" pseudo-card.
6. **Save/share flow with DB.** Vercel Postgres + Auth.js magic-link per the v1 spec at `/Users/matt/wilshireai/docs/superpowers/specs/2026-05-06-sortinghat-v1-design.md`.

### Tier 3 — Operational / longer-term
7. OpenTripPlanner migration (replace Google Routes API with self-hosted GTFS-based routing for better NYC accuracy + zero ongoing cost; ~1-2 days)
8. Bronx / Staten Island expansion (Mott Haven, Stapleton, etc.)
9. Cultural tag granularity (split East Asian → Korean / Chinese / Japanese / Taiwanese, etc.)
10. `prestige-orientation` cleanup if you want to drop it entirely (now queryable; could be removed if it doesn't pull weight long-term).

---

## Architectural decisions made this session

- **`softPrefs` channel.** Generic mechanism for forced-choice options to flag soft preferences (currently 'car-friendly') that the engine boosts (+5%) on matching neighborhoods. Threaded through fingerprint, derive, score. Future expansion: add 'water-proximity' for coastal nbhds, 'walks-pleasure' for stroll-seekers, etc.
- **Symmetric vs asymmetric_need both treat user=0 as no-penalty now.** This was the deepest fix of the session — it unifies the "no opinion expressed" semantic across both kinds. See `dimensionContribution` in `src/lib/engine/score.ts`.
- **Slider questions are still SET-not-ADD.** The Q15 overwrite bug was resolved by removing the redundant slider, not by changing the SET semantic. If you add a new slider that overlaps a forced_choice's dim, expect the same overwrite — design around it.
- **"Same fit tier" peers are sourced from `result.ranked + result.rest`** (passing-only), not from excluded. Cluster mates that fail the user's must-haves don't show as same-tier — correct, because they're not actually achievable matches.
- **Live ranking panel hides until 5+ answers.** The signal-poor first few answers anchor users into wrong expectations. Threshold is conservative; could be lowered if user-testing shows that's too late.

---

## Gotchas

- **Suburb scores in `content/neighborhoods.ts` use a hybrid format:** original `scores: { ... }` line is single-line, but every dim added since uses multi-line append. Scripts that modify `scores` need to handle both formats. The new streetscape-quality script (saved at `/tmp/apply-streetscape.mjs` during this session) handles both via brace-counting.
- **Persona-fit test vectors must be updated when adding a new dimension.** Otherwise the persona's vector lacks the new dim → defaults to 0 → may produce false-positive cross-borough matches. Same goes for archetype vectors (8 of them).
- **Polaris ephemeral state:** worker outputs aren't retained across session reaps. ALWAYS instruct Polaris to save synthesized scores to a file under `.polaris/` AND inline them in the response. Don't rely on the agent's memory.
- **Vercel auto-deploys on push to `origin/main`.** No manual step. Watch deploy ID change as proof of new build serving.
- **`prestige-orientation` is no longer "intentionally inert"** as of this session — Q4 (income-tier-fit) hits it. AGENTS.md §4 has been updated.
- **Conditional skip logic** for `commute-tolerance` is currently inline in `src/app/nyc/quiz/page.tsx`. If you add a second conditional rule, refactor to a declarative `Question.skipWhen?: (answers) => boolean` pattern at that point.

---

## Useful files / scripts

- `scripts/compute-commutes.mjs` — pulls Google Maps API key from AWS SSM `/wilshireai/prod/google-maps`, computes 113 × 9 commute matrix. Re-run quarterly for fresh data; needed for Q19 expansion.
- `scripts/generate-passages.ts` — uses Anthropic API key from `/wilshireai/prod/anthropic`, generates 904 archetype-specific passages. Re-run if archetypes change.
- `scripts/fetch-wikimedia-photos.mjs` + `scripts/build-photo-metadata.mjs` — photo pipeline.
- `content/commute-minutes-overrides.json` — editorial overrides for cases Google routes poorly (SI Ferry data gap, Metro-North New Canaan Branch).
- `tests/engine/persona-fit.test.ts` — 7 archetypal personas; loose assertion (top 5 contains expected borough).
- `.polaris/` — synthesized outputs from dual-model passes. Gitignored. Worth peeking at for `quiz-audit.md`, `streetscape-quality-scores.json`, `cluster-ux-review.md`, `answer-paths.md` (per-nbhd answer recipes), `question-impact.md` (per-option neighborhood pull), `voiceless.md` (nbhds that don't reach top 10 via greedy paths).

---

## When picking back up

1. Pull latest from `origin/main`
2. `npm install` if anything changed in `package.json`
3. `npm test` to verify clean baseline (should be 74/74)
4. `npm run lint` (0 errors, 2 stylistic warnings)
5. Read the most recent commits to understand what's freshest (`git log --oneline -25`)
6. Check this doc for what's queued
7. Either pick from the punch list or address whatever surfaced from real users since last session

End.
