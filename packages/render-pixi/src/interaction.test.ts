import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InteractionManager, wheelDeltaToZoomFactor } from './interaction.js'

describe('wheelDeltaToZoomFactor', () => {
  it('positive deltaY zooms out (factor < 1)', () => {
    expect(wheelDeltaToZoomFactor(120)).toBeLessThan(1)
  })

  it('negative deltaY zooms in (factor > 1)', () => {
    expect(wheelDeltaToZoomFactor(-120)).toBeGreaterThan(1)
  })

  it('zero delta is a no-op (factor = 1)', () => {
    expect(wheelDeltaToZoomFactor(0)).toBe(1)
  })

  it('is multiplicative-symmetric: zoom in then back out by the same delta returns to 1', () => {
    const inFactor = wheelDeltaToZoomFactor(-120)
    const outFactor = wheelDeltaToZoomFactor(120)
    expect(inFactor * outFactor).toBeCloseTo(1, 6)
  })

  it('does not overshoot for a single scroll wheel notch (typically deltaY=100)', () => {
    const factor = wheelDeltaToZoomFactor(100)
    expect(factor).toBeGreaterThan(0.5)
    expect(factor).toBeLessThan(0.95)
  })
})

// ----------------------------------------------------------------------------
// Multi-touch / pinch gestures
// ----------------------------------------------------------------------------

interface MockTarget {
  el: HTMLElement
  fire: (type: string, init: Record<string, unknown>) => void
  added: Map<string, EventListener[]>
}

function makeTarget(rect = { left: 0, top: 0, width: 800, height: 600 }): MockTarget {
  const added = new Map<string, EventListener[]>()
  const captured = new Set<number>()
  const el = {
    addEventListener(type: string, fn: EventListener) {
      if (!added.has(type)) added.set(type, [])
      added.get(type)!.push(fn)
    },
    removeEventListener(type: string, fn: EventListener) {
      const list = added.get(type)
      if (list) added.set(type, list.filter((f) => f !== fn))
    },
    getBoundingClientRect() {
      return { ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON() { /* */ } }
    },
    setPointerCapture(id: number) { captured.add(id) },
    releasePointerCapture(id: number) { captured.delete(id) },
    hasPointerCapture(id: number) { return captured.has(id) },
    style: {} as CSSStyleDeclaration,
  } as unknown as HTMLElement
  function fire(type: string, init: Record<string, unknown>) {
    const list = added.get(type) ?? []
    const evt = {
      ...init,
      type,
      preventDefault() { /* swallowed */ },
      stopPropagation() { /* swallowed */ },
    } as unknown as Event
    for (const fn of list) fn(evt)
  }
  return { el, fire, added }
}

function touchDown(t: MockTarget, id: number, x: number, y: number): void {
  t.fire('pointerdown', { pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y })
}
function touchMove(t: MockTarget, id: number, x: number, y: number): void {
  t.fire('pointermove', { pointerId: id, pointerType: 'touch', button: -1, clientX: x, clientY: y })
}
function touchUp(t: MockTarget, id: number, x: number, y: number): void {
  t.fire('pointerup', { pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y })
}

