// E4 contract: every package entrypoint imports cleanly in a NON-DOM environment (bare node —
// the Next.js server bundle case). No `window`/`document`/`HTMLElement` access at module scope.
// Runs in the DEFAULT node env (no jsdom docblock) and re-asserts the env really was DOM-less.
// Historical failure this locks out: graph-wc evaluated `extends HTMLElement` at module scope
// and crashed server bundles until the ElementBase guard (2026-09-28).
import { describe, it, expect } from 'vitest'

describe('import-time purity in bare node (E4)', () => {
  it('the environment really has no DOM', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(typeof HTMLElement).toBe('undefined')
  })

  it('@xenolithengine/graph-core imports and exports real members', async () => {
    const core = await import('@xenolithengine/graph-core')
    expect(typeof core.CommandBus).toBe('function')
    expect(typeof core.Graph).toBe('function')
  })

  it('@xenolithengine/graph-adapter-core imports', async () => {
    const adapterCore = await import('@xenolithengine/graph-adapter-core')
    expect(typeof adapterCore.createEditorBinding).toBe('function')
  })

  it('@xenolithengine/graph-react imports (component + hooks, no window at module scope)', async () => {
    const react = await import('@xenolithengine/graph-react')
    expect(typeof react.XenolithGraph).toBe('function')
    expect(typeof react.useNodes).toBe('function')
  })

  it('@xenolithengine/graph-editor imports (incl. PIXI) without a DOM', async () => {
    // The big one: the full editor with the PIXI v8 import graph evaluates cleanly in node.
    // Consumers can import editor symbols (types, serialize, diffGraphs) in server code as long
    // as they never CONSTRUCT an editor there.
    const editor = await import('@xenolithengine/graph-editor')
    expect(typeof editor.XenolithEditor).toBe('function')
    expect(typeof editor.importFromReactFlow).toBe('function')
    expect(typeof editor.serializeXenolithGraph).toBe('function')
  })

  it('@xenolithengine/graph-wc imports (HTMLElement base is lazily guarded for SSR)', async () => {
    const wc = await import('@xenolithengine/graph-wc')
    expect(typeof wc.register).toBe('function')
    expect(typeof wc.XenolithGraphElement).toBe('function')
    // register() no-ops without customElements — server-safe by contract.
    expect(() => wc.register()).not.toThrow()
  })
})
