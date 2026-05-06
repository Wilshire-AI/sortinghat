<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (16.x) has breaking changes — APIs, conventions, and file
structure may all differ from your training data. Read the relevant guide
in `node_modules/next/dist/docs/` before writing any code involving:

- App Router server/client components
- Server actions
- Route handlers (`app/**/route.ts`)
- Metadata routes (favicon, robots, sitemap, OG images)
- Streaming / Suspense
- Middleware

Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Sorting Hat — agent guide

Sorting Hat is a psychographic NYC-metro neighborhood recommender. User answers
a structured quiz; an engine matches their answers to neighborhoods using a
mix of soft scoring + hard filters; the result is a ranked list of fits with
prose explaining why each works. Pure-functional engine, all content static
in the repo, deployed on Vercel as a static export.

This document is the **first thing to read** when you join the codebase. It
covers the product, the architecture, conventions, and how to add things
without breaking the engine or the editorial register.

---

## 1. Product positioning

**This IS:**
- A psychographic lifestyle inference engine
- A neighborhood recommendation system
- An emotional-fit advisor ("where would you actually thrive?")

**This is NOT:**
- A Zillow clone
- An apartment listings portal
- A map search tool (the map is a *supplementary* geographic lens, not the primary UI)

**The user the product is built for:** ambitious NYC-metro professionals,
dual-income couples, future-family planners, urbanists, relocators, knowledge
workers. They migrate INTO Manhattan/Brooklyn/Queens/NJ/Westchester/LI/CT.
They mostly do NOT consider Bronx or Staten Island.

**The product's success criterion:** users say "this understands me." The
recommendations should feel insightful, tradeoff-aware, non-generic, not
broker-y or salesy.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, static export (`output: 'export'`) |
| Language | TypeScript strict |
| Styling | Tailwind v4 (CSS-first config in `globals.css`) |
| Fonts | Newsreader (serif) + Inter (sans) via `next/font` |
| Map | MapLibre GL + CARTO Positron tiles (free, no API key) |
| Tests | Vitest |
| Hosting | Vercel |
| Repo | `Wilshire-AI/sortinghat` |

No backend, no DB, no auth in current build. Anonymous-shareable URLs only.
v1 plan adds Vercel Postgres + Auth.js magic-link.

---

## 3. File layout

```
sortinghat/
├── content/                            # source of truth — data, not code
│   ├── types.ts                        # all TypeScript types for content
│   ├── dimensions.ts                   # 11 lifestyle dimensions
│   ├── archetypes.ts                   # 8 archetype profiles + identity prose
│   ├── questions.ts                    # ~17 quiz questions
│   ├── neighborhoods.ts                # 113 neighborhoods (single file currently)
│   └── neighborhood-polygons.json      # GeoJSON polygons (matches by id)
├── src/
│   ├── app/
│   │   ├── page.tsx                    # landing
│   │   ├── nyc/quiz/page.tsx           # quiz state + flow control
│   │   ├── nyc/results/page.tsx        # Suspense wrapper
│   │   ├── nyc/results/results-client.tsx # main results renderer
│   │   ├── nyc/n/[slug]/page.tsx       # per-neighborhood deep-dive
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── quiz/
│   │   │   ├── useQuizState.ts         # answers map → derived vector
│   │   │   ├── QuestionCard.tsx        # forced-choice + slider + multi-select
│   │   │   └── ProgressBar.tsx
│   │   └── results/
│   │       ├── ArchetypeBanner.tsx
│   │       ├── NeighborhoodCard.tsx
│   │       ├── DimensionFingerprint.tsx
│   │       ├── ShareButton.tsx
│   │       ├── AllMatchesList.tsx
│   │       └── NeighborhoodMap.tsx     # MapLibre map
│   └── lib/engine/
│       ├── vector.ts                   # encoding, clamp, zero
│       ├── score.ts                    # PURE: scoring + must-have filters
│       ├── archetype.ts                # PURE: nearest-archetype match
│       └── explain.ts                  # passage resolution (mostly base passages)
├── tests/                              # vitest unit + content invariant tests
├── next.config.ts                      # output: 'export'
└── AGENTS.md                           # this file
```

**Strict boundary:** `src/` never imports from `content/types`-prefixed paths
beyond what's exposed; engine functions take their inputs as arguments
rather than reading globals. This keeps the engine pure and testable.

---

## 4. Data model

### Dimensions (`content/dimensions.ts`)

11 dimensions. Each has a `kind`:

