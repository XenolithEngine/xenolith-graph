import { defineConfig } from 'vitest/config'

// Default env is node — files that need a DOM opt in with a `// @vitest-environment jsdom`
// docblock (the same convention packages/render-pixi uses). keeps logic-level suites fast.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
