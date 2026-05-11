import { questions } from '../content/questions';
import { dimensions } from '../content/dimensions';
import { neighborhoods } from '../content/neighborhoods';
import { neighborhoodPopulations } from '../content/neighborhood-populations';
import { CONTENT_VERSION } from '../content/types';
import { runMonteCarloReachability } from '../tests/monte-carlo/simulate';

const SAMPLES = 10_000;
const SEED = 42;

const result = runMonteCarloReachability({
  samples: SAMPLES,
  seed: SEED,
  topK: [1, 5, 15],
  questions,
  dimensions,
  neighborhoods,
  populationsByNeighborhood: neighborhoodPopulations,
});

const totalPop = Object.values(neighborhoodPopulations).reduce((a, b) => a + b, 0);

const overRep = [
  'chinatown', 'montclair', 'greenpoint', 'lincoln-square', 'norwood',
  'midtown-east', 'fort-lee', 'park-slope', 'stamford',
];
const underRep = [
  'larchmont', 'bronxville', 'hastings-on-hudson', 'pelham', 'maplewood',
  'crown-heights', 'bed-stuy', 'brighton-beach', 'bay-ridge',
  'forest-hills', 'ditmas-park', 'st-george',
];

function ratio(id: string): { t1Share: number; popShare: number; t1OverPop: number } {
  const t1Count = result.perNeighborhood[id]?.[1] ?? 0;
  const t1Share = t1Count / SAMPLES;
  const pop = neighborhoodPopulations[id] ?? 0;
  const popShare = pop / totalPop;
  const t1OverPop = popShare > 0 ? t1Share / popShare : Infinity;
  return { t1Share, popShare, t1OverPop };
}

console.log(`\nMonte Carlo snapshot @ ${CONTENT_VERSION} (n=${SAMPLES}, seed=${SEED})\n`);
console.log('OVER-REP (target ≤ 1.5×):');
console.log('  nbhd                   T1%    Pop%   T1/Pop');
for (const id of overRep) {
  const r = ratio(id);
  const flag = r.t1OverPop > 2 ? '⚠️ ' : r.t1OverPop > 1.5 ? '⚡' : '✓ ';
  console.log(`  ${flag} ${id.padEnd(20)} ${(r.t1Share*100).toFixed(2).padStart(5)}%  ${(r.popShare*100).toFixed(2).padStart(5)}%  ${r.t1OverPop.toFixed(2).padStart(5)}×`);
}

console.log('\nUNDER-REP (target ≥ 0.5×):');
console.log('  nbhd                   T1%    Pop%   T1/Pop');
for (const id of underRep) {
  const r = ratio(id);
  const flag = r.t1OverPop < 0.4 ? '⚠️ ' : r.t1OverPop < 0.6 ? '⚡' : '✓ ';
  console.log(`  ${flag} ${id.padEnd(20)} ${(r.t1Share*100).toFixed(2).padStart(5)}%  ${(r.popShare*100).toFixed(2).padStart(5)}%  ${r.t1OverPop.toFixed(2).padStart(5)}×`);
}

const allRanked = neighborhoods
  .map(n => ({ id: n.id, ...ratio(n.id) }))
  .filter(r => r.popShare > 0)
  .sort((a, b) => b.t1OverPop - a.t1OverPop);

console.log('\nTop 10 most over-represented (corpus-wide):');
for (const r of allRanked.slice(0, 10)) {
  console.log(`  ${r.id.padEnd(20)} ${r.t1OverPop.toFixed(2)}×  (T1=${(r.t1Share*100).toFixed(2)}%, pop=${(r.popShare*100).toFixed(2)}%)`);
}

console.log('\nTop 10 most under-represented:');
for (const r of allRanked.slice(-10).reverse()) {
  console.log(`  ${r.id.padEnd(20)} ${r.t1OverPop.toFixed(2)}×  (T1=${(r.t1Share*100).toFixed(2)}%, pop=${(r.popShare*100).toFixed(2)}%)`);
}
