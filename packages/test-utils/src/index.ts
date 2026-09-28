/**
 * jsdom test kit for XenolithGraph hosts — boot the REAL editor headlessly.
 *
 * `mockPixi()` stubs the DOM/browser boundary (not PIXI itself): canvas `getContext` returns
 * fake 2D/WebGL context objects good enough for PIXI v8's `Application.init` and the editor's
 * boot path; `ResizeObserver` is polyfilled; `requestAnimationFrame` becomes a deterministic
 * manual queue (`flushFrames()`). `renderEditorToDOM()` composes all of it into one call that
 * mounts a real `XenolithEditor` into the document.
 *
 * Fidelity contract (tested in `boot.test.ts`): contexts are cached per canvas, GL integer
 * queries return plausible values, restore() puts every native back. The stub is permissive by
 * design — it proves BOOT and graph-state plumbing, not rendered pixels.
 */

/** Handle over everything `mockPixi()` installed. Call `restore()` exactly once. */
export interface MockPixiHandle {
  /** Undo every global patch (getContext, ResizeObserver, rAF, context classes). */
  restore(): void
  /** Manual RAF mode only: run pending animation-frame callbacks. `generations` defaults to 1. */
  flushFrames(generations?: number): void
  /** Mock introspection: how many contexts of each type were handed out (per mockPixi call). */
  readonly stats: { readonly webgl: number; readonly webgl2: number; readonly '2d': number }
}

export interface MockPixiOptions {
  /**
   * `'manual'` (default): rAF callbacks queue until {@link MockPixiHandle.flushFrames} runs
   * them — deterministic, no ticker churn. `'native'`: leave the environment's own rAF alone.
   */
  raf?: 'manual' | 'native'
}

