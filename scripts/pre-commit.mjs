// Pre-commit gate (called by .githooks/pre-commit). Never bypass it with --no-verify: fix what it reports.
import { execFileSync, spawnSync } from 'node:child_process';
import { plan, runPlan } from './pre-commit-plan.mjs';

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean);

const steps = plan(staged);
if (steps.length === 0) {
  console.log('pre-commit: nothing to check for these files.');
  process.exit(0);
}

const quote = (a) => (/[\s"&|<>^]/.test(a) ? JSON.stringify(a) : a);
const result = runPlan(steps, (step) => {
  console.log(`\npre-commit: ${step.name}`);
  // npx is npx.cmd on Windows, which only runs through a shell.
  const win = process.platform === 'win32';
  const r = win
    ? spawnSync(['npx', '--no-install', ...step.args].map(quote).join(' '), { stdio: 'inherit', shell: true })
    : spawnSync('npx', ['--no-install', ...step.args], { stdio: 'inherit' });
  return r.status ?? 1;
});

if (!result.ok) {
  console.error(`\npre-commit: "${result.failed}" failed. Fix it and commit again (do not use --no-verify).`);
  process.exit(result.code || 1);
}
console.log('\npre-commit: all checks passed.');
