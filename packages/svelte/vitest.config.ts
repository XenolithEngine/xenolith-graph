import { defineConfig } from 'vitest/config'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// `svelte()` compiles our .svelte components (panels + the widget shim) inside tests;
// `vitePreprocess` handles their `lang="ts"` script blocks.
// `browser` in resolve.conditions stays REQUIRED: in the default node condition vitest resolves
// solid-style server builds where available — for svelte specifically, `svelte/store` needs the
// browser condition for consistent runtime behavior under jsdom.
export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
  resolve: { conditions: ['browser', 'development'] },
  test: { environment: 'jsdom' },
})