describe('InteractionManager — multi-touch gestures', () => {
  it('single touch emits NO pan/zoom (PIXI handles single-pointer node drag)', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const pans: unknown[] = []; const zooms: unknown[] = []
    im.onPan((e) => pans.push(e)); im.onZoom((e) => zooms.push(e))

    touchDown(t, 1, 100, 100)
    touchMove(t, 1, 150, 120)
    touchUp(t, 1, 150, 120)

    expect(pans).toEqual([])
    expect(zooms).toEqual([])
  })

  it('second touch arriving emits intent:gesture-begin', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    let begins = 0
    im.onGestureBegin(() => { begins++ })

    touchDown(t, 1, 100, 100)
    expect(begins).toBe(0)
    touchDown(t, 2, 300, 100)
    expect(begins).toBe(1)
  })

  it('two-finger spread emits intent:zoom with factor > 1 and midpoint focal', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const zooms: { focal: { x: number; y: number }; factor: number }[] = []
    im.onZoom((e) => zooms.push(e))

    touchDown(t, 1, 200, 300)
    touchDown(t, 2, 400, 300)
    // distance: 200, midpoint: (300, 300)
    touchMove(t, 1, 100, 300)
    touchMove(t, 2, 500, 300)
    // new distance: 400, midpoint still (300, 300) → factor = 400/200 = 2

    expect(zooms.length).toBeGreaterThan(0)
    const total = zooms.reduce((acc, z) => acc * z.factor, 1)
    expect(total).toBeCloseTo(2, 2)
    const last = zooms[zooms.length - 1]!
    expect(last.focal.x).toBeCloseTo(300, 0)
    expect(last.focal.y).toBeCloseTo(300, 0)
  })

  it('two-finger pinch (squeeze together) emits intent:zoom with factor < 1', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const zooms: { factor: number }[] = []
    im.onZoom((e) => zooms.push(e))

    touchDown(t, 1, 100, 300)
    touchDown(t, 2, 500, 300)  // distance 400
    touchMove(t, 1, 200, 300)
    touchMove(t, 2, 400, 300)  // distance 200 → factor 0.5

    const total = zooms.reduce((acc, z) => acc * z.factor, 1)
    expect(total).toBeCloseTo(0.5, 2)
  })

  it('two-finger parallel slide emits intent:pan equal to midpoint delta', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const pans: { dx: number; dy: number }[] = []
    im.onPan((e) => pans.push(e))

    touchDown(t, 1, 100, 100)
    touchDown(t, 2, 200, 100)
    // midpoint (150, 100)
    touchMove(t, 1, 150, 130)
    touchMove(t, 2, 250, 130)
    // both fingers moved +50,+30 → midpoint moves +50,+30

    const total = pans.reduce((acc, p) => ({ dx: acc.dx + p.dx, dy: acc.dy + p.dy }), { dx: 0, dy: 0 })
    expect(total.dx).toBeCloseTo(50, 0)
    expect(total.dy).toBeCloseTo(30, 0)
  })

  it('lifting one of two touches emits intent:gesture-end and stops further pan/zoom', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    let ends = 0
    im.onGestureEnd(() => { ends++ })
    const pans: unknown[] = []
    im.onPan((e) => pans.push(e))

    touchDown(t, 1, 100, 100)
    touchDown(t, 2, 200, 100)
    touchMove(t, 1, 150, 100); touchMove(t, 2, 250, 100)  // gesture pan
    const panCountWhileGestureActive = pans.length
    touchUp(t, 2, 250, 100)
    expect(ends).toBe(1)

    // remaining single finger moving — should NOT emit pan anymore
    touchMove(t, 1, 250, 200)
    expect(pans.length).toBe(panCountWhileGestureActive)
  })

  it('ctrl+wheel (trackpad pinch) emits intent:zoom (browser converts native pinch to wheel+ctrl)', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const zooms: { factor: number }[] = []
    im.onZoom((e) => zooms.push(e))

    t.fire('wheel', { deltaY: -10, ctrlKey: true, clientX: 100, clientY: 100 })
    expect(zooms.length).toBe(1)
    expect(zooms[0]!.factor).toBeGreaterThan(1)
  })

  it('attach() sets touch-action:none on the target so the browser does not steal gestures', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    expect(t.el.style.touchAction).toBe('none')
  })

  it('mouse pointerdown with button 0 still emits nothing (preserves existing canvas-drag semantics)', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const pans: unknown[] = []; const zooms: unknown[] = []
    im.onPan((e) => pans.push(e)); im.onZoom((e) => zooms.push(e))

    t.fire('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 })
    t.fire('pointermove', { pointerId: 1, pointerType: 'mouse', button: -1, clientX: 200, clientY: 100 })
    t.fire('pointerup',   { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 200, clientY: 100 })

    expect(pans).toEqual([])
    expect(zooms).toEqual([])
  })

  // -- long-press ---------------------------------------------------------

  it('stationary single touch for 500ms emits intent:long-press with local point', () => {
    vi.useFakeTimers()
    const t = makeTarget()
    const im = new InteractionManager(t.el, { longPressMs: 500 })
    im.attach()
    const presses: { x: number; y: number }[] = []
    im.onLongPress((e) => presses.push(e))

    touchDown(t, 1, 120, 80)
    vi.advanceTimersByTime(499)
    expect(presses).toEqual([])
    vi.advanceTimersByTime(2)
    expect(presses.length).toBe(1)
    expect(presses[0]!.x).toBe(120)
    expect(presses[0]!.y).toBe(80)
    vi.useRealTimers()
  })

  it('long-press is cancelled if finger moves beyond slop', () => {
    vi.useFakeTimers()
    const t = makeTarget()
    const im = new InteractionManager(t.el, { longPressMs: 500, longPressSlop: 8 })
    im.attach()
    const presses: unknown[] = []
    im.onLongPress((e) => presses.push(e))

    touchDown(t, 1, 100, 100)
    vi.advanceTimersByTime(200)
    touchMove(t, 1, 120, 100)  // 20px move > 8 slop
    vi.advanceTimersByTime(500)
    expect(presses).toEqual([])
    vi.useRealTimers()
  })

  it('long-press is cancelled if second touch arrives (gesture takes over)', () => {
    vi.useFakeTimers()
    const t = makeTarget()
    const im = new InteractionManager(t.el, { longPressMs: 500 })
    im.attach()
    const presses: unknown[] = []
    im.onLongPress((e) => presses.push(e))

    touchDown(t, 1, 100, 100)
    vi.advanceTimersByTime(200)
    touchDown(t, 2, 300, 100)
    vi.advanceTimersByTime(500)
    expect(presses).toEqual([])
    vi.useRealTimers()
  })

  it('single touch fires intent:long-press-start with point and duration so UIs can render a ring', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el, { longPressMs: 500 })
    im.attach()
    const starts: { x: number; y: number; ms: number }[] = []
    im.onLongPressStart((e) => starts.push(e))

    touchDown(t, 1, 80, 90)
    expect(starts.length).toBe(1)
    expect(starts[0]).toEqual({ x: 80, y: 90, ms: 500 })
  })

  it('long-press cancel fires intent:long-press-cancel (so the ring UI can fade out)', () => {
    vi.useFakeTimers()
    const t = makeTarget()
    const im = new InteractionManager(t.el, { longPressMs: 500 })
    im.attach()
    let cancels = 0
    im.onLongPressCancel(() => { cancels++ })

    touchDown(t, 1, 100, 100)
    touchUp(t, 1, 100, 100)
    expect(cancels).toBe(1)
    vi.useRealTimers()
  })

  it('long-press is cancelled if finger lifts before threshold', () => {
    vi.useFakeTimers()
    const t = makeTarget()
    const im = new InteractionManager(t.el, { longPressMs: 500 })
    im.attach()
    const presses: unknown[] = []
    im.onLongPress((e) => presses.push(e))

    touchDown(t, 1, 100, 100)
    vi.advanceTimersByTime(200)
    touchUp(t, 1, 100, 100)
    vi.advanceTimersByTime(500)
    expect(presses).toEqual([])
    vi.useRealTimers()
  })

  it('mouse pointerdown with pan button (e.g. middle=1) still emits pan (regression: existing behavior preserved)', () => {
    const t = makeTarget()
    const im = new InteractionManager(t.el)
    im.attach()
    const pans: { dx: number; dy: number }[] = []
    im.onPan((e) => pans.push(e))

    t.fire('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 1, clientX: 100, clientY: 100 })
    t.fire('pointermove', { pointerId: 1, pointerType: 'mouse', button: -1, clientX: 150, clientY: 120 })
    t.fire('pointerup',   { pointerId: 1, pointerType: 'mouse', button: 1, clientX: 150, clientY: 120 })

    expect(pans.length).toBe(1)
    expect(pans[0]!.dx).toBe(50)
    expect(pans[0]!.dy).toBe(20)
  })
})