// ---- GL constants (real spec values, so raw-number queries also match) ------------------------
const GL_CONSTANTS = {
  NO_ERROR: 0, NONE: 0,
  FALSE: 0, TRUE: 1,
  BYTE: 0x1400, UNSIGNED_BYTE: 0x1401, SHORT: 0x1402, UNSIGNED_SHORT: 0x1403,
  INT: 0x1404, UNSIGNED_INT: 0x1405, FLOAT: 0x1406,
  HALF_FLOAT: 0x140b,
  FIXED: 0x140c,
  RGB: 0x1907, RGBA: 0x1908, LUMINANCE: 0x1909, LUMINANCE_ALPHA: 0x190a,
  DEPTH_COMPONENT: 0x1902, DEPTH_STENCIL: 0x84f9,
  ALPHA: 0x1906, RED: 0x1903, GREEN: 0x1904, BLUE: 0x1905,
  RG: 0x8227, R8: 0x8229, RG8: 0x822b, RGBA8: 0x8058,
  RGBA4: 0x8056, RGB5_A1: 0x8057, RGB565: 0x8d62,
  DEPTH_COMPONENT16: 0x81a5, DEPTH_COMPONENT24: 0x81a6, DEPTH_COMPONENT32F: 0x8cad,
  STENCIL_INDEX8: 0x8d48,
  NEAREST: 0x2600, LINEAR: 0x2601, NEAREST_MIPMAP_NEAREST: 0x2700,
  LINEAR_MIPMAP_NEAREST: 0x2701, NEAREST_MIPMAP_LINEAR: 0x2702, LINEAR_MIPMAP_LINEAR: 0x2703,
  TEXTURE_MAG_FILTER: 0x2800, TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803,
  REPEAT: 0x2901, CLAMP_TO_EDGE: 0x812f, MIRRORED_REPEAT: 0x8370,
  TEXTURE_2D: 0x0de1, TEXTURE_CUBE_MAP: 0x8513, TEXTURE_3D: 0x806f, TEXTURE_2D_ARRAY: 0x8c1a,
  TEXTURE0: 0x84c0, // +1 per unit; PIXI uses TEXTURE0 + i
  ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88e4, DYNAMIC_DRAW: 0x88e8, STREAM_DRAW: 0x88e0,
  BUFFER_SIZE: 0x8764, BUFFER_USAGE: 0x8765,
  FLOAT_VEC2: 0x8b50, FLOAT_VEC3: 0x8b51, FLOAT_VEC4: 0x8b52,
  INT_VEC2: 0x8b53, INT_VEC3: 0x8b54, INT_VEC4: 0x8b55,
  BOOL: 0x8b56, BOOL_VEC2: 0x8b57, BOOL_VEC3: 0x8b58, BOOL_VEC4: 0x8b59,
  FLOAT_MAT2: 0x8b5a, FLOAT_MAT3: 0x8b5b, FLOAT_MAT4: 0x8b5c,
  SAMPLER_2D: 0x8b5e, SAMPLER_CUBE: 0x8b60, SAMPLER_3D: 0x8b5f, SAMPLER_2D_ARRAY: 0x8dcf,
  INT_SAMPLER_2D: 0x8dca, UNSIGNED_INT_SAMPLER_2D: 0x8dd2,
  FLOAT_SAMPLER_2D: 0x8b5e,
  COMPILE_STATUS: 0x8b81, LINK_STATUS: 0x8b82, VALIDATE_STATUS: 0x8b83,
  FRAGMENT_SHADER: 0x8b30, VERTEX_SHADER: 0x8b31,
  SHADER_TYPE: 0x8b4f, DELETE_STATUS: 0x8b80,
  ACTIVE_ATTRIBUTES: 0x8b89, ACTIVE_UNIFORMS: 0x8b86,
  ATTACHED_SHADERS: 0x8b85, CURRENT_PROGRAM: 0x8b8d,
  SHADING_LANGUAGE_VERSION: 0x8b8c,
  LOW_FLOAT: 0x8df0, MEDIUM_FLOAT: 0x8df1, HIGH_FLOAT: 0x8df2,
  LOW_INT: 0x8df3, MEDIUM_INT: 0x8df4, HIGH_INT: 0x8df5,
  MAX_VERTEX_ATTRIBS: 0x8869, MAX_VARYING_VECTORS: 0x8dfc,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb, MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
  MAX_TEXTURE_SIZE: 0x0d33, MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
  MAX_RENDERBUFFER_SIZE: 0x84e8, MAX_VIEWPORT_DIMS: 0x0d3a,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
  ALIASED_POINT_SIZE_RANGE: 0x846d, ALIASED_LINE_WIDTH_RANGE: 0x846e,
  VIEWPORT: 0x0ba2, SCISSOR_BOX: 0x0c10, SCISSOR_TEST: 0x0c11,
  RED_BITS: 0x0d52, GREEN_BITS: 0x0d53, BLUE_BITS: 0x0d54, ALPHA_BITS: 0x0d55,
  DEPTH_BITS: 0x0d56, STENCIL_BITS: 0x0d57, SUBPIXEL_BITS: 0x0d50,
  VERSION: 0x1f02, VENDOR: 0x1f00, RENDERER: 0x1f01,
  UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246,
  DEPTH_TEST: 0x0b71, STENCIL_TEST: 0x0b90, BLEND: 0x0be2, CULL_FACE: 0x0b44,
  DITHER: 0x0bd0, POLYGON_OFFSET_FILL: 0x8037, SAMPLE_ALPHA_TO_COVERAGE: 0x809e,
  SAMPLE_COVERAGE: 0x80a0, SCISSOR_TEST_DUP: 0x0c11,
  NEVER: 0x0200, LESS: 0x0201, EQUAL: 0x0202, LEQUAL: 0x0203, GREATER: 0x0204,
  NOTEQUAL: 0x0205, GEQUAL: 0x0206, ALWAYS: 0x0207,
  ZERO: 0, ONE: 1, SRC_COLOR: 0x0300, ONE_MINUS_SRC_COLOR: 0x0301,
  SRC_ALPHA: 0x0302, ONE_MINUS_SRC_ALPHA: 0x0303, DST_ALPHA: 0x0304, ONE_MINUS_DST_ALPHA: 0x0305,
  DST_COLOR: 0x0306, ONE_MINUS_DST_COLOR: 0x0307, SRC_ALPHA_SATURATE: 0x0308,
  FUNC_ADD: 0x8006, FUNC_SUBTRACT: 0x800a, FUNC_REVERSE_SUBTRACT: 0x800b,
  MIN: 0x8007, MAX: 0x8008,
  FRONT: 0x0404, BACK: 0x0405, FRONT_AND_BACK: 0x0408,
  CW: 0x0900, CCW: 0x0901,
  POINTS: 0x0000, LINES: 0x0001, LINE_LOOP: 0x0002, LINE_STRIP: 0x0003,
  TRIANGLES: 0x0004, TRIANGLE_STRIP: 0x0005, TRIANGLE_FAN: 0x0006,
  FRAGMENT_SHADER_DERIVATIVE_HINT: 0x8b8b,
  GENERATE_MIPMAP_HINT: 0x8192,
  FASTEST: 0x1101, NICEST: 0x1102, DONT_CARE: 0x1100,
  UNPACK_FLIP_Y_WEBGL: 0x9240, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243, BROWSER_DEFAULT_WEBGL: 0x9244,
  COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x0100, STENCIL_BUFFER_BIT: 0x0400,
  // WebGL2 additions (subset PIXI queries)
  MAX_3D_TEXTURE_SIZE: 0x8073, MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
  MAX_COLOR_ATTACHMENTS: 0x8cdf, MAX_DRAW_BUFFERS: 0x8824,
  MAX_ELEMENTS_INDICES: 0x80e9, MAX_ELEMENTS_VERTICES: 0x80e8,
  MAX_FRAGMENT_INPUT_COMPONENTS: 0x9125, MAX_PROGRAM_TEXEL_OFFSET: 0x8905,
  MAX_SAMPLES: 0x8d57, MAX_SERVER_WAIT_TIMEOUT: 0x9111,
  MAX_TEXTURE_LOD_BIAS: 0x84fd, MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 0x8e8f,
  MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 0x8e8b,
  MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: 0x8e8a,
  MAX_UNIFORM_BLOCK_SIZE: 0x8a41, MAX_UNIFORM_BUFFER_BINDINGS: 0x8dcf,
  MAX_VARYING_COMPONENTS: 0x8b4b, MAX_VERTEX_OUTPUT_COMPONENTS: 0x9122,
  MAX_ELEMENT_INDEX: 0x8d6b,
  MIN_PROGRAM_TEXEL_OFFSET: 0x8904,
  UNIFORM_BUFFER_OFFSET_ALIGNMENT: 0x8a34,
  TRANSFORM_FEEDBACK_BUFFER_BINDING: 0x8e25,
  UNIFORM_BUFFER_BINDING: 0x8a28,
  READ_FRAMEBUFFER: 0x8ca8, DRAW_FRAMEBUFFER: 0x8ca6, FRAMEBUFFER: 0x8d40,
  FRAMEBUFFER_COMPLETE: 0x8cd5, FRAMEBUFFER_BINDING: 0x8ca6,
  COLOR_ATTACHMENT0: 0x8ce0, DEPTH_ATTACHMENT: 0x8d00, STENCIL_ATTACHMENT: 0x8d20,
  RENDERBUFFER: 0x8d41, RENDERBUFFER_BINDING: 0x8ca7,
  RASTERIZER_DISCARD: 0x8c89,
  UNIFORM_TYPE: 0x8a37, UNIFORM_SIZE: 0x8a38, UNIFORM_BLOCK_INDEX: 0x8a3a,
  UNIFORM_OFFSET: 0x8a3d, UNIFORM_ARRAY_STRIDE: 0x8a3e,
  UNIFORM_IS_ROW_MAJOR: 0x876e,
  TEXTURE_BINDING_2D: 0x8069, TEXTURE_BINDING_CUBE_MAP: 0x8514,
} as const

