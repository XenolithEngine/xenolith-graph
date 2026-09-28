// G1 — STABLE-API ↔ code sync gate. The doc has drifted before (`editor.isDestroyed` was
// listed but missing from the class). This test parses the editor section of STABLE-API.md and
// asserts every documented `editor.<member>` exists on the class (runtime prototype + statics),
// and — when a build output exists (CI builds before testing) — that the symbols we declared
// `@internal` are actually stripped from the public `.d.ts`.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { XenolithEditor } from './index.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const STABLE_API = readFileSync(join(REPO_ROOT, 'STABLE-API.md'), 'utf8')

/** The `@xenolithengine/graph-editor` section of STABLE-API (up to the next package header). */
const editorSection = STABLE_API.split('### `@xenolithengine/graph-editor`')[1]!.split('### ')[0]!

const documented = new Set<string>()
for (const m of editorSection.matchAll(/`editor\.([A-Za-z][A-Za-z0-9]*)[(`.{]/g)) documented.add(m[1]!)
// `editor.X` at the very end of a backtick span (no trailing char matched above)
for (const m of editorSection.matchAll(/`editor\.([A-Za-z][A-Za-z0-9]*)`/g)) documented.add(m[1]!)

describe('STABLE-API ↔ XenolithEditor sync (G1)', () => {
  it('every documented editor.<member> exists on the class (prototype, instance field, or static)', () => {
    expect(documented.size).toBeGreaterThan(40) // the parse found the real table, not a stub
    const proto = Object.getOwnPropertyNames(XenolithEditor.prototype)
    const statics = Object.getOwnPropertyNames(XenolithEditor)
    // Instance FIELDS (`readonly contextMenu = …`, `readonly selection: Selection`) never reach
    // the prototype, and the class cannot be instantiated without a WebGL host — match their
    // declarations in the source instead.
    const source = readFileSync(join(REPO_ROOT, 'packages/editor/src/index.ts'), 'utf8')
    const declaredInSource = (name: string): boolean =>
      new RegExp(`(^|\\s)(readonly\\s+)?${name}(\\s*[:=]|\\s*\\()`).test(
        source.split(`class XenolithEditor`)[1] ?? '',
      )
    const missing = [...documented].filter(
      (name) => !proto.includes(name) && !statics.includes(name) && !declaredInSource(name),
    )
    expect(missing, 'documented in STABLE-API but missing from the class (doc drift)').toEqual([])
  })

  it('@internal members are stripped from the public .d.ts when a build exists', () => {
    const dts = join(REPO_ROOT, 'packages/editor/dist/index.d.ts')
    if (!existsSync(dts)) return // no build output in this checkout — CI builds before testing
    const text = readFileSync(dts, 'utf8')
    for (const symbol of ['requestRender', 'renderedNodeCount', 'renderedNodePosition', 'isNodeRendered']) {
      expect(text, `${symbol} must carry @internal and be stripped by stripInternal`).not.toContain(symbol)
    }
  })
})
