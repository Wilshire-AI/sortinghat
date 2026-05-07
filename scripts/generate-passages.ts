// Generates per-archetype neighborhood prose via the Anthropic Messages API.
//
// Output: content/passages/<archetype-id>.json
//   { [neighborhoodId]: { fitProse, tradeoffsForYou, reviewedAt, reviewedBy,
//                         generatedAt, model } }
//
// Usage:
//   node --experimental-strip-types scripts/generate-passages.ts                # all 8 archetypes
//   node --experimental-strip-types scripts/generate-passages.ts <archetype-id> # single archetype (pilot)
//
// Reads API key from AWS Parameter Store (/wilshireai/prod/anthropic, us-east-2).
// Uses prompt caching so the voice guide and archetype context are paid for
// once per archetype batch, not per-neighborhood.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { neighborhoods } from '../content/neighborhoods.ts';
import { archetypes } from '../content/archetypes.ts';
import type { Archetype, Neighborhood } from '../content/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'content/passages');

const SSM_PATH = '/wilshireai/prod/anthropic';
const SSM_REGION = 'us-east-2';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.MODEL ?? 'claude-sonnet-4-5';
const CONCURRENCY = 4;
const MAX_TOKENS = 600;

// ---------- Voice guide (the editorial constitution) ----------

const VOICE_GUIDE = `You are writing for Sorting Hat, a NYC-metro psychographic neighborhood recommendation product.

VOICE
Editorial register: Brick Underground meets The New Yorker. Thoughtful, concrete, honest, tradeoff-aware. NOT broker-y, NOT BuzzFeed-quiz, NOT social-worker scolding, NOT generic AI prose.

Your readers are ambitious NYC-metro professionals, dual-income couples, future-family planners, urbanists, knowledge workers. They will notice if your prose is generic. They will share it if it is specific and insightful.

HARD RULES
1. NO em-dashes anywhere. Use periods, parens, or commas instead.
2. Length: fitProse is 1 to 3 short sentences (100 to 320 chars). tradeoffs are 2 to 4 bullets, each 25 to 110 chars.
3. Never use these tour-guide words: "vibrant", "bustling", "charming", "hidden gem", "up-and-coming", "trendy", "cozy", "leafy" (unless mentioning specific tree-lined blocks by name).
4. Never make up facts. Use only the neighborhood data provided. If you don't know something concrete, don't include it.
5. Don't soft-pedal. Honest tradeoffs always. Pretend you're a friend who actually lives in NYC, asked their opinion in private.

VOICE PRINCIPLES
- Specific over general. "The F train puts you in Manhattan in twenty minutes" beats "great transit access."
- Concrete over abstract. "Stroller density on 7th Ave is a known meme" beats "very family-friendly."
- Match the archetype lens. Same neighborhood reads differently for different people. The fitProse should reflect WHY this place fits THIS archetype (or honestly doesn't). The tradeoffs should be the ones THIS archetype specifically would feel.
- Use neighborhood data: name specific transit lines (F, 2/3, A/C, PATH, Metro-North, LIRR), specific parks (Prospect Park, Carl Schurz, Riverside), specific anchors. Generic "good transit" reads as tour-guide.

EXAMPLES OF GOOD OUTPUT

Park Slope, viewed by The Calm-Seeking Urbanist:
{
  "fitProse": "Park Slope was practically built for the calm-seeking urbanist. The brownstone blocks east of 7th have the tree-lined hush you remember from late-August evenings, and the F puts you in Manhattan in twenty minutes.",
  "tradeoffsForYou": [
    "Quieter than you'd expect, even on weekends.",
    "Some of the most expensive blocks in Brooklyn.",
    "Stroller density on 7th Ave is a known meme."
  ]
}

Park Slope, viewed by The Creative Immersionist:
{
  "fitProse": "Park Slope is calm by design, which for an immersion-seeker is a feature only sometimes. The brownstones are gorgeous, the F is good, the parks are real, but the closest thing to a creative scene is a Hatchet Coffee with laptops.",
  "tradeoffsForYou": [
    "Pleasant but quiet. Energy lives elsewhere in Brooklyn.",
    "Seventh Ave shopping is more boutique than scene.",
    "If you want to bump into ambitious creatives, head to Williamsburg or Bushwick."
  ]
}

Hudson Yards, viewed by The Calm-Seeking Urbanist:
{
  "fitProse": "Hudson Yards is the wrong shape for someone who wants calm. It's a planned commercial-residential megaproject. Tourists and office crowds dominate, and the only train is the 7. Beautiful river walks if you want to escape it.",
  "tradeoffsForYou": [
    "One subway line. The 7 is fine, but it's the only train.",
    "Tourist density rivals Times Square at peak hours.",
    "The buildings are spectacular but the streets feel borrowed."
  ]
}

OUTPUT
Always use the save_passage tool. fitProse and tradeoffsForYou must follow the rules above. Do not output JSON in chat; only via the tool.`;