/** getParameter return values, keyed by the CONSTANT's numeric value. */
const glParamValues = new Map<number, unknown>([
  [GL_CONSTANTS.MAX_TEXTURE_SIZE!, 4096],
  [GL_CONSTANTS.MAX_CUBE_MAP_TEXTURE_SIZE!, 4096],
  [GL_CONSTANTS.MAX_RENDERBUFFER_SIZE!, 4096],
  [GL_CONSTANTS.MAX_3D_TEXTURE_SIZE!, 512],
  [GL_CONSTANTS.MAX_ARRAY_TEXTURE_LAYERS!, 256],
  [GL_CONSTANTS.MAX_VIEWPORT_DIMS!, new Int32Array([8192, 8192])],
  [GL_CONSTANTS.VIEWPORT!, new Int32Array([0, 0, 800, 600])],
  [GL_CONSTANTS.SCISSOR_BOX!, new Int32Array([0, 0, 800, 600])],
  [GL_CONSTANTS.MAX_TEXTURE_IMAGE_UNITS!, 16],
  [GL_CONSTANTS.MAX_VERTEX_TEXTURE_IMAGE_UNITS!, 16],
  [GL_CONSTANTS.MAX_COMBINED_TEXTURE_IMAGE_UNITS!, 32],
  [GL_CONSTANTS.MAX_VERTEX_ATTRIBS!, 16],
  [GL_CONSTANTS.MAX_VARYING_VECTORS!, 30],
  [GL_CONSTANTS.MAX_VARYING_COMPONENTS!, 60],
  [GL_CONSTANTS.MAX_VERTEX_UNIFORM_VECTORS!, 4095],
  [GL_CONSTANTS.MAX_FRAGMENT_UNIFORM_VECTORS!, 221],
  [GL_CONSTANTS.MAX_FRAGMENT_INPUT_COMPONENTS!, 60],
  [GL_CONSTANTS.MAX_VERTEX_OUTPUT_COMPONENTS!, 64],
  [GL_CONSTANTS.MAX_COLOR_ATTACHMENTS!, 8],
  [GL_CONSTANTS.MAX_DRAW_BUFFERS!, 8],
  [GL_CONSTANTS.MAX_ELEMENTS_VERTICES!, 65536],
  [GL_CONSTANTS.MAX_ELEMENTS_INDICES!, 65536],
  [GL_CONSTANTS.MAX_ELEMENT_INDEX!, 4294967295],
  [GL_CONSTANTS.MAX_SAMPLES!, 8],
  [GL_CONSTANTS.MAX_UNIFORM_BLOCK_SIZE!, 65536],
  [GL_CONSTANTS.MAX_UNIFORM_BUFFER_BINDINGS!, 24],
  [GL_CONSTANTS.MAX_TEXTURE_LOD_BIAS!, 2],
  [GL_CONSTANTS.UNIFORM_BUFFER_OFFSET_ALIGNMENT!, 256],
  [GL_CONSTANTS.ALIASED_POINT_SIZE_RANGE!, new Float32Array([1, 255])],
  [GL_CONSTANTS.ALIASED_LINE_WIDTH_RANGE!, new Float32Array([1, 8])],
  [GL_CONSTANTS.RED_BITS!, 8], [GL_CONSTANTS.GREEN_BITS!, 8],
  [GL_CONSTANTS.BLUE_BITS!, 8], [GL_CONSTANTS.ALPHA_BITS!, 8],
  [GL_CONSTANTS.DEPTH_BITS!, 24], [GL_CONSTANTS.STENCIL_BITS!, 8],
  [GL_CONSTANTS.SUBPIXEL_BITS!, 4],
  [GL_CONSTANTS.VERSION!, 'WebGL 2.0 (xenolith test-utils stub)'],
  [GL_CONSTANTS.SHADING_LANGUAGE_VERSION!, 'WebGL GLSL ES 3.00 (stub)'],
  [GL_CONSTANTS.VENDOR!, 'XenolithEngine test-utils'],
  [GL_CONSTANTS.RENDERER!, 'HEADLESS-GPU stub'],
  [GL_CONSTANTS.UNMASKED_VENDOR_WEBGL!, 'XenolithEngine test-utils'],
  [GL_CONSTANTS.UNMASKED_RENDERER_WEBGL!, 'HEADLESS-GPU stub'],
])

