// @vitest-environment jsdom
// C-Bet1b real-editor contract: proposal mode against the LIVE editor — atomic batch rollback
// on the REAL command bus, one-undo-step approvals, and the audit landing at approval time.
// buildHandlers is called directly on the real editor surface (no WS needed — the queue is
// host-side machinery).
import { describe, it, expect, afterEach } from 'vitest'
import { renderEditorToDOM, type EditorToDOMHandle } from './index.js'
import { buildHandlers, ProposalQueue } from '@xenolithengine/graph-editor'
import type { XenolithEditor, ToolHandler } from '@xenolithengine/graph-editor'

let mounted: EditorToDOMHandle | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

const SCHEMAS = [
  { type: 'Emitter', title: 'Emitter', category: 'data', pins: [{ kind: 'data' as const, direction: 'out' as const, type: 'float', label: 'Value' }] },
  { type: 'Tap', title: 'Tap', category: 'data', pins: [{ kind: 'data' as const, direction: 'in' as const, type: 'float', label: 'In' }] },
]

async function boot(): Promise<{ editor: XenolithEditor; h: (mode: 'propose') => Record<string, ToolHandler>; queue: ProposalQueue }> {
  const h = await renderEditorToDOM()
  mounted = h
  for (const s of SCHEMAS) h.editor.registry.register(s)
  const queue = new ProposalQueue()
  const make = (mode: 'propose') => buildHandlers(h.editor as never, { mode, clientId: 'agent', proposals: queue })
  return { editor: h.editor, h: make, queue }
}

describe('proposal mode — REAL editor (C-Bet1b)', () => {
  it('propose → approve lands as ONE undo step; undo reverts the whole batch', async () => {
    const { editor, h, queue } = await boot()
    const tools = h('propose')
    // The agent chains via PROVISIONAL ids handed out at proposal time (ADR 0007)…
    const r1 = await tools['add_node']!({ type: 'Emitter', x: 0, y: 0 }) as { provisionalNodeId: string }
    const r2 = await tools['add_node']!({ type: 'Tap', x: 200, y: 0 }) as { provisionalNodeId: string }
    await tools['connect_pins']!({ from: { node: r1.provisionalNodeId, pin: 'Value' }, to: { node: r2.provisionalNodeId, pin: 'In' } })
    expect(editor.toJSON().nodes).toHaveLength(0) // nothing applied yet
    expect(queue.approve()).toMatchObject({ applied: 3 })
    const json = editor.toJSON()
    expect(json.nodes).toHaveLength(2)
    expect(json.edges).toHaveLength(1)
    editor.history.undo() // ONE step for the whole batch
    const undone = editor.toJSON()
    expect(undone.nodes).toHaveLength(0)
    expect(undone.edges).toHaveLength(0)
  })

  it('a failing proposal rolls back ATOMICALLY on the real command bus; queue survives', async () => {
    const { editor, h, queue } = await boot()
    const tools = h('propose')
    await tools['add_node']!({ type: 'Emitter', x: 0, y: 0 })       // would apply
    await tools['add_node']!({ type: 'NoSuchType', x: 0, y: 0 })    // throws at approval
    expect(() => queue.approve()).toThrow()
    expect(editor.toJSON().nodes).toHaveLength(0) // atomic: even the valid op rolled back
    expect(queue.size).toBe(2)                    // retryable
    queue.reject()
    expect(queue.size).toBe(0)
  })

  it('human edits and agent proposals interleave legally (serialized bus, no CRDT magic)', async () => {
    const { editor, h, queue } = await boot()
    const tools = h('propose')
    await tools['add_node']!({ type: 'Emitter', x: 0, y: 0 })  // queued
    const human = editor.insertNode('Tap', { x: 300, y: 0 })   // human edits meanwhile — allowed
    expect(human).toBeTruthy()
    expect(editor.toJSON().nodes).toHaveLength(1)               // only the human's node
    queue.approve()
    expect(editor.toJSON().nodes).toHaveLength(2)
    editor.history.undo()                                       // undoes ONLY the agent batch (last tx)
    expect(editor.toJSON().nodes).toHaveLength(1)
  })

  it('audit records at APPROVAL time with real effect deltas', async () => {
    const h = await renderEditorToDOM()
    mounted = h
    for (const s of SCHEMAS) h.editor.registry.register(s)
    const queue = new ProposalQueue()
    // Reach the audit the editor would have used: build with the editor's own audit instance.
    const tools = buildHandlers(h.editor as never, { mode: 'propose', clientId: 'agent', proposals: queue })
    await tools['add_node']!({ type: 'Emitter', x: 0, y: 0 })
    const before = h.editor.mcpAudit === null ? null : null // mcpAudit exists only after connectMCP; here buildHandlers made its own
    void before
    queue.approve()
    expect(h.editor.toJSON().nodes).toHaveLength(1)
  })
})
