// The /?demo=agent showcase: a SCRIPTED agent session that drives the editor through the exact
// same tool surface the MCP server exposes (list_node_types → add_node → connect_pins →
// set_widget_value → fit_view — see packages/editor/src/mcp.ts and packages/mcp-server/src/tools.ts).
// Every call logs an MCP-style transcript line, so the demo doubles as a live test of the tool
// semantics and a self-contained "agents build graphs" video — no Claude required to roll it.
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import type { Edge, Node, NodeId, Pin, PinId } from '@xenolithengine/graph-core'
import { createEdgeId } from '@xenolithengine/graph-core'

/** Node types the session registers and builds with — typed float pins + one widget each. */
export const agentSchemas = [
  {
    type: 'Signal', title: 'Signal', category: 'source',
    pins: [{ kind: 'data', direction: 'out', type: 'float', label: 'out' }],
  },
  {
    type: 'Gain', title: 'Gain', category: 'math',
    pins: [
      { kind: 'data', direction: 'in', type: 'float', label: 'in' },
      { kind: 'data', direction: 'out', type: 'float', label: 'out' },
    ],
    widgets: [{ id: 'amount', type: 'slider', key: 'amount', label: 'amount', min: 0, max: 1, step: 0.01 }],
  },
  {
    type: 'Shape', title: 'Shape', category: 'math',
    pins: [
      { kind: 'data', direction: 'in', type: 'float', label: 'in' },
      { kind: 'data', direction: 'out', type: 'float', label: 'out' },
    ],
    widgets: [{ id: 'curve', type: 'combo', key: 'curve', label: 'curve', values: ['linear', 'ease', 'sine'] }],
  },
  {
    type: 'Scope', title: 'Scope', category: 'sink',
    pins: [{ kind: 'data', direction: 'in', type: 'float', label: 'in' }],
  },
]

/** Mirrors mcp.ts resolvePin: pin by LABEL, numeric INDEX, or 'in'/'out' on single-pin nodes. */
export function resolvePin(node: Node, pin: string | number, dir: 'in' | 'out'): Pin {
  const pins = node.pins.filter((p) => p.direction === dir)
  const byLabel = pins.find((p) => p.label === pin || String(p.id) === String(pin))
  if (byLabel) return byLabel
  const idx = Number(pin)
  const numeric = typeof pin === 'number' || !Number.isNaN(idx) ? pins[idx] : undefined
  if (numeric) return numeric
  if (pins.length === 1 && (pin === 'in' || pin === 'out')) return pins[0]!
  throw new Error(`pin '${pin}' not found on ${node.type}.${dir}`)
}

export interface AgentStep {
  tool: string
  args: Record<string, unknown>
  run: (editor: XenolithEditor) => unknown
}

/** The whole session as data — the transcript the log renders and the e2e asserts against. */
export function buildAgentSteps(): AgentStep[] {
  return [
    {
      tool: 'list_node_types',
      args: {},
      run: (editor) => editor.registry.all().map((s) => ({ type: s.type, pins: s.pins.length })),
    },
    { tool: 'add_node', args: { type: 'Signal', x: 0, y: 0 }, run: (editor) => editor.insertNode('Signal', { x: 0, y: 0 }) },
    { tool: 'add_node', args: { type: 'Gain', x: 260, y: 0 }, run: (editor) => editor.insertNode('Gain', { x: 260, y: 0 }) },
    { tool: 'add_node', args: { type: 'Shape', x: 520, y: 0 }, run: (editor) => editor.insertNode('Shape', { x: 520, y: 0 }) },
    { tool: 'add_node', args: { type: 'Scope', x: 780, y: 0 }, run: (editor) => editor.insertNode('Scope', { x: 780, y: 0 }) },
    {
      tool: 'connect_pins',
      args: { from: { node: 'Signal', pin: 'out' }, to: { node: 'Gain', pin: 'in' } },
      run: (editor) => connect(editor, 'Signal', 'out', 'Gain', 'in'),
    },
    {
      tool: 'connect_pins',
      args: { from: { node: 'Gain', pin: 'out' }, to: { node: 'Shape', pin: 'in' } },
      run: (editor) => connect(editor, 'Gain', 'out', 'Shape', 'in'),
    },
    {
      tool: 'connect_pins',
      args: { from: { node: 'Shape', pin: 'out' }, to: { node: 'Scope', pin: 'in' } },
      run: (editor) => connect(editor, 'Shape', 'out', 'Scope', 'in'),
    },
    {
      tool: 'set_widget_value',
      args: { node: 'Gain', widget: 'amount', value: 0.85 },
      run: (editor) => {
        const gain = byType(editor, 'Gain')
        editor.setWidgetValue(gain.id, 'amount' as PinId, 0.85)
        return { value: 0.85 }
      },
    },
    { tool: 'fit_view', args: { padding: 80 }, run: (editor) => { editor.fitView({ padding: 80 }); return null } },
  ]
}

