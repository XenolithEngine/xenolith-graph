// Spec-first contract for the MCP audit log (C-Bet1a). Invariants: every DOCUMENT-mUTATING
// tool call appends exactly one entry (success OR failure); read/view tools append nothing;
// effect deltas come from graph counts; the ring is bounded with honest `dropped` accounting;
// client identity rides every entry (multi-client groundwork — NOT authenticated, see docs).
import { describe, it, expect } from 'vitest'
import { buildHandlers, AuditLog } from './mcp.js'
import type { McpEditorSurface } from './mcp.js'

function pin(id: string, dir: 'in' | 'out', label: string, type = 'float') {
  return { id, kind: 'data' as const, direction: dir, type, label }
}

function makeMockEditor() {
  const nodes = new Map<string, unknown>()
  const edges: Array<{ id: string; from: { node: string; pin: string }; to: { node: string; pin: string } }> = []
  const registry = new Map<string, { type: string; title: string; category: string; pins: unknown[] }>([
    ['Box', { type: 'Box', title: 'Box', category: 'Math', pins: [pin('i', 'in', 'In'), pin('o', 'out', 'Out')] }],
  ])
  let selection: string[] = []
  return {
    _nodes: nodes, _edges: edges,
    registry: {
      all: () => [...registry.values()] as never,
      register: (s: { type: string }) => { registry.set(s.type, s as never) },
      has: (t: string) => registry.has(t),
    },
    toJSON: () => ({ version: 'xenolith.v1', nodes: [], edges: [] }),
    insertNode: (type: string, pos: { x: number; y: number }) => {
      if (type === 'Unknown') return null
      const id = 'n' + nodes.size
      nodes.set(id, { id, type, position: pos, pins: [pin(`${id}:in`, 'in', 'In'), pin(`${id}:out`, 'out', 'Out')] })
      return { id, position: pos } as never
    },
    addEdge: (edge: { id: string; from: { node: string; pin: string }; to: { node: string; pin: string } }) => {
      edges.push({ from: { node: String(edge.from.node), pin: String(edge.from.pin) }, to: { node: String(edge.to.node), pin: String(edge.to.pin) }, id: edge.id })
      return true
    },
    removeNode: (id: string) => nodes.delete(id as string),
    disconnectEdge: (id: string) => true,
    setSelection: (ids: readonly string[]) => { selection = [...ids] },
    fitView: () => {},
    moveNode: () => {},
    setWidgetValue: () => {},
    createMacroFromSelection: () => 'm_1' as never,
    expandMacro: () => {},
    collapseMacro: () => {},
    diveInto: () => true,
    diveOut: () => {},
    setCategoryPalette: () => {},
    setTheme: () => {},
    graph: {
      nodes: () => nodes.values() as never,
      edges: () => edges as never,
      getNode: (id: string) => nodes.get(id) as never,
    },
    get _selection() { return selection },
  } as unknown as McpEditorSurface
}

const auditOf = (h: Record<string, (a: unknown) => unknown>) =>
  (h['get_audit_log']!({}) as { entries: unknown[]; dropped: number; capacity: number })

describe('MCP audit log (C-Bet1a)', () => {
  it('document mutations append exactly one entry each, with effect deltas', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'agent-7' })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    await h['add_node']!({ type: 'Box', x: 1, y: 0 })
    await h['connect_pins']!({ from: { node: 'n0', pin: 'out' }, to: { node: 'n1', pin: 'in' } })
    const log = auditOf(h)
    expect(log.entries).toHaveLength(3)
    const [a1, a2, c1] = log.entries as Array<Record<string, never>>
    expect(a1).toMatchObject({ tool: 'add_node', ok: true, clientId: 'agent-7', nodes: { added: 1, removed: 0 } })
    expect(a2).toMatchObject({ tool: 'add_node' })
    expect(c1).toMatchObject({ tool: 'connect_pins', edges: { added: 1, removed: 0 } })
    for (const e of log.entries as Array<{ seq: number; ts: number }>) {
      expect(e.seq).toBeGreaterThan(0)
      expect(e.ts).toBeGreaterThan(0)
    }
  })

  it('reads and view ops append NOTHING', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'r' })
    await h['get_graph']!({})
    await h['list_node_types']!({})
    await h['find_nodes']!({ query: 'box' })
    h['fit_view']!({})
    await h['select_nodes']!({ nodeIds: ['n0'] })
    expect(auditOf(h).entries).toHaveLength(0)
  })

  it('failed mutations are audited with ok:false (and still throw)', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'e' })
    expect(() => h['add_node']!({ type: 'Unknown', x: 0, y: 0 })).toThrow()
    const log = auditOf(h)
    expect(log.entries).toHaveLength(1)
    expect(log.entries[0]).toMatchObject({ tool: 'add_node', ok: false })
  })

  it('remove_node accounts node removal deltas', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'e' })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    await h['remove_node']!({ nodeId: 'n0' })
    const log = auditOf(h)
    expect(log.entries[1]).toMatchObject({ tool: 'remove_node', ok: true, nodes: { added: 0, removed: 1 } })
  })

  it('ring is bounded; evictions counted in dropped; seq stays monotonic', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'b', audit: new AuditLog(3) })
    for (let i = 0; i < 5; i++) await h['add_node']!({ type: 'Box', x: i, y: 0 })
    const log = auditOf(h)
    expect(log.capacity).toBe(3)
    expect(log.entries).toHaveLength(3)
    expect(log.dropped).toBe(2)
    const seqs = (log.entries as Array<{ seq: number }>).map((e) => e.seq)
    expect(seqs).toEqual([3, 4, 5]) // the NEWEST three; oldest evicted
  })

  it('get_audit_log itself is read-only — reading the log does not audit', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'x' })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    auditOf(h)
    auditOf(h)
    expect(auditOf(h).entries).toHaveLength(1)
  })

  it('macro/template mutations are audited as document mutations', async () => {
    const h = buildHandlers(makeMockEditor(), { clientId: 'm' })
    await h['create_macro']!({ nodeIds: ['n0'], title: 'Group' })
    expect(() => h['instantiate_recipe']!({ id: 'no-such-recipe' })).toThrow() // audited even on failure
    const tools = (auditOf(h).entries as Array<{ tool: string; ok: boolean }>).map((e) => `${e.tool}:${e.ok}`)
    expect(tools[0]).toBe('create_macro:true')
    expect(tools[1]).toBe('instantiate_recipe:false')
  })

  it('AuditLog is injectable so hosts can own the instance across reconnects', async () => {
    const shared = new AuditLog(10)
    const e1 = makeMockEditor()
    const e2 = makeMockEditor()
    const h1 = buildHandlers(e1, { clientId: 'c1', audit: shared })
    const h2 = buildHandlers(e2, { clientId: 'c2', audit: shared })
    await h1['add_node']!({ type: 'Box', x: 0, y: 0 })
    await h2['add_node']!({ type: 'Box', x: 0, y: 0 })
    const entries = shared.read().entries as Array<{ clientId: string }>
    expect(entries.map((e) => e.clientId)).toEqual(['c1', 'c2'])
  })
})