- **`symmetric`**: both poles are real lived preferences. Mismatch in either
  direction hurts. Example: `urban-intensity-tolerance` (some want calm, some
  want density; ending up wrong is a real friction). Symmetric dims:
  `urban-intensity-tolerance`, `prestige-orientation`, `space-sensitivity`,
  `family-trajectory`, `creative-energy`, `friction-sensitivity`.

- **`asymmetric_need`**: only the high pole is a real preference. Low values
  mean "this isn't a driver for me," not "I dislike it." Penalty applies only
  when neighborhood under-delivers vs user's desire. Asymmetric dims:
  `transit-psychology`, `cultural-ecosystem`, `environmental-openness`,
  `safety-need`, `school-quality`.

The kind affects scoring math (see §5). Pick correctly when adding a new dim:
**ask whether picking the low end of the question is an active preference or
just an absence of preference.**

### Archetypes (`content/archetypes.ts`)

8 named archetypes, each a vector across all dimensions + a 2-paragraph
identity description. Drives the "you are: The Calm-Seeking Urbanist" banner.
Match: nearest archetype by Euclidean distance. Don't add more without re-
balancing — coverage tests check every dimension has at least one archetype
scoring >0.5.

### Questions (`content/questions.ts`)

Three kinds:

- **`forced_choice`**: 2-3 mutually exclusive options. Each option has a
  `Record<DimensionId, number>` of impacts. Picking a choice ADDS those
  impacts to the user's running vector.
