import { EventEmitter, type Unsubscribe } from '@xenolith/core'
import type { Vec2 } from './viewport-math.js'

/**
 * Convert a `WheelEvent.deltaY` to a multiplicative zoom factor. Positive delta (scroll down)
 * zooms out (factor < 1), negative zooms in (factor > 1). Uses an exponential curve so the same
 * notch always changes zoom by the same proportion, regardless of current zoom level.
 *
 * One default OS scroll click produces deltaY ≈ ±100; we map that to ~0.82× / 1.22× zoom step.
 */
export function wheelDeltaToZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY / 500)
}

/**
 * Native trackpad pinch on macOS arrives as a wheel event with `ctrlKey` set and small deltaY
 * (typically ±1–10). We want a gentler curve here than scroll wheel — pinch should feel buttery,
 * not catapulty. Same exponential shape, larger divisor.
 */
export function pinchDeltaToZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY / 100)
}

type InteractionEvents = {
  'intent:zoom':                 { focal: Vec2; factor: number }
  'intent:pan':                  { dx: number; dy: number }
  'intent:gesture-begin':        Record<string, never>
  'intent:gesture-end':          Record<string, never>
  'intent:long-press':           Vec2
  'intent:long-press-start':     { x: number; y: number; ms: number }
  'intent:long-press-cancel':    Record<string, never>
}

export interface InteractionManagerOptions {
  /** Mouse buttons that initiate a pan-drag. Defaults to middle (1) and right (2). */
  panButtons?: readonly number[]
  /** Milliseconds a stationary single touch must hold to fire `intent:long-press`. Default 500. */
  longPressMs?: number
  /** Movement tolerance (client px) for the long-press timer — moving farther cancels it. Default 8. */
  longPressSlop?: number
}

interface TouchSample { x: number; y: number }

export class InteractionManager {
  readonly #target: HTMLElement
  readonly #events = new EventEmitter<InteractionEvents>()
  readonly #panButtons: ReadonlySet<number>
  #panActiveButton: number | null = null
  #lastPanX = 0
  #lastPanY = 0

  readonly #touches = new Map<number, TouchSample>()
  #gestureActive = false
  #lastGestureDist = 0
  #lastGestureMid: Vec2 = { x: 0, y: 0 }

  readonly #longPressMs: number
  readonly #longPressSlop: number
  #longPressTimer: ReturnType<typeof setTimeout> | null = null
  #longPressStart: { id: number; x: number; y: number } | null = null

  constructor(target: HTMLElement, opts: InteractionManagerOptions = {}) {
    this.#target = target
    this.#panButtons = new Set(opts.panButtons ?? [1, 2])
    this.#longPressMs = opts.longPressMs ?? 500
    this.#longPressSlop = opts.longPressSlop ?? 8
  }