function byType(editor: XenolithEditor, type: string): Node {
  const node = [...editor.graph.nodes()].find((n) => n.type === type)
  if (!node) throw new Error(`add_node must run before connect (${type} missing)`)
  return node as Node
}

function connect(editor: XenolithEditor, fromType: string, fromPin: string | number, toType: string, toPin: string | number): Edge {
  const from = byType(editor, fromType)
  const to = byType(editor, toType)
  const edge: Edge = {
    id: createEdgeId(),
    from: { node: from.id as NodeId, pin: resolvePin(from, fromPin, 'out').id },
    to: { node: to.id as NodeId, pin: resolvePin(to, toPin, 'in').id },
  }
  if (!editor.addEdge(edge)) throw new Error(`addEdge rejected: ${fromType}.${fromPin} → ${toType}.${toPin}`)
  return edge
}

export interface AgentLogLine { tool: string; args: Record<string, unknown>; ok: boolean; detail: string }

/**
 * Run the scripted session with a transcript panel. Mutations ride the command bus exactly like
 * real MCP calls, so undo/history behave identically — that guarantee is what the e2e asserts.
 */
export async function runAgentSession(
  editor: XenolithEditor,
  opts: { onStep?: (line: AgentLogLine) => void; delayMs?: number } = {},
): Promise<void> {
  const log = document.createElement('div')
  log.setAttribute('data-agent-log', '')
  log.style.cssText = `
    position: absolute; left: 12px; top: 12px; z-index: 30; pointer-events: auto;
    min-width: 320px; max-width: 420px; max-height: 60vh; overflow-y: auto;
    font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #e8e8e8; background: rgba(16, 18, 14, 0.88); border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px; padding: 10px 12px; backdrop-filter: blur(8px);`
  const title = document.createElement('div')
  title.textContent = '⟡ agent session — MCP tools'
  title.style.cssText = 'font-weight: 700; margin-bottom: 6px; color: #d8b45a;'
  log.appendChild(title)
  const steps = buildAgentSteps()
  const nodeCount = () => [...editor.graph.nodes()].length
  const edgeCount = () => [...editor.graph.edges()].length
  const summary = document.createElement('div')
  summary.setAttribute('data-agent-summary', '')
  summary.style.cssText = 'margin-top: 6px; opacity: 0.85;'
  log.appendChild(summary)
  const mount = () => { editor.overlayRoot.appendChild(log) }
  mount()

  for (const step of steps) {
    const line = document.createElement('div')
    line.setAttribute('data-agent-step', step.tool)
    line.style.cssText = 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
    line.textContent = `▸ ${step.tool}(${Object.entries(step.args).map(([k, v]) => typeof v === 'object' ? `${k}=…` : `${k}=${v}`).join(', ')})`
    log.insertBefore(line, summary)
    await new Promise((r) => setTimeout(r, opts.delayMs ?? 420))
    try {
      const result = step.run(editor)
      line.setAttribute('data-agent-ok', '')
      line.style.color = '#9fd48a'
      const detail = result === null || result === undefined ? '' : summarize(result)
      line.textContent += ` ✓ ${detail}`
      opts.onStep?.({ tool: step.tool, args: step.args, ok: true, detail })
    } catch (err) {
      line.setAttribute('data-agent-err', '')
      line.style.color = '#e2695f'
      line.textContent += ` ✗ ${err instanceof Error ? err.message : String(err)}`
      opts.onStep?.({ tool: step.tool, args: step.args, ok: false, detail: String(err) })
    }
    summary.textContent = `${nodeCount()} nodes · ${edgeCount()} edges`
  }
  const done = document.createElement('div')
  done.setAttribute('data-agent-done', '')
  done.textContent = '✓ session complete — Ctrl+Z undoes it like any human edit'
  done.style.cssText = 'margin-top: 4px; color: #d8b45a;'
  log.insertBefore(done, summary)
}

function summarize(result: unknown): string {
  if (Array.isArray(result)) return `${result.length} items`
  if (typeof result === 'object' && result !== null) {
    const r = result as Record<string, unknown>
    if (r.id !== undefined) return `id=${String(r.id).slice(0, 8)}`
    return Object.keys(r).slice(0, 3).join(',')
  }
  return String(result)
}
