import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Integration tests hit the real dev Postgres instance and mutate shared
    // rows (tdg_agency_cycles, tdg_credits_ledger, tdg_credits_balance) —
    // run them sequentially to avoid cross-test race conditions.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
