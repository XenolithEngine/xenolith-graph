// Build the WASM/AssemblyScript Mandelbrot demo SPA (apps/wasm-demo) and drop its static output
// into the site's public/ so it ships with the docs site at /xenolith-graph/wasm/. Run before
// `astro build` (Astro copies public/ verbatim into dist/). The SPA's vite base is set to that
// sub-path. Mirrors build-fairqueue.mjs.
import { execSync } from 'node:child_process'
import { rmSync, cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..')
const demoDist = resolve(repoRoot, 'apps', 'wasm-demo', 'dist')
const out = resolve(here, '..', 'public', 'wasm')

// Run vite directly (NOT the package's `build`, which prefixes `tsc -b`). vite resolves @xenolithengine/graph-*
// via aliases to each package's src, so no built .d.ts/dist is required — same pattern as
// build-fairqueue.mjs.
console.log('[wasm-demo] building @xenolithengine/wasm-demo (vite)…')
execSync('pnpm --filter @xenolithengine/wasm-demo exec vite build', { stdio: 'inherit', cwd: repoRoot })

rmSync(out, { recursive: true, force: true })
cpSync(demoDist, out, { recursive: true })
console.log(`[wasm-demo] copied → ${out}`)