let unknownConstantSeed = 0x30000
/** Deterministic unique id for constants we didn't spell out — stable within a context. */
function nextUnknownConstant(): number { return ++unknownConstantSeed }

function makeFakeWebGLContext(canvas: HTMLCanvasElement, version: 'webgl' | 'webgl2'): unknown {
  const constants = new Map<string, number>()
  for (const [k, v] of Object.entries(GL_CONSTANTS)) {
    if (k.endsWith('_DUP')) continue
    constants.set(k, v)
  }
  // Texture unit constants expand beyond TEXTURE0.
  for (let i = 1; i < 32; i++) constants.set(`TEXTURE${i}`, GL_CONSTANTS.TEXTURE0! + i)

  const objects = new Set<object>()
  const mint = (): object => { const o = {}; objects.add(o); return o }

  const base: Record<string | symbol, unknown> = {
    canvas,
    drawingBufferWidth: canvas.width || 800,
    drawingBufferHeight: canvas.height || 600,
    isContextLost: () => false,
    getContextAttributes: () => ({
      alpha: true, antialias: true, depth: true, stencil: true,
      premultipliedAlpha: true, preserveDrawingBuffer: false,
      powerPreference: 'default', failIfMajorPerformanceCaveat: false, desynchronized: false,
    }),
    getParameter: (p: number) => glParamValues.get(p) ?? 0,
    getError: () => 0,
    getSupportedExtensions: () => [
      'ANGLE_instanced_arrays', 'EXT_texture_filter_anisotropic', 'OES_texture_float',
      'WEBGL_lose_context',
      ...(version === 'webgl2' ? [] : ['OES_vertex_array_object', 'OES_element_index_uint']),
    ],
    getExtension: (name: string) => {
      if (name === 'WEBGL_lose_context') {
        return { loseContext(): void {}, restoreContext(): void {} }
      }
      if (name === 'EXT_texture_filter_anisotropic') return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84ff, TEXTURE_MAX_ANISOTROPY_EXT: 0x84fe }
      return null
    },
    getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
    createShader: mint, createProgram: mint, createBuffer: mint, createTexture: mint,
    createFramebuffer: mint, createRenderbuffer: mint, createVertexArray: mint,
    createQuery: mint, createSampler: mint, createSync: mint, createTransformFeedback: mint,
    deleteShader: () => {}, deleteProgram: () => {}, deleteBuffer: () => {},
    deleteTexture: () => {}, deleteFramebuffer: () => {}, deleteRenderbuffer: () => {},
    deleteVertexArray: () => {}, deleteQuery: () => {}, deleteSampler: () => {},
    deleteSync: () => {}, deleteTransformFeedback: () => {},
    shaderSource: () => {}, compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    attachShader: () => {}, bindAttribLocation: () => {},
    linkProgram: () => {}, validateProgram: () => {},
    getProgramParameter: (p: unknown) => p, // overridden below
    getProgramInfoLog: () => '',
    getActiveUniform: () => null,
    getActiveAttrib: () => null,
    getUniformLocation: () => ({}),
    getAttribLocation: () => 0,
    getActiveUniforms: () => [],
    getUniformIndices: () => [],
    getActiveUniformBlockName: () => '',
    getActiveUniformBlockParameter: () => 0,
    getUniformBlockIndex: () => 0,
    getUniform: () => 0,
    getVertexAttrib: () => 0,
    getVertexAttribOffset: () => 0,
    getSyncParameter: () => 0,
    getQueryParameter: () => true,
    getQueryObject: () => 0,
    getInternalformatParameter: () => [],
    getFramebufferAttachmentParameter: () => 0,
    getRenderbufferParameter: () => 0,
    getBufferParameter: () => 4096,
    getIndexedParameter: () => 0,
    checkFramebufferStatus: () => GL_CONSTANTS.FRAMEBUFFER_COMPLETE,
    // everything mutating is a no-op — the stub never renders real pixels
  }
  base['getProgramParameter'] = (p: number): unknown => {
    if (p === GL_CONSTANTS.DELETE_STATUS) return false
    if (p === GL_CONSTANTS.LINK_STATUS || p === GL_CONSTANTS.VALIDATE_STATUS) return true
    if (p === GL_CONSTANTS.ACTIVE_UNIFORMS || p === GL_CONSTANTS.ACTIVE_ATTRIBUTES
      || p === GL_CONSTANTS['ATTACHED_SHADERS']) return 0
    return true
  }

  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'string' && /^[A-Z][A-Z0-9_]*$/.test(prop)) {
        const known = constants.get(prop)
        if (known !== undefined) return known
        const generated = nextUnknownConstant()
        constants.set(prop, generated)
        return generated
      }
      // Unknown method: hand out a shared no-op (also covers WebGL2-only entry points).
      const noop = (): void => {}
      target[prop] = noop
      return noop
    },
    set(target, prop, value) { target[prop] = value; return true },
    has(target, prop) { return prop in target },
  })
}