  attach(): void {
    this.#target.style.touchAction = 'none'
    // Suppress iOS text-selection / "image options" callout on long-press over the canvas — the
    // editor opens its OWN context menu via onLongPress, the browser must stay out of the way.
    this.#target.style.userSelect = 'none'
    const ts = this.#target.style as CSSStyleDeclaration & {
      webkitUserSelect?: string; webkitTouchCallout?: string
    }
    ts.webkitUserSelect = 'none'
    ts.webkitTouchCallout = 'none'
    this.#target.addEventListener('wheel', this.#onWheel, { passive: false })
    this.#target.addEventListener('pointerdown', this.#onPointerDown)
    this.#target.addEventListener('pointermove', this.#onPointerMove)
    this.#target.addEventListener('pointerup', this.#onPointerUp)
    this.#target.addEventListener('pointercancel', this.#onPointerUp)
    this.#target.addEventListener('contextmenu', this.#onContextMenu)
  }

  detach(): void {
    this.#target.removeEventListener('wheel', this.#onWheel)
    this.#target.removeEventListener('pointerdown', this.#onPointerDown)
    this.#target.removeEventListener('pointermove', this.#onPointerMove)
    this.#target.removeEventListener('pointerup', this.#onPointerUp)
    this.#target.removeEventListener('pointercancel', this.#onPointerUp)
    this.#target.removeEventListener('contextmenu', this.#onContextMenu)
  }

  onZoom(handler: (e: InteractionEvents['intent:zoom']) => void): Unsubscribe {
    return this.#events.on('intent:zoom', handler)
  }

  onPan(handler: (e: InteractionEvents['intent:pan']) => void): Unsubscribe {
    return this.#events.on('intent:pan', handler)
  }

  /**
   * Fires the moment a second touch arrives. The editor uses this to cancel any in-flight
   * single-pointer drag (node move, edge drag, marquee) so the gesture takes over cleanly
   * instead of half a node being dragged while we also pan + zoom.
   */
  onGestureBegin(handler: () => void): Unsubscribe {
    return this.#events.on('intent:gesture-begin', handler)
  }

  /** Fires when the active touch count drops back below 2. */
  onGestureEnd(handler: () => void): Unsubscribe {
    return this.#events.on('intent:gesture-end', handler)
  }

  /** Fires after a stationary single touch holds for `longPressMs` — mobile equivalent of right-click. */
  onLongPress(handler: (e: InteractionEvents['intent:long-press']) => void): Unsubscribe {
    return this.#events.on('intent:long-press', handler)
  }

  /** Fires the moment a single touch lands, with the local point and the duration the user must
   *  hold for the long-press to fire. Editors paint a growing ring at the point so the user gets
   *  feedback during the hold. Paired with onLongPressCancel; followed by onLongPress on success. */
  onLongPressStart(handler: (e: InteractionEvents['intent:long-press-start']) => void): Unsubscribe {
    return this.#events.on('intent:long-press-start', handler)
  }

  /** Fires when the in-progress long-press is aborted (move past slop, lift early, second touch). */
  onLongPressCancel(handler: () => void): Unsubscribe {
    return this.#events.on('intent:long-press-cancel', handler)
  }

  #localPoint(clientX: number, clientY: number): Vec2 {
    const rect = this.#target.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  #onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const focal = this.#localPoint(e.clientX, e.clientY)
    const factor = e.ctrlKey ? pinchDeltaToZoomFactor(e.deltaY) : wheelDeltaToZoomFactor(e.deltaY)
    this.#events.emit('intent:zoom', { focal, factor })
  }

  #onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      this.#touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      this.#target.setPointerCapture(e.pointerId)
      if (this.#touches.size === 1) this.#armLongPress(e.pointerId, e.clientX, e.clientY)
      if (this.#touches.size === 2 && !this.#gestureActive) { this.#cancelLongPress(); this.#beginGesture() }
      return
    }
    if (!this.#panButtons.has(e.button)) return
    this.#panActiveButton = e.button
    this.#lastPanX = e.clientX
    this.#lastPanY = e.clientY
    this.#target.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  #onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      if (!this.#touches.has(e.pointerId)) return
      this.#touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (this.#longPressStart && e.pointerId === this.#longPressStart.id) {
        const dx = e.clientX - this.#longPressStart.x
        const dy = e.clientY - this.#longPressStart.y
        if (Math.hypot(dx, dy) > this.#longPressSlop) this.#cancelLongPress()
      }
      if (this.#gestureActive && this.#touches.size >= 2) this.#updateGesture()
      return
    }
    if (this.#panActiveButton === null) return
    const dx = e.clientX - this.#lastPanX
    const dy = e.clientY - this.#lastPanY
    this.#lastPanX = e.clientX
    this.#lastPanY = e.clientY
    if (dx !== 0 || dy !== 0) {
      this.#events.emit('intent:pan', { dx, dy })
    }
  }

  #onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      if (this.#longPressStart && e.pointerId === this.#longPressStart.id) this.#cancelLongPress()
      if (this.#touches.delete(e.pointerId) && this.#gestureActive && this.#touches.size < 2) {
        this.#endGesture()
      }
      if (this.#target.hasPointerCapture(e.pointerId)) {
        this.#target.releasePointerCapture(e.pointerId)
      }
      return
    }
    if (this.#panActiveButton === null) return
    if (this.#target.hasPointerCapture(e.pointerId)) {
      this.#target.releasePointerCapture(e.pointerId)
    }
    this.#panActiveButton = null
  }

  #onContextMenu = (e: MouseEvent): void => {
    // Right-click is a pan gesture for us — suppress the browser context menu.
    e.preventDefault()
  }

  #beginGesture(): void {
    const [a, b] = this.#twoTouches()
    this.#lastGestureDist = Math.hypot(b.x - a.x, b.y - a.y)
    this.#lastGestureMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    this.#gestureActive = true
    this.#events.emit('intent:gesture-begin', {})
  }

  #updateGesture(): void {
    const [a, b] = this.#twoTouches()
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const midClient = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

    const dx = midClient.x - this.#lastGestureMid.x
    const dy = midClient.y - this.#lastGestureMid.y
    if (dx !== 0 || dy !== 0) this.#events.emit('intent:pan', { dx, dy })

    if (dist > 0 && this.#lastGestureDist > 0 && dist !== this.#lastGestureDist) {
      const factor = dist / this.#lastGestureDist
      const focal = this.#localPoint(midClient.x, midClient.y)
      this.#events.emit('intent:zoom', { focal, factor })
    }
    this.#lastGestureMid = midClient
    this.#lastGestureDist = dist
  }

  #endGesture(): void {
    this.#gestureActive = false
    this.#events.emit('intent:gesture-end', {})
  }

  #armLongPress(id: number, clientX: number, clientY: number): void {
    this.#cancelLongPress()
    this.#longPressStart = { id, x: clientX, y: clientY }
    const local = this.#localPoint(clientX, clientY)
    this.#events.emit('intent:long-press-start', { x: local.x, y: local.y, ms: this.#longPressMs })
    this.#longPressTimer = setTimeout(() => {
      this.#longPressTimer = null
      this.#longPressStart = null
      this.#events.emit('intent:long-press', this.#localPoint(clientX, clientY))
    }, this.#longPressMs)
  }

  #cancelLongPress(): void {
    const wasArmed = this.#longPressStart !== null || this.#longPressTimer !== null
    if (this.#longPressTimer !== null) { clearTimeout(this.#longPressTimer); this.#longPressTimer = null }
    this.#longPressStart = null
    if (wasArmed) this.#events.emit('intent:long-press-cancel', {})
  }

  #twoTouches(): [TouchSample, TouchSample] {
    const it = this.#touches.values()
    const a = it.next().value as TouchSample
    const b = it.next().value as TouchSample
    return [a, b]
  }
}
