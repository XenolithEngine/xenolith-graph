import { defineConfig } from 'vitest/config'

// `browser` in resolve.conditions is REQUIRED: in the default node condition vitest resolves
// solid-js's SERVER build, where `createEffect` is a no-op — reactive code silently never runs.
export default defineConfig({
  resolve: { conditions: ['browser', 'development'] },
  test: { environment: 'jsdom' },
})
