// The /?demo=agent showcase: a SCRIPTED agent session that drives the editor through the exact
// same tool surface the MCP server exposes (list_node_types → add_node ×N → auto_layout →
// connect_pins ×M → set_category_palette → run_graph → verify → fit_view — see
// packages/editor/src/mcp.ts and packages/mcp-server/src/tools.ts). Execution is REAL: a
// StepDebugger walks the graph node-by-node with per-node timing, values thread pin-to-pin
// exactly as the /guides/run/ host-dataflow pass describes, and the final `verify` step checks
// the outputs — the agent proves its own build works. Doubles as a self-contained
// "agents build, execute, verify" video without needing Claude connected.
//
// ?mode=propose (F2 / ADR 0007): the build phase runs through the REAL proposal pipeline —
// buildHandlers(mode:'propose') enqueues every mutation, the transcript marks each step queued,
// and a "human review" step clicks the actual panel UI (badge → Approve all). Approval replays
// the batch inside ONE command-bus transaction: one undo step reverts the whole agent batch.
// This is the same embedded-handlers pattern a host without a live WS bridge uses — the queue
// and panel are wired by hand, exactly as STABLE-API documents.
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import type { Edge, Node, NodeId, Pin, PinId, NodeSchema } from '@xenolithengine/graph-core'
import { createEdgeId } from '@xenolithengine/graph-core'
import { StepDebugger, buildHandlers, ProposalQueue, ProposalsPanel } from '@xenolithengine/graph-editor'
import type { ToolHandler } from '@xenolithengine/graph-editor'

/** Feather icon inner-SVG for the five glyphs beyond the built-in set (MIT, feathericons.com).
 *  PATHS ONLY — the glyph renderer rasterizes path/rect/line primitives; <polygon>/<polyline>
 *  render as filled artifacts (the Smooth-filter bug). */
const CUSTOM_ICONS: Record<string, string> = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>',
  monitor: '<path d="M22 17V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z"/><path d="M8 21h8"/><path d="M12 17v4"/>',
}

const pin = (direction: 'in' | 'out', label: string) =>
  ({ kind: 'data' as const, direction, type: 'number' as const, label })

/** The 14-node telemetry-anomaly pipeline the agent builds. Categories map to palette colours,
 *  glyphs render in node headers. Each type also gets a compute (below) — execution is real. */
export const agentSchemas: NodeSchema[] = [
  { type: 'Clock', title: 'Clock', category: 'source', glyph: { icon: 'clock', side: 'left' }, pins: [pin('out', 'ticks')] },
  { type: 'SensorTemp', title: 'Sensor A · temp', category: 'source', glyph: { icon: 'activity', side: 'left' }, pins: [pin('in', 'tick'), pin('out', 'series')] },
  { type: 'SensorPress', title: 'Sensor B · press', category: 'source', glyph: { icon: 'zap', side: 'left' }, pins: [pin('in', 'tick'), pin('out', 'series')] },
  { type: 'SmoothTemp', title: 'Smooth · temp', category: 'filter', glyph: { icon: 'filter', side: 'left' }, pins: [pin('in', 'series'), pin('out', 'out')] },
  { type: 'SmoothPress', title: 'Smooth · press', category: 'filter', glyph: { icon: 'filter', side: 'left' }, pins: [pin('in', 'series'), pin('out', 'out')] },
  { type: 'WindowStats', title: 'Window Stats', category: 'math', glyph: { icon: 'layers', side: 'left' }, pins: [pin('in', 'series'), pin('out', 'avg'), pin('out', 'spread')] },
  { type: 'Normalize', title: 'Normalize', category: 'transform', glyph: { icon: 'code', side: 'left' }, pins: [pin('in', 'series'), pin('out', 'out')] },
  { type: 'Merge', title: 'Merge', category: 'math', glyph: { icon: 'branch', side: 'left' }, pins: [pin('in', 'a'), pin('in', 'b'), pin('out', 'pairs')] },
  { type: 'Threshold', title: 'Threshold', category: 'logic', glyph: { icon: 'flag', side: 'left' }, pins: [pin('in', 'series'), pin('in', 'ref'), pin('out', 'flags')] },
  { type: 'AnomalyGate', title: 'Anomaly Gate', category: 'logic', glyph: { icon: 'circle', side: 'left' }, pins: [pin('in', 'flags'), pin('in', 'series'), pin('out', 'anomalies')] },
  { type: 'AnomalyCount', title: 'Anomaly Count', category: 'math', glyph: { icon: 'database', side: 'left' }, pins: [pin('in', 'values'), pin('out', 'count')] },
  { type: 'Dashboard', title: 'Dashboard', category: 'output', glyph: { icon: 'monitor', side: 'left' }, pins: [pin('in', 'summary'), pin('in', 'alerts'), pin('out', 'report')] },
  { type: 'AlertBuzzer', title: 'Alert Buzzer', category: 'output', glyph: { icon: 'bell', side: 'left' }, pins: [pin('in', 'anomalies'), pin('out', 'alert')] },
  { type: 'DebugTap', title: 'Debug Tap', category: 'debug', glyph: { icon: 'eye', side: 'left' }, pins: [pin('in', 'series'), pin('out', 'tap')] },
]

