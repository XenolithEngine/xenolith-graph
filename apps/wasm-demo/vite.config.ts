import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pkgSrc = (name: string): string => resolve(here, '..', '..', 'packages', name, 'src', 'index.ts')

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/wasm/' : '/',
  plugins: [react()],
  server: { port: 5183 },
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' },
  // assemblyscript ships top-level-await in its bundle — needs an ES2022 prebundle target.
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  resolve: {
    alias: [
      { find: '@xenolithengine/graph-core', replacement: pkgSrc('core') },
      { find: '@xenolithengine/graph-render-pixi', replacement: pkgSrc('render-pixi') },
      { find: '@xenolithengine/graph-editor', replacement: pkgSrc('editor') },
      { find: '@xenolithengine/graph-plugin-runtime', replacement: pkgSrc('plugin-runtime') },
      { find: '@xenolithengine/graph-runtime-as', replacement: pkgSrc('runtime-as') },
      { find: '@xenolithengine/graph-adapter-core', replacement: pkgSrc('adapter-core') },
      { find: '@xenolithengine/graph-react', replacement: resolve(here, '..', '..', 'packages', 'react', 'src', 'index.tsx') },
      { find: '@xenolithengine/graph-theme-xen', replacement: pkgSrc('theme-xen') },
    ],
  },
}))
