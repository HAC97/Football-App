import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Gate tests: deterministic, offline, fast. Live-API evals live in vitest.eval.config.ts.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
