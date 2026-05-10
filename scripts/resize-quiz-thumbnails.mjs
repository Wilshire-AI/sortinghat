// Generates Phase 1 quiz pole thumbnails per
// .polaris/quiz-photos-research-2026-05-10.md §5. 320×180 cover-fit, q75.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(REPO, 'public/images/quiz'), { recursive: true });

const PAIRS = [
  ['park-slope', 'cultural-register-casual'],
  ['upper-east-side', 'cultural-register-formal'],
  ['bushwick', 'lifecycle-changing'],
  ['brooklyn-heights', 'lifecycle-established'],
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