// ---------- Tool definition ----------

const TOOL = {
  name: 'save_passage',
  description: 'Save the generated archetype-specific passage for this neighborhood.',
  input_schema: {
    type: 'object',
    properties: {
      fitProse: {
        type: 'string',
        description: '1 to 3 short sentences explaining why this neighborhood fits (or honestly does not fit) this archetype. 100 to 320 chars. No em-dashes.',
      },
      tradeoffsForYou: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
        description: 'Honest tradeoffs this archetype specifically would feel. 2 to 4 bullets, each 25 to 110 chars. No em-dashes.',
      },
    },
    required: ['fitProse', 'tradeoffsForYou'],
  },
};

// ---------- Helpers ----------

function getApiKey(): string {
  const stdout = execFileSync(
    'aws',
    ['ssm', 'get-parameter', '--name', SSM_PATH, '--with-decryption',
     '--region', SSM_REGION, '--query', 'Parameter.Value', '--output', 'text'],
    { encoding: 'utf8' }
  );
  const raw = stdout.trim();
  // The parameter is stored as JSON {"api_key": "sk-ant-..."} per the
  // wilshireai convention. Parse and extract.
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.api_key === 'string') return parsed.api_key;
  } catch {
    // fall through to treat raw as the key (for compatibility)
  }
  return raw;
}

function describeNeighborhood(n: Neighborhood): string {
  const lines: string[] = [];
  lines.push(`Name: ${n.name}`);
  lines.push(`Borough: ${n.borough}`);
  lines.push(`Editorial summary: ${n.basePassages.whyItFits}`);
  lines.push(`Who thrives there: ${n.basePassages.whoThrivesHere}`);
  lines.push(`Existing tradeoffs (generic): ${n.basePassages.tradeoffs.join('; ')}`);
  lines.push(`Transit anchors: ${n.anchors.transit.join(', ') || 'none listed'}`);
  lines.push(`Park anchors: ${n.anchors.parks.join(', ') || 'none listed'}`);
  lines.push(`Grocery anchors: ${n.anchors.groceries.join(', ') || 'none listed'}`);
  if (n.housingTypes && n.housingTypes.length > 0) {
    lines.push(`Housing types present: ${n.housingTypes.join(', ')}`);
  }
  if (n.culturalTags && n.culturalTags.length > 0) {
    lines.push(`Cultural communities: ${n.culturalTags.join(', ')}`);
  }
  if (n.hasQuietBlocks) lines.push('Has notable quiet residential blocks.');
  if (n.hasFamilyInfrastructure) lines.push('Has notable family-life infrastructure.');
  if (n.carDependent) lines.push('Day-to-day life is car-dependent.');
  lines.push('');
  lines.push('Dimension scores (each in [-1, 1]):');
  for (const [dim, score] of Object.entries(n.scores)) {
    lines.push(`  ${dim}: ${score}`);
  }
  return lines.join('\n');
}

