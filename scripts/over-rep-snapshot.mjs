// One-off T1/Pop snapshot script. Reads current content state, runs
// 10k Monte Carlo, prints reachability ratios for the over-rep and
// under-rep nbhds called out in the audit. Compare vs the brief's
// stale numbers to see how 2026-05-10-poc-v8 actually behaves.
import { spawn } from 'node:child_process';
const proc = spawn('npx', ['tsx', new URL('./over-rep-snapshot.ts', import.meta.url).pathname], {
  stdio: 'inherit',
});
proc.on('exit', (code) => process.exit(code ?? 0));