/** Category palette the agent applies (set_category_palette step). */
export const agentPalette: Record<string, { color: string }> = {
  source: { color: '#2dd4bf' },    // teal
  filter: { color: '#60a5fa' },    // blue
  transform: { color: '#a78bfa' }, // violet
  math: { color: '#f5b83d' },      // amber
  logic: { color: '#f472b6' },     // pink
  output: { color: '#39d98a' },    // green
  debug: { color: '#9aa4b2' },     // gray
}

// ----- compute registry (the host dataflow pass from /guides/run/) --------------------------------

const N = 32
const smooth = (xs: number[], w = 3): number[] => xs.map((_, i) => {
  const s = Math.max(0, i - w + 1)
  const win = xs.slice(s, i + 1)
  return win.reduce((a, b) => a + b, 0) / win.length
})

/** Per-type compute: label-keyed inputs → label-keyed outputs (converted to pinIds by the
 *  StepDebugger wrapper below). Sensor B carries an injected spike at samples 12–13 that the
 *  pipeline must catch — that's what the verify step checks. */
const computes: Record<string, (inputs: Record<string, unknown>) => Record<string, unknown>> = {
  Clock: () => ({ ticks: Array.from({ length: N }, (_, i) => i) }),
  SensorTemp: () => ({ series: Array.from({ length: N }, (_, i) => 20 + 3 * Math.sin(i / 3) + (i % 7) * 0.1) }),
  SensorPress: () => ({ series: Array.from({ length: N }, (_, i) => 100 + 8 * Math.sin(i / 4) + (i === 12 || i === 13 ? 45 : 0) + (i % 5) * 0.2) }),
  SmoothTemp: (i) => ({ out: smooth(i['series'] as number[]) }),
  SmoothPress: (i) => ({ out: smooth(i['series'] as number[]) }),
  WindowStats: (i) => {
    const xs = i['series'] as number[]
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length
    return { avg, spread: Math.max(...xs) - Math.min(...xs) }
  },
  Normalize: (i) => {
    const xs = i['series'] as number[]
    const min = Math.min(...xs), max = Math.max(...xs)
    return { out: xs.map((x) => (x - min) / (max - min || 1)) }
  },
  Merge: (i) => ({ pairs: (i['a'] as number[]).map((a, k) => [a, (i['b'] as number[])[k]]) }),
  Threshold: (i) => {
    const xs = i['series'] as number[], ref = i['ref'] as number
    return { flags: xs.map((x) => Math.abs(x - ref) > 20 ? 1 : 0) }
  },
  AnomalyGate: (i) => ({ anomalies: (i['flags'] as number[]).map((f, k) => f ? (i['series'] as number[])[k] : null).filter((x) => x !== null) }),
  AnomalyCount: (i) => ({ count: (i['values'] as unknown[]).length }),
  Dashboard: (i) => ({ report: { pairs: (i['summary'] as unknown[]).length, alerts: i['alerts'] } }),
  AlertBuzzer: (i) => ({ alert: (i['anomalies'] as unknown[]).length > 0 ? '⚠ 2 anomalies on Sensor B' : 'quiet' }),
  DebugTap: (i) => ({ tap: i['series'] }),
}