function archetypeContext(archetype: Archetype): string {
  const others = archetypes
    .filter((a) => a.id !== archetype.id)
    .map((a) => a.name)
    .join(', ');
  return `You are writing for the archetype: ${archetype.name}.

Their identity:
${archetype.identity}

This archetype is one of 8 in the product. The others are: ${others}. Your prose should reflect what makes THIS archetype's experience of this neighborhood different from how those other archetypes would experience the same place.`;
}

type Passage = {
  fitProse: string;
  tradeoffsForYou: string[];
  reviewedAt: string | null;
  reviewedBy: string | null;
  generatedAt: string;
  model: string;
};

async function callAnthropic(
  apiKey: string,
  systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[],
  userMessage: string,
  maxRetries = 3,
): Promise<{ fitProse: string; tradeoffsForYou: string[] }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemBlocks,
          messages: [{ role: 'user', content: userMessage }],
          tools: [TOOL],
          tool_choice: { type: 'tool', name: 'save_passage' },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429 || res.status >= 500) {
          // retryable
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
        }
        throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      const toolBlock = (data.content as Array<{ type: string; name?: string; input?: unknown }>).find(
        (b) => b.type === 'tool_use' && b.name === 'save_passage',
      );
      if (!toolBlock || !toolBlock.input) {
        throw new Error(`No tool_use in response: ${JSON.stringify(data).slice(0, 300)}`);
      }
      const input = toolBlock.input as { fitProse: string; tradeoffsForYou: string[] };
      return { fitProse: input.fitProse, tradeoffsForYou: input.tradeoffsForYou };
    } catch (e) {
      if (attempt === maxRetries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

async function generateForArchetype(apiKey: string, archetype: Archetype): Promise<void> {
  const outputPath = resolve(OUTPUT_DIR, `${archetype.id}.json`);
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const existing: Record<string, Passage> = existsSync(outputPath)
    ? JSON.parse(readFileSync(outputPath, 'utf8'))
    : {};

  const systemBlocks = [
    { type: 'text' as const, text: VOICE_GUIDE, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: archetypeContext(archetype), cache_control: { type: 'ephemeral' as const } },
  ];

  const queue = neighborhoods.filter((n) => !(n.id in existing));
  console.log(`\n=== ${archetype.name} (${archetype.id}) ===`);
  console.log(`  ${queue.length} neighborhoods to generate (${neighborhoods.length - queue.length} already done)`);
  if (queue.length === 0) return;

  let done = 0;
  async function worker() {
    while (queue.length > 0) {
      const n = queue.shift()!;
      const before = Date.now();
      try {
        const userMessage = `Generate fitProse and tradeoffsForYou for the following neighborhood, viewed through this archetype's lens.\n\n${describeNeighborhood(n)}`;
        const result = await callAnthropic(apiKey, systemBlocks, userMessage);
        existing[n.id] = {
          fitProse: result.fitProse,
          tradeoffsForYou: result.tradeoffsForYou,
          reviewedAt: null,
          reviewedBy: null,
          generatedAt: new Date().toISOString(),
          model: MODEL,
        };
        // Save incrementally so partial runs resume cleanly.
        writeFileSync(outputPath, JSON.stringify(existing, null, 2) + '\n');
        done++;
        const elapsed = ((Date.now() - before) / 1000).toFixed(1);
        const preview = result.fitProse.slice(0, 80).replace(/\n/g, ' ');
        console.log(`  [${done}/${queue.length + done}] ${n.id} (${elapsed}s) → ${preview}…`);
      } catch (e) {
        console.error(`  FAIL ${n.id}: ${(e as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Wrote ${outputPath}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const filter = argv.length > 0 ? new Set(argv) : null;

  console.log('Reading API key from Parameter Store...');
  const apiKey = getApiKey();

  const targets = filter
    ? archetypes.filter((a) => filter.has(a.id))
    : archetypes;

  if (targets.length === 0) {
    console.error('No archetypes matched filter.');
    process.exit(1);
  }

  console.log(`Model: ${MODEL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Generating for ${targets.length} archetype(s): ${targets.map((a) => a.id).join(', ')}`);

  for (const a of targets) {
    await generateForArchetype(apiKey, a);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
