// G3 a11y slice 1 — pure geometry for arrow-key node navigation. The editor turns Arrow keys
// into "move selection to the nearest node whose CENTER lies strictly in that direction";
// nearest = smallest euclidean center distance, ties broken by the smaller lateral offset.
// Pure so the picking rule is unit-testable without a renderer.

export interface NavNodeRect {
  id: string
  /** Top-left world position + size. */
  x: number
  y: number
  w: number
  h: number
}

export type NavDirection = 'left' | 'right' | 'up' | 'down'

export function nearestNodeInDirection(
  nodes: readonly NavNodeRect[],
  origin: { x: number; y: number },
  dir: NavDirection,
): string | null {
  let best: { id: string; dist: number; lateral: number } | null = null
  for (const n of nodes) {
    const cx = n.x + n.w / 2
    const cy = n.y + n.h / 2
    const dx = cx - origin.x
    const dy = cy - origin.y
    // Signed projection onto the direction axis — positive iff the center is strictly that way.
    const along = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy
    const lateral = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)
    if (along <= 0) continue // co-centred nodes can't be targets either
    const dist = Math.hypot(dx, dy)
    if (
      !best
      || dist < best.dist
      || (dist === best.dist && lateral < best.lateral)
    ) best = { id: n.id, dist, lateral }
  }
  return best?.id ?? null
}
