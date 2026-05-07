#!/usr/bin/env node
import fs from 'node:fs/promises';

const SRC = 'tmp/wikimedia-photos/manifest.json';
const OUT = 'content/neighborhood-photos.json';

function clean(s) {
  if (!s) return null;
  return String(s).replace(/\s+/g, ' ').trim() || null;
}

function licenseUrl(license) {
  if (!license) return null;
  const m = license.match(/^CC\s*(BY(?:-SA)?)\s*(\d+(?:\.\d+)?)$/i);
  if (m) return `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/`;
  if (/^CC0/i.test(license)) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  return null;
}

const manifest = JSON.parse(await fs.readFile(SRC, 'utf8'));
const photos = {};
for (const m of manifest) {
  if (m.status !== 'ok') continue;
  const license = clean(m.license);
  photos[m.id] = {
    src: `/images/neighborhoods/photos/${m.id}.jpg`,
    sourceTitle: m.title,
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(m.title.replaceAll(' ', '_'))}`,
    commonsFile: m.commonsFile,
    commonsUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(m.commonsFile)}`,
    artist: clean(m.artist),
    license,
    licenseUrl: licenseUrl(license),
  };
}
await fs.writeFile(OUT, JSON.stringify(photos, null, 2));
console.log(`Wrote ${OUT} with ${Object.keys(photos).length} entries.`);
