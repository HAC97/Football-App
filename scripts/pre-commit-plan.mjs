// Pure parts of the pre-commit hook: which checks a set of staged files needs, and running them in order.

const CODE = /^(src|evals)\/.+\.(ts|tsx)$/;
// A change to any of these can break code that was not itself staged, so the whole suite runs.
const GLOBAL = /^(package\.json|package-lock\.json|vite\.config\.ts|vitest\.eval\.config\.ts|eslint\.config\.js|tsconfig[^/]*\.json|src\/test\/.+|scripts\/.+)$/;
const TYPES = /\.(ts|tsx)$|^(package\.json|tsconfig[^/]*\.json)$/;

/**
 * Checks for the staged files, cheapest first. Lint and tests are scoped to what changed,
 * the type check is project-wide (tsc -b is incremental, so it is fast after the first run).
 * shortcut: checks the working tree, not the staged blobs, so `git add -p` can commit code that was not checked; upgrade to a stash-based run if that bites.
 * @param {string[]} staged repo-relative paths with forward slashes
 * @returns {{ name: string, args: string[] }[]} each step is an `npx --no-install` invocation
 */
export function plan(staged) {
  const code = staged.filter((f) => CODE.test(f));
  const full = staged.some((f) => GLOBAL.test(f));
  const steps = [];
  if (code.length > 0) steps.push({ name: 'lint', args: ['eslint', '--max-warnings=0', ...code] });
  if (staged.some((f) => TYPES.test(f))) steps.push({ name: 'typecheck', args: ['tsc', '-b'] });
  if (full) steps.push({ name: 'tests (all)', args: ['vitest', 'run'] });
  else if (code.length > 0) steps.push({ name: 'tests (related)', args: ['vitest', 'related', '--run', '--passWithNoTests', ...code] });
  return steps;
}

/**
 * Runs the steps in order and stops at the first failure.
 * @param {{ name: string, args: string[] }[]} steps
 * @param {(step: { name: string, args: string[] }) => number} exec returns the exit code
 * @returns {{ ok: true } | { ok: false, failed: string, code: number }}
 */
export function runPlan(steps, exec) {
  for (const step of steps) {
    const code = exec(step);
    if (code !== 0) return { ok: false, failed: step.name, code };
  }
  return { ok: true };
}