/** Mirrors mcp.ts resolvePin: pin by LABEL, numeric INDEX, or 'in'/'out' on single-pin nodes. */
export function resolvePin(node: Node, pinRef: string | number, dir: 'in' | 'out'): Pin {
  const pins = node.pins.filter((p) => p.direction === dir)
  const byLabel = pins.find((p) => p.label === pinRef || String(p.id) === String(pinRef))
  if (byLabel) return byLabel
  const idx = Number(pinRef)
  const numeric = typeof pinRef === 'number' || !Number.isNaN(idx) ? pins[idx] : undefined
  if (numeric) return numeric
  if (pins.length === 1 && (pinRef === 'in' || pinRef === 'out')) return pins[0]!
  throw new Error(`pin '${pinRef}' not found on ${node.type}.${dir}`)
}

function byType(editor: XenolithEditor, type: string): Node {
  const node = [...editor.graphNodes()].find((n) => n.type === type)
  if (!node) throw new Error(`add_node must run before connect (${type} missing)`)
  return node as Node
}

function connect(editor: XenolithEditor, fromType: string, fromPin: string, toType: string, toPin: string): Edge {
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

const WIRING: Array<[string, string, string, string]> = [
  ['Clock', 'ticks', 'SensorTemp', 'tick'],
  ['Clock', 'ticks', 'SensorPress', 'tick'],
  ['SensorTemp', 'series', 'SmoothTemp', 'series'],
  ['SensorPress', 'series', 'SmoothPress', 'series'],
  ['SmoothPress', 'out', 'WindowStats', 'series'], // baseline for the pressure threshold
  ['SmoothTemp', 'out', 'Normalize', 'series'],
  ['Normalize', 'out', 'Merge', 'a'],
  ['SmoothPress', 'out', 'Merge', 'b'],
  ['Merge', 'pairs', 'Dashboard', 'summary'],
  ['SmoothPress', 'out', 'Threshold', 'series'],
  ['WindowStats', 'avg', 'Threshold', 'ref'],
  ['Threshold', 'flags', 'AnomalyGate', 'flags'],
  ['SmoothPress', 'out', 'AnomalyGate', 'series'],
  ['AnomalyGate', 'anomalies', 'AlertBuzzer', 'anomalies'],
  ['AnomalyGate', 'anomalies', 'AnomalyCount', 'values'],
  ['AnomalyCount', 'count', 'Dashboard', 'alerts'],
  ['SmoothPress', 'out', 'DebugTap', 'series'],
]

export interface AgentLogLine { tool: string; ok: boolean; detail: string }

interface LogUi {
  step: (tool: string, args: string) => { ok: (detail: string) => void; err: (detail: string) => void }
  sub: (text: string, cls?: string) => void
  summary: (text: string) => void
  done: (textOverride?: string) => void
}

function buildLog(editor: XenolithEditor, mode: 'auto' | 'propose'): LogUi {
  const log = document.createElement('div')
  log.setAttribute('data-agent-log', '')
  log.style.cssText = `
    position: absolute; left: 12px; top: 12px; z-index: 30; pointer-events: auto;
    width: 360px; max-height: 62vh; overflow-y: auto;
    font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #e8e8e8; background: rgba(16, 18, 14, 0.88); border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px; padding: 10px 12px; backdrop-filter: blur(8px);`
  const title = document.createElement('div')
  title.textContent = mode === 'propose'
    ? '⟡ agent session — propose → review → approve → run'
    : '⟡ agent session — MCP tools · build → run → verify'
  title.style.cssText = 'font-weight: 700; margin-bottom: 6px; color: #d8b45a;'
  log.appendChild(title)
  const summaryEl = document.createElement('div')
  summaryEl.setAttribute('data-agent-summary', '')
  summaryEl.style.cssText = 'margin-top: 6px; opacity: 0.85;'
  log.appendChild(summaryEl)
  editor.overlayRoot.appendChild(log)

  const line = (text: string, color: string, attr?: [string, string]): HTMLDivElement => {
    const el = document.createElement('div')
    el.textContent = text
    el.style.cssText = `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${color};`
    if (attr) el.setAttribute(attr[0], attr[1])
    log.insertBefore(el, summaryEl)
    log.scrollTop = log.scrollHeight
    return el
  }
  return {
    step: (tool, args) => {
      const el = line(`▸ ${tool}(${args})`, '#e8e8e8', ['data-agent-step', tool])
      return {
        ok: (detail) => { el.setAttribute('data-agent-ok', ''); el.style.color = '#9fd48a'; el.textContent += ` ✓ ${detail}` },
        err: (detail) => { el.setAttribute('data-agent-err', ''); el.style.color = '#e2695f'; el.textContent += ` ✗ ${detail}` },
      }
    },
    sub: (text, cls = 'dim') => line(`  ${text}`, cls === 'run' ? '#8ecdf5' : cls === 'ok' ? '#9fd48a' : cls === 'err' ? '#e2695f' : 'rgba(232,232,232,0.6)'),
    summary: (text) => { summaryEl.textContent = text },
    done: (textOverride?: string) => {
      const el = line(
        textOverride ?? (mode === 'propose'
          ? '✓ session complete — the approved batch is ONE undoable history entry'
          : '✓ session complete — every agent edit is ordinary undoable history'),
        '#d8b45a',
      )
      el.setAttribute('data-agent-done', '')
    },
  }
}

/** Run the whole session: build (MCP-style calls) → [propose: human review + approve] → execute
 *  (StepDebugger, real values, per-node status/edge animation) → verify (outputs checked). */
export async function runAgentSession(
  editor: XenolithEditor,
  opts: { delayMs?: number; mode?: 'auto' | 'propose' } = {},
): Promise<void> {
  const propose = opts.mode === 'propose'
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms ?? 260))
  for (const [name, svg] of Object.entries(CUSTOM_ICONS)) editor.icons.register(name, svg)
  for (const schema of agentSchemas) editor.registry.register(schema)
  const ui = buildLog(editor, opts.mode ?? 'auto')
  const nodeCount = () => [...editor.graphNodes()].length
  const edgeCount = () => [...editor.graphEdges()].length
  const run = { history: [] as Array<{ nodeId: string; type: string; durationMs: number }>, alert: '', count: -1 }
  ;(window as unknown as Record<string, unknown>)['__agentRun'] = run

  // Propose mode: the session goes through the REAL proposal pipeline. The queue + panel are
  // wired by hand (the embedded-handlers pattern from STABLE-API) — buildHandlers attaches the
  // editor's own command bus, so approve() lands as ONE undoable transaction.
  let tools: Record<string, ToolHandler> | null = null
  let proposals: ProposalQueue | null = null
  const provisional = new Map<string, string>()
  if (propose) {
    proposals = new ProposalQueue()
    new ProposalsPanel({ overlayRoot: editor.overlayRoot, queue: proposals })
    tools = buildHandlers(editor as never, { mode: 'propose', clientId: 'claude-desktop', proposals })
  }
  const queueStatus = (): string =>
    proposals ? `${proposals.size} proposals pending` : `${nodeCount()} nodes · ${edgeCount()} edges`

  // ---- BUILD: the agent works exactly like the MCP tools do ----
  const t1 = ui.step('list_node_types', '')
  t1.ok(`${agentSchemas.length} types registered`)

  for (const schema of agentSchemas) {
    const h = ui.step('add_node', `type=${schema.type}`)
    await wait(110)
    try {
      if (tools) {
        const r = tools['add_node']!({ type: schema.type }) as { provisionalNodeId: string; queued: number }
        provisional.set(schema.type, r.provisionalNodeId)
        h.ok(`queued #${r.queued}`)
      } else {
        h.ok(editor.insertNode(schema.type, { x: 0, y: 0 }) ? `id=${schema.type}` : 'null')
      }
    } catch (e) { h.err(String(e)) }
    ui.summary(queueStatus())
  }

  for (const [from, fp, to, tp] of WIRING) {
    const h = ui.step('connect_pins', `${from}.${fp} → ${to}.${tp}`)
    await wait(70)
    try {
      if (tools) {
        // Chained proposals: references go through PROVISIONAL ids — approval translates them
        // to the real ones (ADR 0007 §5).
        const r = tools['connect_pins']!({
          from: { node: provisional.get(from)!, pin: fp },
          to: { node: provisional.get(to)!, pin: tp },
        }) as { queued: number }
        h.ok(`queued #${r.queued}`)
      } else {
        connect(editor, from, fp, to, tp)
        h.ok('')
      }
    } catch (e) { h.err(String(e)) }
    ui.summary(queueStatus())
  }

  const layout = ui.step('auto_layout', 'direction=LR, spacing=110')
  await wait(500)
  if (tools) {
    tools['auto_layout']!({ direction: 'LR', spacing: 110 })
    layout.ok('queued')
  } else {
    const laid = editor.autoLayout({ direction: 'LR', spacing: 110, fit: false })
    layout.ok(`moved ${laid.moved} nodes`)
  }

  const palette = ui.step('set_category_palette', '7 categories')
  await wait(300)
  if (tools) {
    tools['set_category_palette']!({ palette: agentPalette })
    palette.ok('queued')
  } else {
    editor.setCategoryPalette(agentPalette)
    palette.ok('')
  }

  // ---- REVIEW + APPROVE (propose only): YOUR TURN — the session waits for the human ----
  // The panel OPENS for you (badge click below), but the decision is yours and only yours:
  // nothing is scripted from here. The queue drains when you press Approve all / Reject all
  // in the real panel (or reject entries one by one). e2e and the recorder play the human.
  if (propose && proposals) {
    const pending = proposals.size
    const review = ui.step('human_review', `${pending} proposals — YOUR TURN`)
    await wait(900)
    const badge = editor.overlayRoot.querySelector('[data-xeno-proposals-badge]') as HTMLElement | null
    badge?.click() // open the review panel FOR the human — the DECISION stays human
    ui.sub('your turn — review the batch, then Approve all; Reject all leaves your graph untouched', 'dim')
    while (proposals.size > 0) await wait(120)
    await wait(400)
    const nodes = nodeCount()
    if (nodes === 0 && edgeCount() === 0) {
      // Rejected in full: the trust boundary HELD — the agent changed nothing at all.
      review.ok('rejected — the agent changed NOTHING; your graph and undo history are intact')
      ui.summary('0 nodes · 0 edges — trust boundary held')
      ui.done('✓ session complete — batch REJECTED: the agent touched nothing (that is the point)')
      return
    }
    // Fit with the same geometry as the auto path — clear of the transcript panel, not clipped.
    editor.fitView({ padding: 220 })
    editor.view.pan(180, 0)
    if (nodes === agentSchemas.length) review.ok(`${nodes} nodes · ${edgeCount()} edges — ONE undo step`)
    else review.ok(`partial approve — ${nodes}/${agentSchemas.length} nodes (you rejected the rest)`)
  } else {
    // Fit with enough slack, then shift right for the 360px transcript panel: padding 220 + pan 180
    // → ~400px left margin (panel + gap), ~40px right margin — fully visible, nothing clipped.
    editor.fitView({ padding: 220 })
    editor.view.pan(180, 0)
  }

  // ---- RUN: real host dataflow pass through the StepDebugger ----
  const runStep = ui.step('run_graph', 'step-through with timings')
  await wait(400)
  const pinIdToLabel = (node: Node, id: string | PinId): string => node.pins.find((p) => String(p.id) === String(id))?.label ?? String(id)
  const labelToPinId = (node: Node, label: string): string => String(node.pins.find((p) => p.label === label)?.id ?? label)
  // StepDebugger speaks pinIds; our computes speak pin labels — convert both ways at the edge.
  const debugger_ = new StepDebugger(editor.readGraph(), (ctx) => {
    const labelled: Record<string, unknown> = {}
    for (const [id, v] of ctx.inputs) labelled[pinIdToLabel(ctx.node, id)] = v
    const result = computes[ctx.node.type]?.(labelled) ?? {}
    const mapped = new Map<string, unknown>()
    for (const [label, v] of Object.entries(result)) mapped.set(labelToPinId(ctx.node, label), v)
    return mapped
  })
  const animated = new Set<string>()
  const animateOut = (nodeId: string) => {
    for (const e of editor.graphEdges()) {
      if (String(e.from.node) === nodeId) { editor.setEdgeAnimated(e.id, true); animated.add(String(e.id)) }
    }
  }
  debugger_.on('stepped', (record) => {
    run.history.push({ nodeId: String(record.nodeId), type: record.type, durationMs: record.durationMs })
    editor.setNodeStatus(record.nodeId, 'ok')
    animateOut(String(record.nodeId))
    ui.sub(`${record.type} ✓ ${record.durationMs.toFixed(1)}ms`, 'run')
  })
  debugger_.on('error', (info) => { editor.setNodeStatus(info.nodeId, 'error'); ui.sub(`${info.message}`, 'err') })
  await debugger_.start()
  while (debugger_.status !== 'finished' && debugger_.status !== 'error') {
    const current = debugger_.currentNodeId
    if (current !== null) editor.setNodeStatus(current, 'running')
    const record = await debugger_.step()
    if (!record) break
    await wait(210)
  }
  for (const eid of animated) editor.setEdgeAnimated(eid as never, false)
  // Pull the outputs the verify step needs from the step records.
  const outputsOf = (type: string): Map<string, unknown> => {
    const rec = debugger_.history.find((r) => r.type === type)
    return rec ? rec.outputs : new Map<string, unknown>()
  }
  run.alert = String(outputsOf('AlertBuzzer').get(labelToPinId(byType(editor, 'AlertBuzzer'), 'alert')))
  run.count = Number(outputsOf('AnomalyCount').get(labelToPinId(byType(editor, 'AnomalyCount'), 'count')))
  runStep.ok(`${debugger_.history.length} nodes · ${debugger_.history.reduce((s, r) => s + r.durationMs, 0).toFixed(1)}ms total`)

  // ---- VERIFY: the agent checks its own build ----
  const verify = ui.step('verify', 'outputs')
  await wait(600)
  const pass = run.alert.includes('2 anomalies') && run.count === 2
  if (pass) verify.ok('anomalies=2 on Sensor B — pipeline correct')
  else verify.err(`alert='${run.alert}' count=${run.count}`)
  ui.sub(`dashboard report: ${JSON.stringify(outputsOf('Dashboard').get(labelToPinId(byType(editor, 'Dashboard'), 'report')) ?? null)}`)

  const fit = ui.step('fit_view', 'padding=220')
  editor.fitView({ padding: 220 })
  editor.view.pan(180, 0) // same geometry as after auto_layout — clear of the panel, not clipped
  fit.ok('')
  ui.summary(`${nodeCount()} nodes · ${edgeCount()} edges · ${run.history.length} executed`)
  ui.done()
}
