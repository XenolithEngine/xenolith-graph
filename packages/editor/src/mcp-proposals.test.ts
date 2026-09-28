// Spec-first contract for the agent-proposal mode (C-Bet1b). Semantics (ADR 0007): in propose
// mode, mutating tool calls ENQUEUE instead of applying; the host reviews and approves the batch
// as ONE command-bus transaction (one undo step) or rejects it. Proposals are RE-RESOLVED at
// approval time — the stored args replay against the CURRENT graph; if anything fails mid-batch,
// the transaction rolls back atomically and the queue keeps its entries for retry. Default mode
// stays 'auto' (back-compat; the trust implication is documented).
import { describe, it, expect, vi } from 'vitest'
import { buildHandlers, AuditLog, ProposalQueue } from './mcp.js'
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
  const tx = { run: 0, fn: null as null | (() => unknown) }
  const commandBus = {
    transaction: (fn: () => unknown) => { tx.run++; tx.fn = fn; return fn() },
    undo: () => false, redo: () => false, canUndo: () => false, canRedo: () => false,
  }
  return {
    tx, commandBus,
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
    addEdge: (edge: { id: string }) => { edges.push(edge as never); return true },
    removeNode: (id: string) => nodes.delete(id as string),
    disconnectEdge: () => true,
    setSelection: () => {}, fitView: () => {}, moveNode: () => {}, setWidgetValue: () => {},
    createMacroFromSelection: () => 'm_1' as never,
    expandMacro: () => {}, collapseMacro: () => {},
    diveInto: () => true, diveOut: () => {},
    setCategoryPalette: () => {}, setTheme: () => {},
    graph: {
      nodes: () => nodes.values() as never,
      edges: () => edges as never,
      getNode: (id: string) => nodes.get(id) as never,
    },
  } as unknown as McpEditorSurface
}

describe('proposal mode (C-Bet1b)', () => {
  it('mutating tools ENQUEUE instead of applying; the agent gets an honest "proposed" result', async () => {
    const ed = makeMockEditor()
    const queue = new ProposalQueue()
    const h = buildHandlers(ed, { mode: 'propose', clientId: 'agent', proposals: queue, audit: new AuditLog() })
    const r = (await h['add_node']!({ type: 'Box', x: 0, y: 0 })) as { proposed: boolean; proposalId: number }
    expect(r.proposed).toBe(true)
    expect(typeof r.proposalId).toBe('number')
    expect([...ed._nodes.values()]).toHaveLength(0) // NOTHING applied
    expect(queue.entries()).toHaveLength(1)
    expect(queue.entries()[0]).toMatchObject({ tool: 'add_node', clientId: 'agent' })
  })

  it('reads still run LIVE in propose mode (get_graph reflects pre-approval state)', async () => {
    const ed = makeMockEditor()
    const h = buildHandlers(ed, { mode: 'propose', proposals: new ProposalQueue(), audit: new AuditLog() })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    const count = await h['find_nodes']!({ type: 'Box' }) as { count: number }
    expect(count.count).toBe(0)
  })

  it('approve() applies the WHOLE batch in ONE transaction; queue empties', async () => {
    const ed = makeMockEditor()
    const queue = new ProposalQueue()
    const h = buildHandlers(ed, { mode: 'propose', proposals: queue, audit: new AuditLog() })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    await h['add_node']!({ type: 'Box', x: 1, y: 0 })
    await h['connect_pins']!({ from: { node: 'n0', pin: 'out' }, to: { node: 'n1', pin: 'in' } })
    ed.tx.run = 0
    const result = queue.approve()
    expect(result.applied).toBe(3)
    expect(ed.tx.run).toBe(1) // ONE transaction for the whole batch
    expect([...ed._nodes.values()]).toHaveLength(2)
    expect(ed._edges).toHaveLength(1)
    expect(queue.entries()).toHaveLength(0)
  })

  it('reject() discards; the graph is untouched', async () => {
    const ed = makeMockEditor()
    const queue = new ProposalQueue()
    const h = buildHandlers(ed, { mode: 'propose', proposals: queue, audit: new AuditLog() })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    queue.reject()
    expect(queue.entries()).toHaveLength(0)
    expect([...ed._nodes.values()]).toHaveLength(0)
  })

  it('a failing proposal keeps the queue for retry (atomic ROLLBACK is proven against the REAL bus in test-utils)', async () => {
    const ed = makeMockEditor()
    const queue = new ProposalQueue()
    const h = buildHandlers(ed, { mode: 'propose', proposals: queue, audit: new AuditLog() })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })        // ok
    await h['add_node']!({ type: 'Unknown', x: 0, y: 0 })    // will throw at approval
    expect(() => queue.approve()).toThrow()
    expect(queue.entries()).toHaveLength(2)                  // retryable after the failure
  })

  it('default mode is auto: mutations apply immediately, queue stays empty (back-compat)', async () => {
    const ed = makeMockEditor()
    const queue = new ProposalQueue()
    const h = buildHandlers(ed, { proposals: queue, audit: new AuditLog() })
    const r = await h['add_node']!({ type: 'Box', x: 0, y: 0 }) as { proposed?: boolean }
    expect(r.proposed).toBeUndefined()
    expect([...ed._nodes.values()]).toHaveLength(1)
    expect(queue.entries()).toHaveLength(0)
  })

  it('onChange fires on enqueue, approve and reject', async () => {
    const ed = makeMockEditor()
    const queue = new ProposalQueue()
    const events: string[] = []
    queue.onChange((size) => events.push(`size:${size}`))
    const h = buildHandlers(ed, { mode: 'propose', proposals: queue, audit: new AuditLog() })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    queue.approve()
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    queue.reject()
    expect(events).toEqual(['size:1', 'size:0', 'size:1', 'size:0'])
  })

  it('audited: proposals are audited on APPROVAL (with effect deltas), not on proposal', async () => {
    const ed = makeMockEditor()
    const audit = new AuditLog()
    const queue = new ProposalQueue()
    const h = buildHandlers(ed, { mode: 'propose', proposals: queue, audit })
    await h['add_node']!({ type: 'Box', x: 0, y: 0 })
    expect(audit.read().entries).toHaveLength(0)  // proposing changed nothing
    queue.approve()
    const entries = audit.read().entries as Array<{ tool: string; ok: boolean; nodes?: { added: number } }>
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ tool: 'add_node', ok: true, nodes: { added: 1 } })
  })

  it('approve with an empty queue is a no-op returning zero', () => {
    const queue = new ProposalQueue()
    expect(queue.approve()).toMatchObject({ applied: 0 })
  })
})