function makeFake2DContext(canvas: HTMLCanvasElement): unknown {
  const target: Record<string | symbol, unknown> = {
    canvas,
    measureText: (text: string) => ({
      width: String(text).length * 6.4,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: String(text).length * 6.4,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
    }),
    createLinearGradient: () => ({ addColorStop(): void {} }),
    createRadialGradient: () => ({ addColorStop(): void {} }),
    createPattern: () => ({ setTransform(): void {} }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(0, w) * Math.max(0, h) * 4),
      width: w, height: h, colorSpace: 'srgb',
    }),
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb',
    }),
    isPointInPath: () => false,
    isPointInStroke: () => false,
  }
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop]
      const noop = (): void => {}
      t[prop] = noop
      return noop
    },
    set(t, prop, value) { t[prop] = value; return true },
    has(t, prop) { return prop in t },
  })
}

// ---- the public mock ----------------------------------------------------------------------------

/** Patch the browser boundary so the real editor boots under jsdom. See package docs. */
export function mockPixi(options: MockPixiOptions = {}): MockPixiHandle {
  // Compose mode: a second call while one is active returns the SAME handle, so
  // `mockPixi()` + `renderEditorToDOM()` share stats/flushFrames, and the outer
  // caller's restore() (or the handle's, once) tears the whole thing down.
  if (activeMock) return activeMock
  const handle = installMock(options)
  activeMock = handle
  return handle
}

