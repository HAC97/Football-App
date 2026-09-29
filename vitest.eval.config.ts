import { defineConfig } from 'vitest/config'

// Periodic eval lane: hits the real ESPN API to check that the shapes our code depends on still hold.
// Run with `npm run eval` before shipping and on a schedule. Needs network; never part of the commit gate.
export default defineConfig({
  test: {
    include: ['evals/**/*.eval.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
