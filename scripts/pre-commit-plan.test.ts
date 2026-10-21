import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain .mjs without type declarations (it carries JSDoc)
import { plan, runPlan } from './pre-commit-plan.mjs';

type Step = { name: string; args: string[] };
const names = (files: string[]) => (plan(files) as Step[]).map((s) => s.name);

describe('plan', () => {
  it('has nothing to check for docs and assets', () => {
    expect(plan(['README.md', 'DESIGN.md', 'public/favicon.svg', 'src/styles/app.css', '.github/workflows/ci.yml'])).toEqual([]);
    expect(plan([])).toEqual([]);
  });

  it('lints, type checks and runs the related tests for a source file', () => {
    const steps = plan(['src/lib/url.ts']) as Step[];
    expect(steps.map((s) => s.name)).toEqual(['lint', 'typecheck', 'tests (related)']);
    expect(steps[0].args).toEqual(['eslint', '--max-warnings=0', 'src/lib/url.ts']);
    expect(steps[2].args).toEqual(['vitest', 'related', '--run', '--passWithNoTests', 'src/lib/url.ts']);
  });

  it('passes every staged code file to lint and related tests, tsx included', () => {
    const steps = plan(['src/App.tsx', 'src/lib/url.ts', 'evals/espn.eval.ts', 'README.md']) as Step[];
    expect(steps[0].args.slice(2)).toEqual(['src/App.tsx', 'src/lib/url.ts', 'evals/espn.eval.ts']);
    expect(steps.at(-1)!.args.slice(4)).toEqual(['src/App.tsx', 'src/lib/url.ts', 'evals/espn.eval.ts']);
  });

  it('does not hand non-code files to eslint (its config only covers ts and tsx)', () => {
    const lint = (plan(['src/main.tsx', 'eslint.config.js', 'scripts/pre-commit.mjs', 'vite.config.ts']) as Step[]).find((s) => s.name === 'lint')!;
    expect(lint.args.slice(2)).toEqual(['src/main.tsx']);
  });

  it.each(['package.json', 'package-lock.json', 'vite.config.ts', 'eslint.config.js', 'tsconfig.app.json', 'src/test/setup-dom.ts', 'scripts/pre-commit-plan.mjs'])(
    'runs the whole suite when %s changes, since it can break code that was not staged',
    (file) => {
      const steps = plan([file]) as Step[];
      expect(steps.at(-1)).toEqual({ name: 'tests (all)', args: ['vitest', 'run'] });
      expect(names([file, 'src/lib/url.ts'])).not.toContain('tests (related)');
    },
  );

  it('type checks when only a tsconfig or package.json changes', () => {
    expect(names(['tsconfig.app.json'])).toContain('typecheck');
    expect(names(['package.json'])).toContain('typecheck');
    expect(names(['README.md'])).not.toContain('typecheck');
  });

  it('orders the steps cheapest first: lint, then types, then tests', () => {
    expect(names(['src/App.tsx', 'package.json'])).toEqual(['lint', 'typecheck', 'tests (all)']);
  });

  it('does not treat a lookalike path as source: no lint and no tests for it', () => {
    expect(names(['docs/src/x.ts', 'srcx/a.ts', 'src/readme.md'])).toEqual(['typecheck']); // a stray .ts still gets the type check
    expect(plan(['src/readme.md'])).toEqual([]);
  });
});

describe('runPlan', () => {
  const steps: Step[] = [
    { name: 'a', args: [] },
    { name: 'b', args: [] },
    { name: 'c', args: [] },
  ];

  it('runs every step in order when they pass', () => {
    const exec = vi.fn(() => 0);
    expect(runPlan(steps, exec)).toEqual({ ok: true });
    expect(exec.mock.calls.map(([s]) => (s as Step).name)).toEqual(['a', 'b', 'c']);
  });

  it('stops at the first failure and reports it and its exit code', () => {
    const exec = vi.fn((s: Step) => (s.name === 'b' ? 3 : 0));
    expect(runPlan(steps, exec)).toEqual({ ok: false, failed: 'b', code: 3 });
    expect(exec).toHaveBeenCalledTimes(2); // c never ran
  });

  it('passes with no steps', () => {
    expect(runPlan([], vi.fn())).toEqual({ ok: true });
  });
});