let activeMock: MutableMockHandle | null = null
/** Live binding: true when a mockPixi() is currently installed (compose-mode introspection). */
export { activeMock }

interface MutableMockHandle extends MockPixiHandle {
  /** Internal: uninstall without touching `activeMock` bookkeeping. */
  restoreSelf(): void
}

function installMock(options: MockPixiOptions): MutableMockHandle {
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: (this: HTMLCanvasElement, type: string, ...args: unknown[]) => unknown
  }
  const nativeGetContext = proto.getContext
  const perCanvas = new WeakMap<HTMLCanvasElement, Map<string, unknown>>()
  const stats = { webgl: 0, webgl2: 0, '2d': 0 }
  let rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = []
  let rafId = 0
  let restored = false

  proto.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    let cache = perCanvas.get(this)
    if (!cache) { cache = new Map(); perCanvas.set(this, cache) }
    const key = String(type)
    if (cache.has(key)) return cache.get(key)
    let ctx: unknown
    if (key === '2d') { ctx = makeFake2DContext(this); stats['2d']++ }
    else if (key === 'webgl' || key === 'webgl2' || key === 'experimental-webgl') {
      ctx = makeFakeWebGLContext(this, key === 'webgl2' ? 'webgl2' : 'webgl')
      if (key === 'webgl2') stats.webgl2++
      else stats.webgl++
    } else {
      return nativeGetContext.call(this, type, ...rest)
    }
    cache.set(key, ctx)
    return ctx
  }

  // ResizeObserver — jsdom has none; the editor guards on typeof but we want the observer path live.
  const g = globalThis as typeof globalThis & { ResizeObserver?: unknown }
  const nativeRO = g.ResizeObserver
  if (typeof nativeRO === 'undefined') {
    g.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  }

  // PIXI's BrowserAdapter returns these as bare globals; without the `canvas` npm package jsdom
  // defines neither, so `isWebGLSupported()` short-circuits to false and PIXI silently falls
  // back to the Canvas2D renderer. Stub the classes so autoDetectRenderer takes the WEBGL path
  // (the product default). NOTE: pixi memoizes `isWebGLSupported` per worker — install the mock
  // BEFORE the first editor boot in a given test file, or the cached false sticks.
  // Typed loosely on purpose: lib.dom's declarations for these globals are the full classes,
  // and our stand-ins only need to be constructible truthy values for pixi's capability probes.
  const g3 = globalThis as unknown as Record<'CanvasRenderingContext2D' | 'WebGLRenderingContext' | 'WebGL2RenderingContext', unknown>
  const native2DClass = g3.CanvasRenderingContext2D
  const nativeGLClass = g3.WebGLRenderingContext
  const nativeGL2Class = g3.WebGL2RenderingContext
  if (typeof native2DClass === 'undefined') {
    g3.CanvasRenderingContext2D = class CanvasRenderingContext2D {
      // `letterSpacing` deliberately absent: pixi's capability probe must see it unsupported.
    }
  }
  if (typeof nativeGLClass === 'undefined') {
    g3.WebGLRenderingContext = class WebGLRenderingContext {}
  }
  if (typeof nativeGL2Class === 'undefined') {
    g3.WebGL2RenderingContext = class WebGL2RenderingContext {}
  }

  const g2 = globalThis as typeof globalThis & {
    requestAnimationFrame?: (cb: FrameRequestCallback) => number
    cancelAnimationFrame?: (id: number) => void
  }
  const nativeRaf = g2.requestAnimationFrame
  const nativeCancelRaf = g2.cancelAnimationFrame
  const manualRaf = options.raf !== 'native'
  if (manualRaf && typeof nativeRaf === 'function') {
    g2.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      const id = ++rafId
      rafQueue.push({ id, cb })
      return id
    }
    g2.cancelAnimationFrame = (id: number): void => { rafQueue = rafQueue.filter((f) => f.id !== id) }
  }

  const handle: MutableMockHandle = {
    stats,
    restore(): void {
      handle.restoreSelf()
      if (activeMock === handle) activeMock = null
    },
    restoreSelf(): void {
      if (restored) return
      restored = true
      proto.getContext = nativeGetContext
      if (typeof nativeRO === 'undefined') delete g.ResizeObserver
      if (typeof native2DClass === 'undefined') delete g3.CanvasRenderingContext2D
      if (typeof nativeGLClass === 'undefined') delete g3.WebGLRenderingContext
      if (typeof nativeGL2Class === 'undefined') delete g3.WebGL2RenderingContext
      if (manualRaf && typeof nativeRaf === 'function') {
        g2.requestAnimationFrame = nativeRaf
        g2.cancelAnimationFrame = nativeCancelRaf
      }
      rafQueue = []
    },
    flushFrames(generations = 1): void {
      for (let gen = 0; gen < generations; gen++) {
        const current = rafQueue
        rafQueue = []
        for (const { cb } of current) cb(performance.now())
      }
    },
  }
  return handle
}

