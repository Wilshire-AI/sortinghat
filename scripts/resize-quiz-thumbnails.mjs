// Generates Phase 1 quiz pole thumbnails per
// .polaris/quiz-photos-research-2026-05-10.md §5. 320×180 cover-fit, q75.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(REPO, 'public/images/quiz'), { recursive: true });

const PAIRS = [
  // Slider pole references
  ['bushwick', 'lifecycle-changing'],
  ['brooklyn-heights', 'lifecycle-established'],
  // Place-archetype option thumbnails
  ['long-island-city', 'archetype-transit-hub'],
  ['park-slope', 'archetype-walkable-city'],
  ['forest-hills', 'archetype-quiet-city'],
  ['maplewood', 'archetype-walkable-suburb'],
  ['scarsdale', 'archetype-larger-lot-suburb'],
  ['chappaqua', 'archetype-country-rural'],
  // Street-energy option thumbnails (10 vibes including 3 polish flavors
  // and corporate / business district)
  ['bushwick', 'street-energy-creative'],
  ['flushing', 'street-energy-commercial'],
  ['jackson-heights', 'street-energy-diverse'],
  ['hudson-yards', 'street-energy-visitor'],
  ['midtown-east', 'street-energy-corporate'],
  ['ditmas-park', 'street-energy-family'],
  ['sunnyside', 'street-energy-quiet'],
  ['upper-east-side', 'street-energy-established'],
  ['upper-west-side', 'street-energy-refined'],
  ['bay-ridge', 'street-energy-polished-family'],
];

for (const [src, out] of PAIRS) {
  const inputPath = resolve(REPO, `public/images/neighborhoods/photos/${src}.jpg`);
  const outputPath = resolve(REPO, `public/images/quiz/${out}.jpg`);
  await sharp(inputPath)
    .resize(320, 180, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 75 })
    .toFile(outputPath);
  console.log(`✓ ${out}.jpg`);
}
