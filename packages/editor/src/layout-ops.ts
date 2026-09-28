// Pure graph-layout operations shared by the public `editor.autoLayout()` and the MCP
// `auto_layout` tool. Extracted from mcp.ts so hosts get the same layout the agent gets.
import type { NodeId } from '@xenolithengine/graph-core'

/** Structural node/edge shape both the real editor graph and the MCP surface provide. */
interface LayoutNodeLike {
  id: string | NodeId
  type: string
  position: { x: number; y: number }
  size?: { x: number; y: number }
  state?: Record<string, unknown>
}
interface LayoutGraphLike {
  nodes(): Iterable<LayoutNodeLike>
  edges(): Iterable<{ from: { node: string | NodeId }; to: { node: string | NodeId } }>
}

/** The read-only slice of an editor these functions need. */
export interface LayoutGraphView {
  graph: LayoutGraphLike
}

/** Where `add_node`-without-coordinates drops a node: just right of the current graph,
 *  vertically centred — roughly sane order; autoLayout cleans up after. */
export function nextFreeSpot(view: LayoutGraphView): { x: number; y: number } {
  let maxRight = -Infinity
  let topY = 0
  let count = 0
  for (const n of view.graph.nodes()) {
    const w = n.size?.x ?? 220
    maxRight = Math.max(maxRight, n.position.x + w)
    topY += n.position.y
    count++
  }
  if (count === 0) return { x: 0, y: 0 }
  return { x: maxRight + 60, y: topY / count }
}

/** Layered DAG layout: rank each node by longest-path-from-source, place ranks in columns (LR)
 *  or rows (TB) with `spacing` between every node. Same-rank nodes stack on the cross-axis.
 *  Independent / cyclic / unreachable nodes get their own ranks at the start. */
export function layeredLayout(
  view: LayoutGraphView,
  direction: 'LR' | 'TB',
  spacing: number,
): Map<NodeId, { x: number; y: number }> {
  const allNodes = [...view.graph.nodes()]

  // Members of macros are NOT laid out as top-level nodes — the macro is the layout unit. They
  // travel with it: after the macro is positioned, members translate by the same delta so they
  // stay anchored to the macro (and appear next to it on expand). Without this, members fall to
  // rank 0 because their original edges are rewired through the macro's proxy pins.
  const memberOf = new Map<string, string>() // member → macroId
  for (const n of allNodes) {
    const members = (n.state?.['members'] as string[] | undefined) ?? []
    if (n.type === 'Macro') for (const m of members) memberOf.set(String(m), n.id)
  }
  const nodes = allNodes.filter((n) => !memberOf.has(n.id))
  const edges = [...view.graph.edges()]

  const succ = new Map<string, string[]>()
  const inDeg = new Map<string, number>()
  for (const n of nodes) { succ.set(n.id, []); inDeg.set(n.id, 0) }
  for (const e of edges) {
    if (!succ.has(e.from.node) || !inDeg.has(e.to.node)) continue
    succ.get(e.from.node)!.push(e.to.node)
    inDeg.set(e.to.node, (inDeg.get(e.to.node) ?? 0) + 1)
  }
  // Kahn-like rank assignment; cycles → fall back to current rank.
  const rank = new Map<string, number>()
  const queue: string[] = []
  for (const [id, d] of inDeg) if (d === 0) { rank.set(id, 0); queue.push(id) }
  while (queue.length) {
    const id = queue.shift()!
    const r = rank.get(id)!
    for (const s of succ.get(id) ?? []) {
      rank.set(s, Math.max(rank.get(s) ?? 0, r + 1))
      const d = (inDeg.get(s) ?? 1) - 1
      inDeg.set(s, d)
      if (d === 0) queue.push(s)
    }
  }
  // Anything left unranked (cycle) → drop on rank 0.
  for (const n of nodes) if (!rank.has(n.id)) rank.set(n.id, 0)

  // Group by rank, sort each rank deterministically.
  const ranks = new Map<number, { id: NodeId; w: number; h: number }[]>()
  for (const n of nodes) {
    const r = rank.get(n.id) ?? 0
    if (!ranks.has(r)) ranks.set(r, [])
    ranks.get(r)!.push({ id: n.id as NodeId, w: n.size?.x ?? 220, h: n.size?.y ?? 140 })
  }
  for (const arr of ranks.values()) arr.sort((a, b) => a.id.localeCompare(b.id))

  const out = new Map<NodeId, { x: number; y: number }>()
  if (direction === 'LR') {
    let x = 0
    const sortedRanks = [...ranks.keys()].sort((a, b) => a - b)
    for (const r of sortedRanks) {
      const arr = ranks.get(r)!
      const colW = Math.max(...arr.map((n) => n.w))
      const totalH = arr.reduce((s, n) => s + n.h, 0) + spacing * Math.max(0, arr.length - 1)
      let y = -totalH / 2
      for (const n of arr) { out.set(n.id as NodeId, { x, y }); y += n.h + spacing }
      x += colW + spacing
    }
  } else {
    let y = 0
    const sortedRanks = [...ranks.keys()].sort((a, b) => a - b)
    for (const r of sortedRanks) {
      const arr = ranks.get(r)!
      const rowH = Math.max(...arr.map((n) => n.h))
      const totalW = arr.reduce((s, n) => s + n.w, 0) + spacing * Math.max(0, arr.length - 1)
      let x = -totalW / 2
      for (const n of arr) { out.set(n.id as NodeId, { x, y }); x += n.w + spacing }
      y += rowH + spacing
    }
  }

  // Members travel with their macro: translate each member by the same delta the macro moved.
  // Preserves the internal relative arrangement, so on expand the group appears next to the macro
  // (no orphan cluster in the upper-left corner anymore).
  for (const n of allNodes) {
    if (n.type !== 'Macro') continue
    const target = out.get(n.id as NodeId)
    if (!target) continue
    const dx = target.x - n.position.x
    const dy = target.y - n.position.y
    if (dx === 0 && dy === 0) continue
    const members = (n.state?.['members'] as string[] | undefined) ?? []
    for (const mid of members) {
      const member = allNodes.find((x) => x.id === mid)
      if (!member) continue
      out.set(mid as NodeId, { x: member.position.x + dx, y: member.position.y + dy })
    }
  }
  return out
}