// ---- one-call editor boot ------------------------------------------------------------------------

import { XenolithEditor } from '@xenolithengine/graph-editor'
import type { XenolithEditorOptions } from '@xenolithengine/graph-editor'
export type { XenolithEditor, XenolithEditorOptions }

/** Handle over a real editor mounted into the DOM by {@link renderEditorToDOM}. */
export interface EditorToDOMHandle {
  editor: XenolithEditor
  container: HTMLElement
  /** Destroy the editor, detach the container, undo the auto-installed mock. Idempotent. */
  unmount(): void
}

export type RenderEditorOptions = XenolithEditorOptions & {
  /** Mount into this element (appended to `document.body` if detached). Default: fresh `div`. */
  host?: HTMLElement
}

/**
 * Boot a REAL XenolithEditor under jsdom — the whole `XenolithEditor.init` → PIXI
 * `Application.init` path, with `mockPixi()` installed automatically and undone on unmount.
 * Combine with a manual `mockPixi()` when the test needs `flushFrames()` control.
 */
export async function renderEditorToDOM(options: RenderEditorOptions = {}): Promise<EditorToDOMHandle> {
  // Reuse an outer mockPixi() when the test wants manual flushFrames()/stats control;
  // otherwise install (and on unmount, remove) our own.
  const ownsMock = !activeMock
  const mock = activeMock ?? mockPixi()
  const { host, ...editorOptions } = options
  const container = host ?? document.createElement('div')
  if (!container.isConnected) document.body.appendChild(container)
  const cleanupMock = (): void => { if (ownsMock) mock.restore() }
  try {
    const editor = await XenolithEditor.init(container, editorOptions)
    let unmounted = false
    return {
      editor,
      container,
      unmount(): void {
        if (unmounted) return
        unmounted = true
        try { editor.destroy() } catch { /* a destroyed-once editor may already be inert */ }
        container.remove()
        cleanupMock()
      },
    }
  } catch (err) {
    container.remove()
    cleanupMock()
    throw err
  }
}
