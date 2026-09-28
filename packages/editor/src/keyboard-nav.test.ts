import { describe, it, expect } from 'vitest'
import { nearestNodeInDirection } from './keyboard-nav.js'

const rect = (id: string, x: number, y: number, w = 100, h = 60): { id: string; x: number; y: number; w: number; h: number } =>
  ({ id, x, y, w, h })

// Layout (centers): A(50,30) B(250,30) C(250,150) D(450,150) — a zig-zag pipeline.
const NODES = [
  rect('A', 0, 0),
  rect('B', 200, 0),
  rect('C', 200, 120),
  rect('D', 400, 120),
]

const center = (n: { x: number; y: number; w: number; h: number }): { x: number; y: number } =>
  ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })

describe('nearestNodeInDirection (G3 a11y — arrow-key node navigation)', () => {
  it('right from A picks the nearest node whose center is strictly right', () => {
    expect(nearestNodeInDirection(NODES, center(NODES[0]!), 'right')).toBe('B')
  })

  it('down from B picks C (D is farther and more lateral)', () => {
    expect(nearestNodeInDirection(NODES, center(NODES[1]!), 'down')).toBe('C')
  })

  it('right from C picks D even though D is lower — direction is by center axis, not same row', () => {
    expect(nearestNodeInDirection(NODES, center(NODES[2]!), 'right')).toBe('D')
  })

  it('left from D walks the chain backwards', () => {
    expect(nearestNodeInDirection(NODES, center(NODES[3]!), 'left')).toBe('C')
  })

  it('returns null when nothing lies in that direction', () => {
    expect(nearestNodeInDirection(NODES, center(NODES[0]!), 'left')).toBeNull()
    expect(nearestNodeInDirection(NODES, center(NODES[0]!), 'up')).toBeNull()
  })

  it('ignores the origin node itself and overlapping co-centers keep the closest id', () => {
    const dup = [rect('X', 200, 0), rect('X2', 205, 0)]
    expect(nearestNodeInDirection(dup, center(rect('O', 0, 0)), 'right')).toBe('X')
  })

  it('an empty graph yields null', () => {
    expect(nearestNodeInDirection([], { x: 0, y: 0 }, 'right')).toBeNull()
  })
})
