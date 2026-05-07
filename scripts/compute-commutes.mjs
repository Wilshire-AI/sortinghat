// Computes door-to-door transit commute times from each neighborhood's
// polygon centroid to a fixed set of NYC-metro office clusters.
//
// Output: content/commute-minutes.json — { [neighborhoodId]: { [cluster]: minutes } }
//
// Usage:
//   node scripts/compute-commutes.mjs                  # all neighborhoods
//   node scripts/compute-commutes.mjs <id> [<id>...]   # specific neighborhoods only
//
// Reads the Google Maps API key from AWS Parameter Store
// (/wilshireai/prod/google-maps in us-east-1) via the AWS CLI.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const POLYGONS_PATH = resolve(REPO_ROOT, 'content/neighborhood-polygons.json');
const OUTPUT_PATH = resolve(REPO_ROOT, 'content/commute-minutes.json');
const OVERRIDES_PATH = resolve(REPO_ROOT, 'content/commute-minutes-overrides.json');

const SSM_PATH = '/wilshireai/prod/google-maps';
const SSM_REGION = 'us-east-2';

// Fixed cluster anchors (lat, lng). Picked to be canonical transit hubs at
// the center of each major NYC-metro office concentration.
const CLUSTERS = {
  midtown: { lat: 40.7527, lng: -73.9772, label: 'Grand Central' },
  fidi: { lat: 40.7074, lng: -74.0113, label: 'Wall St / Broadway' },
  'hudson-yards': { lat: 40.7506, lng: -73.9935, label: 'Penn Station' },
  lic: { lat: 40.7472, lng: -73.945, label: 'Court Square' },
  'downtown-brooklyn': { lat: 40.6929, lng: -73.9904, label: 'Borough Hall' },
  'newport-jc': { lat: 40.7264, lng: -74.0339, label: 'Newport PATH' },
  stamford: { lat: 41.0467, lng: -73.5421, label: 'Stamford Station' },
  greenwich: { lat: 41.0262, lng: -73.6244, label: 'Greenwich Station' },
  westport: { lat: 41.1182, lng: -73.3677, label: 'Westport Station' },
};

const ROUTES_API = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const CONCURRENCY = 6;
const INFEASIBLE_THRESHOLD_MIN = 150;

// Next Monday 8:30 AM ET as RFC 3339. Required for transit routing —
// the API needs a future timestamp to look up scheduled service.
function nextMondayMorningISO() {
  const d = new Date();
  const daysUntilMonday = (8 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  // 8:30 AM ET ≈ 13:30 UTC during EDT, 12:30 UTC during EST. Use 13:30 UTC
  // as a "morning rush" approximation that lands roughly either way.
  d.setUTCHours(13, 30, 0, 0);
  return d.toISOString();
}

function getApiKey() {
  try {
    const stdout = execFileSync(
      'aws',
      [
        'ssm', 'get-parameter',
        '--name', SSM_PATH,
        '--with-decryption',
        '--region', SSM_REGION,
        '--query', 'Parameter.Value',
        '--output', 'text',
      ],
      { encoding: 'utf8' }
    );
    return stdout.trim();
  } catch (e) {
    console.error('Failed to read API key from Parameter Store. Is your AWS CLI configured?');
    console.error(`  Try: aws ssm get-parameter --name ${SSM_PATH} --region ${SSM_REGION}`);
    throw e;
  }
}

// Centroid = mean of all coordinates in the outer ring of the first polygon.
// Imperfect but good enough for routing within a neighborhood.
function centroid(geometry) {
  let coords;
  if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0];
  } else if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else {
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of coords) { sumLng += lng; sumLat += lat; }
  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

async function computeRoute(apiKey, origin, destination, departureTime) {
  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: 'TRANSIT',
    departureTime,
    // No routingPreference set → Google chooses the overall-best transit route,
    // which gives ferries a fairer shake. LESS_WALKING was biasing against
    // ferry-dependent NYC nbhds (Staten Island, Edgewater, Roosevelt Island).
  };
  const res = await fetch(ROUTES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Routes API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;
  const seconds = parseInt(String(route.duration).replace(/[^\d]/g, ''), 10);
  return Math.round(seconds / 60);
}

async function processNeighborhood(apiKey, n, departureTime) {
  const result = {};
  for (const [clusterId, cluster] of Object.entries(CLUSTERS)) {
    try {
      const minutes = await computeRoute(apiKey, n.centroid, cluster, departureTime);
      if (minutes !== null && minutes <= INFEASIBLE_THRESHOLD_MIN) {
        result[clusterId] = minutes;
      }
    } catch (e) {
      console.error(`  ${n.id} → ${clusterId}: ${e.message}`);
    }
  }
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const filter = argv.length > 0 ? new Set(argv) : null;

  console.log('Reading API key from Parameter Store...');
  const apiKey = getApiKey();

  const polygons = JSON.parse(readFileSync(POLYGONS_PATH, 'utf8'));
  const all = polygons.features
    .map((f) => ({ id: f.properties.id, centroid: centroid(f.geometry) }))
    .filter((n) => !filter || filter.has(n.id));

  if (all.length === 0) {
    console.error('No neighborhoods matched filter.');
    process.exit(1);
  }

  const departureTime = nextMondayMorningISO();
  console.log(`Computing commutes for ${all.length} neighborhoods × ${Object.keys(CLUSTERS).length} clusters`);
  console.log(`Departure time: ${departureTime} (transit, weekday morning)`);

  // Load existing output if present, so partial runs (or filtered runs) merge.
  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) : {};
  const out = { ...existing };

  let done = 0;
  const queue = [...all];
  async function worker() {
    while (queue.length > 0) {
      const n = queue.shift();
      const before = Date.now();
      const result = await processNeighborhood(apiKey, n, departureTime);
      out[n.id] = result;
      done++;
      const elapsed = ((Date.now() - before) / 1000).toFixed(1);
      const summary = Object.entries(result).map(([k, v]) => `${k}=${v}m`).join(', ') || 'no routes';
      console.log(`  [${done}/${all.length}] ${n.id} (${elapsed}s) → ${summary}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Apply editorial overrides per-cluster. The override file is committed
  // and durable across recomputes — Google's transit data has known gaps
  // (notably SI Ferry coverage and the Metro-North New Canaan Branch) so
  // editorial values for specific (neighborhood, cluster) pairs win.
  let overrideCount = 0;
  if (existsSync(OVERRIDES_PATH)) {
    const overrides = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'));
    for (const [id, clusterMap] of Object.entries(overrides)) {
      if (id.startsWith('_')) continue; // skip _comment / _overrides_by_reason
      out[id] = out[id] || {};
      for (const [cluster, minutes] of Object.entries(clusterMap)) {
        if (typeof minutes === 'number') {
          out[id][cluster] = minutes;
          overrideCount++;
        }
      }
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Neighborhoods covered: ${Object.keys(out).length}`);
  if (overrideCount > 0) console.log(`Editorial overrides applied: ${overrideCount}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