- **`slider`** (5-point Likert): rendered as a slider track that snaps to 5
  positions. Maps to values [-1, -0.5, 0, 0.5, 1]. SET on a single dimension.
  **The prompt MUST be a declarative statement** ("I need to feel safe walking
  home alone late at night.") so that "Strongly disagree → Strongly agree"
  labels make sense. NOT a question ("How important is X?").
- **`multi_select`**: checkboxes. The `purpose` field is `'cultural_tags'` or
  `'must_haves'` — distinguishes whether selections feed soft cultural-tag
  boost or hard must-have filters.

### Neighborhoods (`content/neighborhoods.ts`)

```ts
type Neighborhood = {
  id: string;                     // kebab-case, unique
  slug: string;                   // usually same as id
  name: string;
  shortName?: string;             // optional: shown on map cards if name is long
  borough: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten-island'
         | 'nj' | 'westchester' | 'long-island' | 'ct';
  scores: Record<DimensionId, number>;     // ALL 11 dims, each in [-1, 1]
  culturalTags?: string[];        // matches the multi-select cultural question
  carDependent?: boolean;         // drives 'no-car' must-have filter
  housingTypes?: ('single-family' | 'townhouse' | 'condo' | 'co-op' | 'rental' | 'luxury-highrise')[];
  basePassages: {
    whyItFits: string;            // 1-2 paragraph editorial summary (≥80 chars)
    whoThrivesHere: string;       // 1 line
    tradeoffs: string[];          // 2-3 bullet-shaped strings
  };
  anchors: {
    transit: string[];            // ["1 train", "F (14th)", etc.]
    parks: string[];
    groceries: string[];
  };
  heroImage: string;              // path under public/images/neighborhoods/
};
```

### Polygons (`content/neighborhood-polygons.json`)

Separate from content. GeoJSON FeatureCollection where each feature's
`properties.id` matches a neighborhood id. Sources in priority order:

1. NYC neighborhoods → NYC Open Data NTAs (Neighborhood Tabulation Areas, 2020)
   filtered to residential. Sometimes multiple NTAs are merged into one of our
   neighborhoods (e.g., Bedford-Stuyvesant East + West → `bed-stuy`).
2. NJ municipalities → NJ Open Data municipal boundaries.
3. NY suburbs (Westchester + Long Island) → Census TIGERweb Incorporated
   Places (villages/cities) or CDPs (for hamlets like Chappaqua, Manhasset).
4. CT towns → Census TIGERweb Town Subdivisions.
5. Bundled-NTA splits (BPC, Hudson Yards, Boerum Hill, Carroll Gardens, etc.)
   → hand-drawn approximate octagons centered on OSM-tagged centroids.
   These are visibly less accurate; future work could replace them with
   StreetEasy's data or hand-drawn refinements.

All polygons simplified with Douglas-Peucker (~50m precision) to keep the
bundle small. Currently ~131 KB total.

---

## 5. Engine logic (`src/lib/engine/`)

### Scoring (`score.ts`)

```
distance(user, neighborhood) = sqrt(sum_i contrib(user[i], neighborhood[i], kind[i]))

where contrib() is:
  - symmetric:        (user - neighborhood)²
  - asymmetric_need:  max(0, user - neighborhood)²    // shortfall only

score = 1 - distance / max_possible_distance         // mapped to [0, 1]

Plus a cultural-tag boost: each user-selected cultural tag that matches a
neighborhood's culturalTags adds +0.08 to the score (capped at 1).
```

**Why asymmetric_need:** if user picks "I really need transit redundancy"
(transit-psychology = +0.7) and the neighborhood has poor transit
(transit-psychology = -0.3), they DO suffer. But if they pick "I don't
need transit redundancy" (transit-psychology = -0.5) and the neighborhood
has GREAT transit (+0.7), they aren't actively hurt by the abundance.
Asymmetric models that.

**Why some dims stayed symmetric:** for `prestige-orientation`,
`space-sensitivity`, `family-trajectory`, the questions are genuinely
bidirectional ("famous neighborhood vs more space," "today vs 5 years"),
so a strong negative score reflects an active preference, not ambivalence.

### Must-have filters (`MUST_HAVE_FILTERS` in `score.ts`)

Hard filters. If user marks any as "non-negotiable" (final multi-select
question), failing neighborhoods are excluded from results entirely.

Current filters:
- `subway-redundancy`: `transit-psychology >= 0.4`
- `walking-distance-park`: `environmental-openness >= 0.5`
- `house-or-townhouse`: `housingTypes` includes `single-family` or `townhouse`
- `luxury-highrise`: `housingTypes` includes `luxury-highrise`
- `top-schools`: `school-quality >= 0.7`
- `calm-blocks`: `friction-sensitivity >= 0.5`
- `no-car`: `!carDependent`
- `cultural-match`: neighborhood's `culturalTags` overlaps with user's selected tags

### Color stretching (in `NeighborhoodMap.tsx`)

The map's color gradient is **stretched to the user's actual score range**,
not absolute 0-100%. Worst score in their list goes red, best goes green,
gradient between. This makes the map readable even when raw scores cluster
in a narrow band (which is the common case — most NYers fit ~70%+ of NYC).

---

## 6. Quiz state (`src/components/quiz/useQuizState.ts`)

The vector is **derived** from the answers map, not accumulated. This means
back-navigation + answer revision works correctly: changing an earlier
answer recomputes the whole state from scratch. Don't change this back to
an accumulator without thinking through the back-nav case.

```
User answers → answers: Record<questionId, Answer>
             → deriveState(dimensions, questions, answers)
             → { vector, selectedTags, mustHaves }
```

---

## 7. How to add things

### Add a new neighborhood

1. Append entry to `content/neighborhoods.ts` with all required fields.
   Score every dimension. Read existing entries for tone guidance — first
   sentence describes character; second names tradeoffs; whoThrivesHere
   is the one-line target user sketch.
2. Add polygon to `content/neighborhood-polygons.json` — fetch from NYC NTAs
   / NJ municipalities / Census TIGERweb depending on location, simplify
   with Douglas-Peucker (~50m precision). For locations with no clean source,
   hand-draw an approximate polygon around OSM centroid (last resort).
3. Run `npm test` — content invariant tests will fail if scores are missing
   or polygons mismatch IDs.
4. Verify with `npm run dev` that the new neighborhood appears in results
   for at least one realistic answer pattern.
5. Commit with `feat: add <neighborhood-name>` and push.

### Add a new dimension

1. Append to `content/dimensions.ts` with name, description (~100 words),
   poles, and `kind` (symmetric or asymmetric_need — see §4 for the call).
2. Add scores for this dim to ALL existing neighborhoods. Otherwise content
   invariant tests fail.
3. Add scores for this dim to ALL existing archetypes.
4. Add at least one question that touches this dim (forced-choice impact
   or slider dimensionId).
5. Run `npm test` to verify.
6. Consider whether a related must-have filter makes sense.

### Add a new must-have filter

1. Add option to the `must-haves` multi-select in `content/questions.ts`
   with a clear user-facing label.
2. Add a predicate to `MUST_HAVE_FILTERS` in `src/lib/engine/score.ts`
   that takes a neighborhood and returns true if it passes.
3. Tag relevant neighborhoods if the filter requires data not already on
   `Neighborhood` (e.g., `housingTypes`, `culturalTags`, `carDependent`).
4. Run tests + smoke test.

### Add a new cultural tag

The cultural-communities multi-select uses tags as values. To add a tag:

1. Add option to the `cultural-communities` multi-select question.
2. Tag relevant neighborhoods' `culturalTags` arrays.
3. Add a label mapping in `NeighborhoodCard.tsx` (`tagLabel` map) so it
   renders nicely on the card when matched.

### Update polygon data

Polygon JSON is generated by ad-hoc Python scripts that fetch from open data
sources. To add or replace a polygon:

1. Fetch the source GeoJSON (NYC NTAs / NJ municipalities / Census TIGERweb /
   etc. — see §4 for sources).
2. Filter to the feature(s) you want.
3. Simplify with Douglas-Peucker (~0.0005 epsilon, ~50m precision).
4. Insert into `content/neighborhood-polygons.json`. Make sure the
   `properties.id` matches a neighborhood id from `content/neighborhoods.ts`.
5. Verify visually with `npm run dev` and the map view.

---

## 8. Conventions

### Editorial voice

- **No em-dashes in user-facing prose.** They read as AI-generated. Use
  periods or commas instead. Code comments are fine to have em-dashes.
- **Likert questions are declarative statements.** "I need to feel safe
  walking home late at night." NOT "How important is feeling safe?" — the
  agree/disagree labels only fit declarative phrasing.
- **Tradeoffs always honest.** Every neighborhood entry includes 2-3
  tradeoffs. Don't soft-pedal — users notice.
- **No comments in code that just describe what the code does.** Only
  comments that explain WHY (a non-obvious constraint, a subtle invariant,
  a workaround). Self-explanatory code shouldn't be annotated.

### Naming

- Neighborhood IDs are kebab-case. Use the colloquial NYC name when possible
  (`bed-stuy`, not `bedford-stuyvesant`).
- Borough field uses kebab-case for multi-word values (`staten-island`).
- Dimension IDs are kebab-case domain terms (`urban-intensity-tolerance`).

### Tests

- Engine tests: TDD-style, lots of edge cases. Run on every change.
- Content invariant tests: verify every neighborhood is fully scored, every
  archetype covers all dimensions, polygon IDs match neighborhood IDs, etc.
- E2E tests (Playwright) deferred — currently relying on manual smoke checks.

---

## 9. Deploy pipeline

Push to `main` triggers the connected Vercel project:

1. `npm ci`
2. `npm test` (content invariants must pass; engine units must pass)
3. `npm run build`
4. Vercel serves the static export

Site lives at: `https://sortinghat.wilshireai.com/`

The Vercel project owns the custom domain mapping. Cloudflare should have a
DNS-only CNAME for `sortinghat` pointing at the Vercel-provided target.

---

## 10. Known limitations / deferred work

| Topic | Status |
|---|---|
| Cultural tag granularity | Currently broad (`east-asian`, `latin-american`, etc.); should split into Korean vs Chinese vs Japanese, Mexican vs Dominican vs Puerto Rican, etc. |
| Bundled-NTA polygon splits | Battery Park City, Hudson Yards, Boerum Hill, Carroll Gardens, etc. use hand-drawn approximations. Could be refined with StreetEasy data (proprietary) or careful hand-drawing. |
| Bronx coverage | Only Riverdale. Mott Haven, Belmont, Pelham Bay, Fordham could be added if user demand emerges. |
| Staten Island coverage | Only St. George. North Shore (Stapleton, Tompkinsville) could be added. |
| Suburb-tier scoring recalibration | Current dimension scoring works OK for suburbs but wasn't designed for them. Family-trajectory + school-quality dominate suburb scoring; some dimensions become irrelevant. |
| LLM-generated archetype-specific prose | Deferred from v1 spec. Currently using `Neighborhood.basePassages.whyItFits` for all matches. Real per-(archetype × neighborhood) prose would be ~1,440 passages, generated offline. |
| Real photography | Currently using SVG borough heroes. Hand-curated Unsplash photos planned for v1. |
| Save / share flow with DB | Anonymous URL-encoded fingerprints only. v1 plan adds Vercel Postgres + Auth.js magic-link. |
| Region filter for the all-matches list | 108-entry ranked list could benefit from "filter by Manhattan / Brooklyn / etc." toggles. |
| Trademark on "Sorting Hat" | Warner Bros / J.K. Rowling registered mark. Accepted for prototype phase; rename plan ready (variants: The Sorter, Roost, Bearings, Hearth, Habitat). Should be addressed before public launch. |

---

## 11. Spec + plan references

The full v1 spec is at `/Users/matt/wilshireai/docs/superpowers/specs/2026-05-06-sortinghat-v1-design.md`
and the v1 implementation plan is at `/Users/matt/wilshireai/docs/superpowers/plans/2026-05-06-sortinghat-v1.md`.
The deployed POC has diverged from those — read the spec for product intent,
but treat the actual code as the source of truth for current implementation.

---

## 12. Quick commands

```bash
npm test              # vitest, all tests
npm run lint          # eslint
npm run build         # static export to out/
npm run dev           # local dev server
gh run list           # check deploy status
```
