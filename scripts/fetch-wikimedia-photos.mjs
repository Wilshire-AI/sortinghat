#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'tmp', 'wikimedia-photos');
const UA = 'SortingHat/1.0 (https://sortinghat.wilshireai.com; matt.r.pon@gmail.com)';
const CONCURRENCY = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REGION_SUFFIX = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'Bronx',
  'staten-island': 'Staten Island',
  nj: 'New Jersey',
  westchester: 'New York',
  'long-island': 'New York',
  ct: 'Connecticut',
};

const TITLE_OVERRIDES = {
  fidi: 'Financial District, Manhattan',
  dumbo: 'Dumbo, Brooklyn',
  'bed-stuy': 'Bedford\u2013Stuyvesant, Brooklyn',
  'hells-kitchen': "Hell's Kitchen, Manhattan",
  'central-harlem': 'Harlem',
  'long-island-city': 'Long Island City, Queens',
  'st-george': 'St. George, Staten Island',
  'murray-hill': 'Murray Hill, Manhattan',
};

async function parseNeighborhoods() {
  const txt = await fs.readFile('content/neighborhoods.ts', 'utf8');
  const re = /id: '([^']+)',\s+slug: '[^']+',\s+name: '([^']+(?:\\'[^']*)*)',\s+borough: '([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) {
    out.push({ id: m[1], name: m[2].replace(/\\'/g, "'"), borough: m[3] });
  }
  return out;
}

async function fetchWithRetry(url, attempt = 0) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (r.status === 429 || r.status === 503) {
    if (attempt >= 6) throw new Error(`${r.status} after ${attempt} retries`);
    const retryAfter = parseInt(r.headers.get('retry-after') || '0', 10);
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(60000, 2000 * 2 ** attempt);
    await sleep(wait);
    return fetchWithRetry(url, attempt + 1);
  }
  return r;
}

async function wp(url) {
  const r = await fetchWithRetry(url);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function resolvePage(title) {
  const slug = title.replaceAll(' ', '_');
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops%7Cpageimages&piprop=original&titles=${encodeURIComponent(slug)}`;
  const j = await wp(url);
  const pages = j?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  if (page.pageprops?.disambiguation !== undefined) return null;
  if (!page.original) return null;
  return { resolvedTitle: page.title, image: page.original };
}

async function searchTopHit(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=1&srsearch=${encodeURIComponent(query)}`;
  const j = await wp(url);
  return j?.query?.search?.[0]?.title || null;
}

async function fetchImageMeta(filename) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=${encodeURIComponent('File:' + filename)}`;
  const j = await wp(url);
  const pages = j?.query?.pages || {};
  return Object.values(pages)[0]?.imageinfo?.[0]?.extmetadata || null;
}

async function resolveTitle(nbhd) {
  const tries = [];
  if (TITLE_OVERRIDES[nbhd.id]) tries.push(TITLE_OVERRIDES[nbhd.id]);
  const suffix = REGION_SUFFIX[nbhd.borough];
  if (suffix) tries.push(`${nbhd.name}, ${suffix}`);
  tries.push(nbhd.name);
  if (['westchester', 'long-island', 'nj', 'ct'].includes(nbhd.borough)) {
    tries.push(`${nbhd.name} (town), ${suffix}`);
    tries.push(`${nbhd.name} (village), ${suffix}`);
    tries.push(`${nbhd.name} (CDP), ${suffix}`);
  }
  const errors = [];
  for (const title of tries) {
    try {
      const r = await resolvePage(title);
      if (r) return { tried: title, ...r };
    } catch (e) { errors.push(`${title}: ${e.message}`); }
  }
  try {
    const hit = await searchTopHit(`${nbhd.name} ${suffix || ''}`);
    if (hit) {
      const r = await resolvePage(hit);
      if (r) return { tried: `search:${hit}`, ...r };
    }
  } catch (e) { errors.push(`search: ${e.message}`); }
  if (errors.length) console.warn(`  ${nbhd.id} errors:`, errors.join('; '));
  return null;
}

async function downloadImage(url, dest) {
  const r = await fetchWithRetry(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

function plain(meta, key) {
  const v = meta?.[key]?.value;
  if (!v) return null;
  return String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

async function processOne(nbhd) {
  const resolved = await resolveTitle(nbhd);
  if (!resolved) return { ...nbhd, status: 'no-match' };
  const orig = resolved.image.source;
  const filename = decodeURIComponent(orig.split('/').pop());
  const ext = (path.extname(filename).toLowerCase() || '.jpg').replace('.jpeg', '.jpg');
  const file = nbhd.id + ext;
  const dest = path.join(OUT_DIR, file);
  const bytes = await downloadImage(orig, dest);
  const meta = await fetchImageMeta(filename);
  return {
    ...nbhd,
    status: 'ok',
    title: resolved.resolvedTitle,
    triedAs: resolved.tried,
    file,
    bytes,
    width: resolved.image.width,
    height: resolved.image.height,
    sourceUrl: orig,
    commonsFile: filename,
    artist: plain(meta, 'Artist'),
    license: plain(meta, 'LicenseShortName'),
    licenseUrl: plain(meta, 'LicenseUrl'),
    description: plain(meta, 'ImageDescription')?.slice(0, 240) ?? null,
  };
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          out[idx] = await fn(items[idx], idx);
        } catch (e) {
          out[idx] = { ...items[idx], status: 'error', error: String(e.message || e) };
        }
        await sleep(150);
      }
    }),
  );
  return out;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildHtml(manifest) {
  const ok = manifest.filter(m => m.status === 'ok');
  const bad = manifest.filter(m => m.status !== 'ok');
  const cards = ok.map(m => `
    <figure>
      <img src="${escape(m.file)}" loading="lazy" alt="${escape(m.name)}">
      <figcaption>
        <strong>${escape(m.name)}</strong> <span class="b">${escape(m.borough)}</span>
        <div class="meta">${escape(m.title)} \u2022 ${m.width}\u00d7${m.height} \u2022 ${(m.bytes / 1024).toFixed(0)}KB</div>
        <div class="attr">${escape(m.artist || '?')} / ${escape(m.license || '?')}</div>
      </figcaption>
    </figure>`).join('\n');
  const missing = bad.map(m => `<li><code>${escape(m.id)}</code> (${escape(m.name)}, ${escape(m.borough)}) \u2014 ${escape(m.status)}${m.error ? `: ${escape(m.error)}` : ''}</li>`).join('\n');
  return `<!doctype html><meta charset="utf-8"><title>Wikimedia photo prototype</title>
<style>
  body { font: 14px/1.4 -apple-system, sans-serif; margin: 24px; max-width: 1400px; }
  h1 { margin-top: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  figure { margin: 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #fff; }
  img { display: block; width: 100%; height: 200px; object-fit: cover; background: #f3f3f3; }
  figcaption { padding: 10px 12px; font-size: 13px; }
  figcaption .b { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 4px; }
  figcaption .meta { color: #666; font-size: 11px; margin-top: 4px; }
  figcaption .attr { color: #999; font-size: 10px; margin-top: 6px; font-style: italic; }
  details { margin: 24px 0; }
  ul { line-height: 1.8; }
  code { background: #f3f3f3; padding: 1px 4px; border-radius: 3px; }
</style>
<h1>Wikimedia photo prototype</h1>
<p><strong>${ok.length}</strong> matched / <strong>${bad.length}</strong> missing of ${manifest.length} neighborhoods.</p>
<details ${bad.length ? 'open' : ''}><summary>Missing (${bad.length})</summary><ul>${missing}</ul></details>
<div class="grid">${cards}</div>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const nbhds = await parseNeighborhoods();
  console.log(`Parsed ${nbhds.length} neighborhoods. Fetching with concurrency=${CONCURRENCY}...\n`);

  let done = 0;
  const manifest = await pool(nbhds, CONCURRENCY, async (nbhd) => {
    const r = await processOne(nbhd);
    done++;
    const tag = r.status === 'ok' ? 'OK ' : r.status === 'no-match' ? '-- ' : 'ERR';
    const detail = r.status === 'ok' ? `${r.title} (${(r.bytes / 1024).toFixed(0)}KB)` : r.status === 'no-match' ? 'no article with image' : r.error;
    console.log(`[${String(done).padStart(3)}/${nbhds.length}] ${tag} ${nbhd.id.padEnd(28)} ${detail}`);
    return r;
  });

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'index.html'), buildHtml(manifest));

  const ok = manifest.filter(m => m.status === 'ok').length;
  console.log(`\nDone. ${ok}/${manifest.length} matched. Open: ${path.join(OUT_DIR, 'index.html')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
