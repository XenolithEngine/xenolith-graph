// @vitest-environment jsdom
// Consumer-style contract suite: what a HOST's vitest+jsdom suite does with this package.
// This file is the spec for mockPixi()/renderEditorToDOM() — it must boot the REAL editor
// (real `XenolithEditor.init` → real PIXI `Application.init` path), not a mocked editor.
// Adversarial review recommended: a mock that silently passes everything is worse than no mock.
import { describe, it, expect, afterEach } from 'vitest'
import { mockPixi, renderEditorToDOM, type MockPixiHandle, type EditorToDOMHandle } from './index.js'
import { XenolithEditor } from '@xenolithengine/graph-editor'

let mock: MockPixiHandle | null = null
let mounted: EditorToDOMHandle | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
  mock?.restore()
  mock = null
})

describe('mockPixi()', () => {
  it('returns non-null 2d + webgl contexts from canvas.getContext and restores the natives', () => {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext
    mock = mockPixi()
    const gl = document.createElement('canvas').getContext('webgl')
    expect(gl).toBeTruthy()
    expect(typeof (gl as WebGLRenderingContext).getParameter).toBe('function')
    const ctx2d = document.createElement('canvas').getContext('2d')
    expect(ctx2d).toBeTruthy()
    const metrics = ctx2d!.measureText('hello world')
    expect(metrics.width).toBeGreaterThan(0)
    mock.restore()
    mock = null
    expect(HTMLCanvasElement.prototype.getContext).toBe(nativeGetContext)
    // back to jsdom natives: no WebGL in jsdom, so the same call yields null
    expect(document.createElement('canvas').getContext('webgl')).toBe(null)
  })

  it('keeps stub contexts stable per canvas (2d and webgl return the same object on repeat calls)', () => {
    mock = mockPixi()
    const canvas = document.createElement('canvas')
    expect(canvas.getContext('webgl')).toBe(canvas.getContext('webgl'))
    expect(canvas.getContext('2d')).toBe(canvas.getContext('2d'))
  })

  it('exposes webgl context attributes good enough for renderer feature detection', () => {
    mock = mockPixi()
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext
    const attrs = gl.getContextAttributes()
    expect(attrs).toBeTruthy()
    expect(typeof attrs!.antialias).toBe('boolean')
    expect(typeof attrs!.alpha).toBe('boolean')
  })

  it('answers the GL integer queries PIXI init asks for with plausible numbers', () => {
    mock = mockPixi()
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext
    expect(gl.getParameter(gl.MAX_TEXTURE_SIZE)).toBeGreaterThan(0)
    expect(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)).toBeGreaterThan(0)
    expect(gl.getError()).toBe(0)
    const fmt = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
    expect(fmt).toBeTruthy()
    expect(fmt!.precision).toBeGreaterThan(0)
  })

  it('installs ResizeObserver when the environment lacks one, and removes it on restore', () => {
    const hadRO = typeof ResizeObserver !== 'undefined'
    mock = mockPixi()
    expect(typeof ResizeObserver).toBe('function')
    const ro = new ResizeObserver(() => {})
    ro.observe(document.body)
    ro.disconnect()
    mock.restore()
    mock = null
    expect(typeof ResizeObserver === 'function').toBe(hadRO)
  })

  it('manual RAF mode: rAF queues callbacks, flushFrames() runs them in order, restore puts the native back', () => {
    const nativeRaf = globalThis.requestAnimationFrame
    mock = mockPixi()
    const order: number[] = []
    const id1 = requestAnimationFrame(() => order.push(1))
    const id2 = requestAnimationFrame(() => order.push(2))
    expect(id1).not.toBe(id2)
    expect(order).toEqual([])
    mock.flushFrames()
    expect(order).toEqual([1, 2])
    mock.restore()
    mock = null
    expect(globalThis.requestAnimationFrame).toBe(nativeRaf)
  })
})

describe('renderEditorToDOM() — REAL editor boot under jsdom', () => {
  it('boots XenolithEditor through the real PIXI Application.init path and mounts a canvas', async () => {
    const h = await renderEditorToDOM()
    mounted = h
    expect(h.editor).toBeInstanceOf(XenolithEditor)
    expect(h.container.querySelector('canvas')).toBeTruthy()
    expect(document.body.contains(h.container)).toBe(true)
  })

  it('takes the WEBGL renderer path, not the Canvas2D fallback (fidelity guard)', async () => {
    // jsdom without the `canvas` package lacks WebGLRenderingContext/CanvasRenderingContext2D
    // globals, which makes pixi's isWebGLSupported() return false → silent CanvasRenderer
    // fallback. mockPixi must stub the classes so autoDetectRenderer picks WebGL.
    const gl = mockPixi()
    try {
      expect(typeof WebGLRenderingContext).toBe('function')
      expect(typeof CanvasRenderingContext2D).toBe('function')
      const h = await renderEditorToDOM()
      mounted = h
      // the renderer requested a GL context (webgl or webgl2) on the view canvas
      expect(gl.stats.webgl + gl.stats.webgl2).toBeGreaterThan(0)
    } finally {
      gl.restore()
    }
    expect(typeof WebGLRenderingContext === 'function').toBe(
      typeof globalThis.WebGLRenderingContext === 'function',
    )
  })

  it('accepts a caller-provided host element instead of creating one', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const h = await renderEditorToDOM({ host })
    mounted = h
    expect(h.container).toBe(host)
    expect(host.querySelector('canvas')).toBeTruthy()
  })

  it('registers schemas, inserts nodes and connects them — graph state is observable via toJSON', async () => {
    const h = await renderEditorToDOM()
    mounted = h
    const { editor } = h
    editor.registry.register({
      type: 'Number',
      title: 'Number',
      category: 'data',
      pins: [
        { kind: 'data', direction: 'in', type: 'float', label: 'In' },
        { kind: 'data', direction: 'out', type: 'float', label: 'Out' },
      ],
    })
    const a = editor.insertNode('Number', { x: 0, y: 0 })
    const b = editor.insertNode('Number', { x: 200, y: 0 })
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    const edgeId = editor.connect(a!, 1, b!, 0)
    expect(edgeId).toBeTruthy()
    const json = editor.toJSON()
    expect(json.nodes).toHaveLength(2)
    expect(json.edges).toHaveLength(1)
  })

  it('unmount() destroys the editor, removes the canvas and detaches the container', async () => {
    const h = await renderEditorToDOM()
    const { editor, container, unmount } = h
    unmount()
    mounted = null
    expect(container.isConnected).toBe(false)
    expect(container.querySelector('canvas')).toBe(null)
    // destroyed editor is inert: further mutations do not throw but do not apply either
    const before = editor.toJSON()
    editor.insertNode('Number', { x: 0, y: 0 })
    expect(editor.toJSON()).toEqual(before)
  })

  it('mockPixi() and renderEditorToDOM() compose — manual mock control still boots', async () => {
    mock = mockPixi()
    const h = await renderEditorToDOM()
    mounted = h
    expect(h.editor).toBeInstanceOf(XenolithEditor)
  })
})
