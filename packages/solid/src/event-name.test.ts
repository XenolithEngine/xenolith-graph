// @vitest-environment node
// Vite's dependency scan parses JSX with esbuild. `on:node:click` is two colons and the
// parser throws "Expected `>` but found `:`". `on:node-click` is the name the directive emits.
import { createRequire } from 'node:module'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { solidEventName } from './event-name.js'

function loadEsbuild(): { transformSync: (code: string, opts: { loader: string; jsx: string }) => unknown } {
  const root = join(import.meta.dirname, '../../..')
  const dir = readdirSync(join(root, 'node_modules/.pnpm')).find((name) => name.startsWith('esbuild@'))
  if (!dir) throw new Error('esbuild is not installed')
  const require = createRequire(import.meta.url)
  return require(join(root, 'node_modules/.pnpm', dir, 'node_modules/esbuild'))
}

const esbuild = loadEsbuild()

describe('solid event names (Vite dep scan)', () => {
  it('kebab-cases the one colon in an editor event', () => {
    expect(solidEventName('node:click')).toBe('node-click')
    expect(solidEventName('selection:changed')).toBe('selection-changed')
    expect(solidEventName('node:click').includes(':')).toBe(false)
  })

  it('esbuild accepts on:node-click and rejects on:node:click', () => {
    const good = 'export const el = <div on:node-click={() => 1} />'
    expect(() => esbuild.transformSync(good, { loader: 'tsx', jsx: 'automatic' })).not.toThrow()
    const bad = 'export const el = <div on:node:click={() => 1} />'
    expect(() => esbuild.transformSync(bad, { loader: 'tsx', jsx: 'automatic' })).toThrow(/:/)
  })
})
