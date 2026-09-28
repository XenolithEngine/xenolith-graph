/**
 * Pin reference resolution — the one canonical way to point at a pin (E2).
 *
 * Extracted from the MCP layer (which needed it first: LLMs never know pin uuids) so HOSTS get
 * the same resolution the `connect_pins` tool uses: `editor.connect(from, 'Out', to, 'In')`.
 *
 * Resolution order for a ref:
 *   1. exact pin **id**
 *   2. pin **label** — case-insensitive, whitespace-trimmed (labels are human text)
 *   3. numeric string or number → pin **index**
 *   4. `'in'` / `'out'` keyword → first pin of that direction
 *   5. `undefined` → the single pin of the expected direction (single-pin default)
 *
 * A ref that resolves to a pin of the WRONG direction is an error, not a silent resolve —
 * cross-direction edges are the classic index-pin footgun this API exists to kill. Errors list
 * the available pins of the expected direction (`0:Label(type), …`) so humans and LLMs can
 * retry with a correct name; the message strings are contract (troubleshooting page quotes
 * them verbatim).
 */

/** Structural minimum the resolver needs — satisfied by core `Node`/`Pin` and test doubles. */
export interface ResolvablePin {
  id: string
  kind: 'data' | 'exec'
  direction: 'in' | 'out'
  type: string
  label?: string
}

/** @see ResolvablePin */
export interface ResolvableNode {
  id: string
  type: string
  pins: readonly ResolvablePin[]
}

/** What `editor.connect()` accepts on either side: label | index | single-pin default.
 *  (Distinct from core's `PinRef` `{node, pin}` — that names a concrete edge endpoint.) */
export type PinSelector = string | number | undefined

function describeAvailable(node: ResolvableNode, expectedDir: 'in' | 'out'): string {
  const available = node.pins
    .filter((p) => p.direction === expectedDir)
    .map((p, i) => `${i}:${p.label ?? p.id}(${p.type})`)
    .join(', ')
  return available || 'none'
}

/**
 * Resolve `ref` against `node.pins`, requiring the match to have direction `expectedDir`.
 * Throws {@link PinNotFoundError}-style {@link Error}s with retry-friendly context.
 */
export function resolvePin<P extends ResolvablePin = ResolvablePin>(
  node: ResolvableNode,
  ref: PinSelector,
  expectedDir: 'in' | 'out',
): P {
  const pins = node.pins

  if (ref === undefined) {
    const candidates = pins.filter((p) => p.direction === expectedDir)
    if (candidates.length === 1) return candidates[0] as P
    const what = candidates.length === 0
      ? `node '${node.type}' (${node.id}) has no ${expectedDir} pins`
      : `pin reference was omitted but node '${node.type}' (${node.id}) has ${candidates.length} ${expectedDir} pins`
    throw new Error(`${what}. available ${expectedDir} pins: [${describeAvailable(node, expectedDir)}]`)
  }

  const byId = pins.find((p) => p.id === ref)
  if (byId && byId.direction === expectedDir) return byId as P

  const refStr = String(ref).trim()
  const byLabel = pins.find((p) => (p.label ?? '').toLowerCase() === refStr.toLowerCase())
  if (byLabel && byLabel.direction === expectedDir) return byLabel as P

  if (/^\d+$/.test(refStr)) {
    const idx = Number(refStr)
    if (idx >= 0 && idx < pins.length) {
      const byIndex = pins[idx]!
      if (byIndex.direction === expectedDir) return byIndex as P
    }
  }

  // "in"/"out" → first pin of that direction (works for single-in/single-out simple nodes).
  if (refStr.toLowerCase() === 'in' || refStr.toLowerCase() === 'out') {
    const dir = refStr.toLowerCase() as 'in' | 'out'
    if (dir === expectedDir) {
      const byDir = pins.find((p) => p.direction === dir)
      if (byDir) return byDir as P
    }
  }

  throw new Error(
    `pin '${refStr}' not found on node '${node.type}' (${node.id}). available ${expectedDir} pins: [${describeAvailable(node, expectedDir)}]`,
  )
}
