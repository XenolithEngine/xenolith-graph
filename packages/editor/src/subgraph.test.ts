// @vitest-environment jsdom
// Unit tests for Subgraph — the macro/template/dive orchestration extracted from the editor
// monolith (split tranche 1, 2026-09-25). Written AFTER the implementation by a different agent
// than the one that extracted the module — adversarial review recommended (AGENTS.md test rules).
//
// The harness fakes the ~40-field SubHost bag: real core objects (Graph, CommandBus,
// EventEmitter, NodeRegistry) with vi.fn() render callbacks and empty view/frame maps, so only
// the model-level invariants run — rendering/animation paths are covered by the Playwright
// suite (macro.spec.ts, template*.spec.ts, dive.spec.ts). The real editor's sync invalidates
// the macro index on every command; this harness does it manually where a test mutates the
// graph and then relies on macroParentOf().
import { describe, it, expect, vi } from 'vitest'
import {
  AddNode, CommandBus, EventEmitter, Graph, NodeRegistry, RemoveNode,
  isMacro, isTemplateInstance, macroMembers,
  TEMPLATE_INPUT_TYPE, TEMPLATE_OUTPUT_TYPE,
  type CoreEvents, type Edge, type Node, type NodeId, type Pin, type PinId,
  type TemplateDefId, type TemplateDefinition, type WidgetSpec,
} from '@xenolithengine/graph-core'
import type { RenderNodeOptions } from '@xenolithengine/graph-render-pixi'
import type { XenTokens } from '@xenolithengine/graph-theme-xen'
import { Subgraph, type SubHost } from './subgraph.js'
import type { EditorEvents } from './events.js'
import type { XenolithEditor } from './index.js'

// ----- fixtures ---------------------------------------------------------------------------------

interface PinSpec { id: string; dir: 'in' | 'out'; type?: string; label?: string }

const mkPin = (p: PinSpec): Pin =>
  ({ id: p.id as PinId, kind: 'data', direction: p.dir, type: p.type ?? 'number', ...(p.label !== undefined ? { label: p.label } : {}) }) as Pin

const mkNode = (
  id: string, pins: PinSpec[],
  opts: { pos?: { x: number; y: number }; type?: string; state?: Record<string, unknown>; widgets?: WidgetSpec[] } = {},
): Node => ({
  id: id as unknown as NodeId,
  type: opts.type ?? 'Test',
  position: opts.pos ?? { x: 0, y: 0 },
  state: opts.state ?? {},
  pins: pins.map(mkPin),
  ...(opts.widgets ? { widgets: opts.widgets } : {}),
}) as Node

const mkEdge = (id: string, from: string, fp: string, to: string, tp: string): Edge =>
  ({ id: id as never, from: { node: from as never, pin: fp as never }, to: { node: to as never, pin: tp as never } })

/** Minimal fake PIXI layer — only addChild/setChildIndex are reachable with empty view maps. */
const mkLayer = (): never =>
  ({ children: [], addChild(c: unknown) { this.children.push(c) }, setChildIndex() {} }) as never

function harness() {
  const graph = new Graph()
  const coreEvents = new EventEmitter<CoreEvents>()
  const bus = new CommandBus({ graph, events: coreEvents })
  const events = new EventEmitter<EditorEvents>()
  const definitions = new Map<TemplateDefId, TemplateDefinition>()
  const templateRegistry = new NodeRegistry()
  const renderOpts = new Map<NodeId, RenderNodeOptions>()
  const selectionIds: NodeId[] = []
  const diveEvents: Array<{ depth: number; definitionId: string | null }> = []
  let vp = { x: 0, y: 0, zoom: 1 }

  const host: SubHost = {
    ed: {
      get graph() { return host.displayGraph },
      // The real editor routes both through the ACTIVE (display) graph/bus — at depth 0 the
      // root, while dived the definition's (index.ts get graph()/get commandBus()).
      get commandBus() { return host.displayBus },
      selection: {
        ids: () => [...selectionIds],
        replaceWith: (ids: NodeId[]) => { selectionIds.length = 0; selectionIds.push(...ids) },
        clear: () => { selectionIds.length = 0 },
      },
      fitView: vi.fn(),
      get diveDepth() { return host.diveStack.length },
      overlayRoot: document.createElement('div'),
    } as unknown as XenolithEditor,
    app: { screen: { width: 800, height: 600 } } as never,
    breadcrumbDisabled: false,
    breadcrumbEl: null,
    coreEvents,
    currentDefId: null,
    definitions,
    displayBus: bus,
    displayGraph: graph,
    diveStack: [],
    edgeRecords: new Map(),
    edgesLayer: mkLayer(),
    events,
    expandingMacros: new Set<NodeId>(),
    hiddenMembers: new Set<NodeId>(),
    interactive: true,
    liveMode: false,
    macroFrameLastTap: 0,
    macroFrames: new Map(),
    macroFramesLayer: mkLayer(),
    macroOverlayLayer: mkLayer(),
    macroParentIndex: null,
    nodesLayer: mkLayer(),
    renderOpts,
    rootGraph: graph,
    templateRegistry,
    // Tokens are only read on render paths these tests never take (frames, tweens, titles).
    theme: { tokens: {} as unknown as XenTokens },
    viewport: {
      get state() { return vp },
      setState: (s: { x: number; y: number; zoom: number }) => { vp = s },
      zoomAt: vi.fn(),
    },
    viewportTweenRaf: null,
    views: new Map(),
    zoomBounds: [0.1, 4] as never,
    ensureSize: (node: Node) => { node.size = { x: 120, y: 60 } },
    ensureView: vi.fn(() => ({ container: mkLayer() })) as never,
    ensureWidgetOverlay: () => ({ editText: vi.fn() }),
    propagateRerouteTypes: vi.fn(),
    rebuildDisplay: vi.fn(),
    requestRender: vi.fn(),
    teardownDisplay: vi.fn(),
  }
  const sub = new Subgraph(host)
  events.on('dive:changed', (e) => diveEvents.push(e))

  const seed = (nodes: Node[], edges: Edge[]) => {
    for (const n of nodes) graph._addNode(n)
    for (const e of edges) graph._addEdge(e)
  }
  /** SRC.p_out → A.p_in → … → B.p_out → DST.p_in, plus a free widget-bound IN pin on A. */
  const pipeline = () => {
    const src = mkNode('src', [{ id: 'p_out', dir: 'out', type: 'number' }], { pos: { x: 0, y: 0 } })
    const a = mkNode('a', [
      { id: 'p_in', dir: 'in', type: 'number' },
      { id: 'p_out', dir: 'out', type: 'number' },
      { id: 'p_scale', dir: 'in', type: 'number', label: 'scale' },
    ], { pos: { x: 100, y: 0 }, widgets: [{ id: 'w_scale', type: 'slider', key: 'scale', label: 'scale' } as WidgetSpec] })
    const b = mkNode('b', [
      { id: 'p_in', dir: 'in', type: 'number' },
      { id: 'p_out', dir: 'out', type: 'number' },
    ], { pos: { x: 200, y: 0 } })
    const dst = mkNode('dst', [{ id: 'p_in', dir: 'in', type: 'number' }], { pos: { x: 300, y: 0 } })
    seed([src, a, b, dst], [
      mkEdge('e1', 'src', 'p_out', 'a', 'p_in'),
      mkEdge('e2', 'a', 'p_out', 'b', 'p_in'),
      mkEdge('e3', 'b', 'p_out', 'dst', 'p_in'),
    ])
    return { src, a, b, dst }
  }
  return { host, sub, graph, bus, definitions, templateRegistry, renderOpts, selectionIds, diveEvents, seed, pipeline }
}

const adjacency = (g: Graph): string[] =>
  [...g.edges()].map((e) => `${String(e.from.node)}.${String(e.from.pin)}>${String(e.to.node)}.${String(e.to.pin)}`).sort()

const nodeTypes = (g: Graph): string[] => [...g.nodes()].map((n) => n.type).sort()

const edgeBetween = (g: Graph, from: string, to: string): Edge | undefined =>
  [...g.edges()].find((e) => String(e.from.node) === from && String(e.to.node) === to) as Edge | undefined

// ----- macro grouping ---------------------------------------------------------------------------

describe('Subgraph — macro grouping', () => {
  it('groups a selection into a Macro with proxy pins; boundary edges rewire, members stay in the model', () => {
    const h = harness()
    h.pipeline()
    const before = adjacency(h.graph)
    const macroId = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId], 'Gather')
    expect(macroId).not.toBeNull()
    const macro = h.graph.getNode(macroId!)!
    expect(isMacro(macro)).toBe(true)
    expect(macro.state['members']).toEqual(['a', 'b'])
    // Boundary edges now land on macro proxy pins…
    const inEdge = edgeBetween(h.graph, 'src', String(macroId))
    const outEdge = edgeBetween(h.graph, String(macroId), 'dst')
    expect(inEdge).toBeDefined()
    expect(outEdge).toBeDefined()
    expect(String(inEdge!.to.node)).toBe(String(macroId))
    // …members remain in the model (visibility is a view concern)…
    expect(h.graph.getNode('a' as NodeId)).toBeDefined()
    expect(h.graph.getNode('b' as NodeId)).toBeDefined()
    // …selection moves to the macro, and the position anchors at the members' top-left.
    expect(h.selectionIds).toEqual([macroId])
    expect(macro.position).toEqual({ x: 100, y: 0 })
    // Internal member edge STAYS in the model — members and their edges hide at the view level
    // (applyMacroVisibility), which is why ungroup is a pure boundary-edge re-point.
    expect(edgeBetween(h.graph, 'a', 'b')).toBeDefined()
    void before
  })

  it('lifts disconnected widget-bound IN pins onto the macro surface (2026-05-30 regression)', () => {
    const h = harness()
    h.pipeline()
    const macroId = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId])!
    const macro = h.graph.getNode(macroId) as Node
    const lifted = macro.pins.find((p) => p.label === 'scale')
    expect(lifted).toBeDefined()
    expect(lifted!.direction).toBe('in')
    const proxyMap = macro.state['proxyMap'] as Array<{ memberPin: string; edgeId: unknown }>
    expect(proxyMap.some((r) => String(r.memberPin) === 'p_scale' && r.edgeId === null)).toBe(true)
  })

  it('refuses grouping when nothing is groupable', () => {
    const h = harness()
    h.pipeline()
    expect(h.sub.createMacroFromSelection([], 'X')).toBeNull()
    const boundary = mkNode('tin', [{ id: 'p', dir: 'in' }], { type: TEMPLATE_INPUT_TYPE })
    h.graph._addNode(boundary)
    expect(h.sub.createMacroFromSelection(['tin' as NodeId], 'X')).toBeNull()
  })

  it('macro-in-macro: a collapsed macro can itself be grouped', () => {
    const h = harness()
    h.pipeline()
    const m1 = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId], 'Inner')!
    h.graph._addNode(mkNode('c', [{ id: 'p_in', dir: 'in' }, { id: 'p_out', dir: 'out' }], { pos: { x: 250, y: 80 } }))
    const m2 = h.sub.createMacroFromSelection([m1, 'c' as NodeId], 'Outer')!
    const outer = h.graph.getNode(m2) as Node
    expect(macroMembers(outer).map(String)).toContain(String(m1))
    // Ungroup the outer → the inner macro is back as a plain collapsed node.
    expect(h.sub.ungroupMacro(m2)).toBe(true)
    expect(h.graph.getNode(m1)).toBeDefined()
    expect(isMacro(h.graph.getNode(m1) as Node)).toBe(true)
  })

  it('ungroupMacro restores boundary edges onto member pins and removes the macro; refuses non-macros', () => {
    const h = harness()
    h.pipeline()
    const before = adjacency(h.graph)
    const macroId = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId])!
    expect(h.sub.ungroupMacro(macroId)).toBe(true)
    expect(h.graph.getNode(macroId)).toBeUndefined()
    // Full connectivity round-trip: same endpoints as before the collapse.
    expect(adjacency(h.graph)).toEqual(before)
    expect(h.sub.ungroupMacro('src' as NodeId)).toBe(false)
  })

  it('createMacroFromSelection is one undo entry', () => {
    const h = harness()
    h.pipeline()
    const before = adjacency(h.graph)
    h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId])!
    expect(h.bus.undo()).toBe(true)
    expect(adjacency(h.graph)).toEqual(before)
  })

  it('setMacroCollapsed toggles boundary edges between proxy pins and member pins', () => {
    const h = harness()
    h.pipeline()
    const macroId = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId])!
    h.sub.setMacroCollapsed(macroId, false) // expand: edges back onto member pins
    expect(edgeBetween(h.graph, 'src', 'a')).toBeDefined()
    expect(edgeBetween(h.graph, 'b', 'dst')).toBeDefined()
    expect((h.graph.getNode(macroId) as Node).state['collapsed']).toBe(false)
    h.sub.setMacroCollapsed(macroId, true) // collapse again: edges back onto proxies
    expect(edgeBetween(h.graph, 'src', String(macroId))).toBeDefined()
    expect(edgeBetween(h.graph, String(macroId), 'dst')).toBeDefined()
    expect((h.graph.getNode(macroId) as Node).state['collapsed']).toBe(true)
  })
})

// ----- live templates ---------------------------------------------------------------------------

describe('Subgraph — live templates', () => {
  const extract = (h: ReturnType<typeof harness>) => {
    const instId = h.sub.createTemplateFromSelection(['a' as NodeId, 'b' as NodeId], 'Pipeline')!
    const inst = h.graph.getNode(instId) as Node
    const defId = inst.state['definitionId'] as TemplateDefId
    return { instId, inst, defId, def: h.definitions.get(defId) }
  }

  it('creates one definition with In/Out boundaries and a wired instance; members leave the root graph', () => {
    const h = harness()
    h.pipeline()
    const { instId, defId, def } = extract(h)
    expect(h.definitions.size).toBe(1)
    expect(def.nodes.some((n: Node) => n.type === TEMPLATE_INPUT_TYPE)).toBe(true)
    expect(def.nodes.some((n: Node) => n.type === TEMPLATE_OUTPUT_TYPE)).toBe(true)
    expect(def.nodes.some((n: Node) => String(n.id) === 'a')).toBe(true)
    const inst = h.graph.getNode(instId) as Node
    expect(isTemplateInstance(inst)).toBe(true)
    expect(h.graph.getNode('a' as NodeId)).toBeUndefined()
    expect(h.graph.getNode('b' as NodeId)).toBeUndefined()
    // Wired in place of the members: SRC → instance → DST.
    expect(edgeBetween(h.graph, 'src', String(instId))).toBeDefined()
    expect(edgeBetween(h.graph, String(instId), 'dst')).toBeDefined()
    // Palette schema registered under the definition id.
    expect(h.templateRegistry.get(String(defId))?.title).toBe('Pipeline')
    expect(h.selectionIds).toEqual([instId])
  })

  it('extraction is one undo entry (model restored)', () => {
    const h = harness()
    h.pipeline()
    const before = adjacency(h.graph)
    const types = nodeTypes(h.graph)
    extract(h)
    expect(h.bus.undo()).toBe(true)
    expect(adjacency(h.graph)).toEqual(before)
    expect(nodeTypes(h.graph)).toEqual(types)
  })

  it('insertTemplateInstance mints instances sharing the definition; unknown defs refused; no recursion at root', () => {
    const h = harness()
    h.pipeline()
    const { defId } = extract(h)
    expect(h.sub.wouldRecurse(defId)).toBe(false) // at the root document nothing recurses
    expect(h.sub.insertTemplateInstance('nope' as TemplateDefId, { x: 0, y: 0 }, {})).toBeNull()
    const inst2 = h.sub.insertTemplateInstance(defId, { x: 500, y: 0 }, { center: false })!
    expect(inst2).not.toBeNull()
    expect(h.definitions.size).toBe(1) // shared definition, not a copy
    expect(h.graph.getNode(inst2.id)).toBeDefined()
    expect(h.selectionIds.map(String)).toEqual([String(inst2.id)])
  })

  it('unpackTemplateInstance inlines a copy and leaves the definition + sibling instances untouched', () => {
    const h = harness()
    h.pipeline()
    const { instId, defId } = extract(h)
    const inst2 = h.sub.insertTemplateInstance(defId, { x: 500, y: 0 }, { center: false })!
    expect(h.sub.unpackTemplateInstance(instId)).toBe(true)
    expect(h.graph.getNode(instId)).toBeUndefined()
    expect(h.graph.getNode(inst2.id)).toBeDefined() // sibling untouched
    // The inlined copy is wired into the outer graph where the instance was…
    const inlined = [...h.graph.nodes()].filter((n) => String(n.id) !== 'src' && String(n.id) !== 'dst' && !isTemplateInstance(n) && !isMacro(n) && n.type === 'Test')
    expect(inlined.length).toBe(2)
    expect(edgeBetween(h.graph, 'src', String(inlined[0]!.id))).toBeDefined()
    expect(edgeBetween(h.graph, String(inlined[1]!.id), 'dst')).toBeDefined()
    // …the definition keeps the originals.
    const def = h.definitions.get(defId)!
    expect(def.nodes.some((n: Node) => String(n.id) === 'a')).toBe(true)
  })

  it('unpackTemplateInstance refuses non-instances', () => {
    const h = harness()
    h.pipeline()
    expect(h.sub.unpackTemplateInstance('src' as NodeId)).toBe(false)
  })

  it('convertTemplateInstanceToMacro wraps the inlined members in a Macro; one undo returns the instance', () => {
    const h = harness()
    h.pipeline()
    const { instId } = extract(h)
    const beforeAdj = adjacency(h.graph)
    const beforeTypes = nodeTypes(h.graph)
    const macroId = h.sub.convertTemplateInstanceToMacro(instId)!
    expect(macroId).not.toBeNull()
    expect(isMacro(h.graph.getNode(macroId) as Node)).toBe(true)
    expect(h.graph.getNode(instId)).toBeUndefined()
    expect(h.bus.undo()).toBe(true)
    expect(adjacency(h.graph)).toEqual(beforeAdj)
    expect(nodeTypes(h.graph)).toEqual(beforeTypes)
  })

  it('convertMacroToTemplate dissolves the macro into a new definition + instance', () => {
    const h = harness()
    h.pipeline()
    const macroId = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId], 'Grp')!
    const instId = h.sub.convertMacroToTemplate(macroId)!
    expect(instId).not.toBeNull()
    expect(h.graph.getNode(macroId)).toBeUndefined()
    expect(isTemplateInstance(h.graph.getNode(instId) as Node)).toBe(true)
    expect(h.definitions.size).toBe(1)
    const def = h.definitions.get((h.graph.getNode(instId) as Node).state['definitionId'] as TemplateDefId)!
    expect(def.nodes.some((n: Node) => String(n.id) === 'a')).toBe(true)
  })

  it('renameTemplate updates the definition, live instances, and the palette schema; blank rename is a no-op', () => {
    const h = harness()
    h.pipeline()
    const { instId, defId } = extract(h)
    h.sub.renameTemplate(defId, 'Renamed')
    expect(h.definitions.get(defId)!.title).toBe('Renamed')
    expect(h.renderOpts.get(instId)?.title).toBe('Renamed')
    expect(h.templateRegistry.get(String(defId))?.title).toBe('Renamed')
    h.sub.renameTemplate(defId, '   ')
    expect(h.definitions.get(defId)!.title).toBe('Renamed')
  })
})

// ----- dive -------------------------------------------------------------------------------------

describe('Subgraph — dive', () => {
  const dived = (h: ReturnType<typeof harness>) => {
    const instId = h.sub.createTemplateFromSelection(['a' as NodeId, 'b' as NodeId], 'Pipeline')!
    expect(h.sub.diveInto(instId)).toBe(true)
    return { instId, defId: h.host.currentDefId! }
  }

  it('diveInto swaps the display graph to the definition and preserves the root; emits dive:changed', () => {
    const h = harness()
    h.pipeline()
    const { instId, defId } = dived(h)
    expect(h.host.diveStack.length).toBe(1)
    expect(h.host.currentDefId).toBe(defId)
    expect(h.host.displayGraph).not.toBe(h.graph)
    expect([...h.host.displayGraph.nodes()].some((n) => String(n.id) === 'a')).toBe(true)
    expect([...h.host.displayGraph.nodes()].some((n) => n.type === TEMPLATE_INPUT_TYPE)).toBe(true)
    // Root untouched: instance + externals still there, and still the root bus's graph.
    expect(h.graph.getNode(instId)).toBeDefined()
    expect(h.graph.getNode('src' as NodeId)).toBeDefined()
    expect(h.diveEvents).toEqual([{ depth: 1, definitionId: String(defId) }])
  })

  it('refuses diveInto on non-instances and on instances with a missing definition', () => {
    const h = harness()
    h.pipeline()
    expect(h.sub.diveInto('src' as NodeId)).toBe(false)
    const { instId } = dived(h)
    h.definitions.delete(h.host.currentDefId!)
    h.sub.diveOut(0)
    h.host.definitions.delete((h.graph.getNode(instId) as Node).state['definitionId'] as TemplateDefId)
    expect(h.sub.diveInto(instId)).toBe(false)
  })

  it('no re-entry: while inside a definition, instancing that definition is refused; others allowed', () => {
    const h = harness()
    h.pipeline()
    const { defId } = dived(h)
    // At depth 1 every operation targets the DEFINITION graph (ed.graph → displayGraph), so the
    // second template is built from nodes living inside the definition.
    const g = h.host.displayGraph
    g._addNode(mkNode('c', [{ id: 'p_in', dir: 'in' }, { id: 'p_out', dir: 'out' }], { pos: { x: 900, y: 0 } }))
    g._addNode(mkNode('d', [{ id: 'p_in', dir: 'in' }], { pos: { x: 1000, y: 0 } }))
    g._addEdge(mkEdge('e9', 'c', 'p_out', 'd', 'p_in'))
    const inst2 = h.sub.createTemplateFromSelection(['c' as NodeId, 'd' as NodeId], 'Other')!
    const otherDefId = (g.getNode(inst2) as Node).state['definitionId'] as TemplateDefId
    expect(h.sub.wouldRecurse(defId)).toBe(true)
    expect(h.sub.insertTemplateInstance(defId, { x: 0, y: 0 }, {})).toBeNull()
    expect(h.sub.insertTemplateInstance(otherDefId, { x: 0, y: 0 }, {})).not.toBeNull()
  })

  it('edits inside a dive land in the definition after diveOut; selection + viewport restored', () => {
    const h = harness()
    h.pipeline()
    const { instId, defId } = dived(h)
    h.host.viewport.setState({ x: 40, y: 40, zoom: 2 }) // camera moved while inside
    const added = mkNode('inner', [{ id: 'p_in', dir: 'in' }])
    h.host.displayBus.apply(new AddNode(added))
    h.sub.diveOut()
    expect(h.host.currentDefId).toBeNull()
    expect(h.host.displayGraph).toBe(h.graph)
    const def = h.definitions.get(defId)!
    expect(def.nodes.some((n: Node) => String(n.id) === 'inner')).toBe(true)
    expect(h.graph.getNode('inner' as NodeId)).toBeUndefined() // never leaked into the root
    expect(h.selectionIds).toEqual([instId])
    expect(h.host.viewport.state).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(h.diveEvents.at(-1)).toEqual({ depth: 0, definitionId: null })
  })

  it('diveOut resyncs instance pins after the interface changed inside (stale outer edge dropped)', () => {
    const h = harness()
    h.pipeline()
    const { instId, defId } = dived(h)
    const inst = h.graph.getNode(instId) as Node
    const outPin = inst.pins.find((p) => p.direction === 'out')!
    expect(outPin).toBeDefined()
    expect(edgeBetween(h.graph, String(instId), 'dst')).toBeDefined()
    // Remove the $templateOutput boundary INSIDE the definition → the interface loses the out slot.
    const boundary = [...h.host.displayGraph.nodes()].find((n) => n.type === TEMPLATE_OUTPUT_TYPE)!
    h.host.displayBus.apply(new RemoveNode(boundary.id as NodeId))
    h.sub.diveOut()
    const after = h.graph.getNode(instId) as Node
    expect(after.pins.find((p) => p.direction === 'out')).toBeUndefined()
    expect(edgeBetween(h.graph, String(instId), 'dst')).toBeUndefined() // stale edge pruned
    void defId
  })
})

// ----- declarative load -------------------------------------------------------------------------

describe('Subgraph — declarative load', () => {
  it('materializeLoadedMacros derives proxy pins + rewires boundary edges for collapsed macros', () => {
    const h = harness()
    const macro = mkNode('m', [], {
      type: 'Macro', pos: { x: 100, y: 0 },
      state: { collapsed: true, members: ['a', 'b'] },
    })
    h.seed([
      mkNode('src', [{ id: 'p_out', dir: 'out' }]),
      mkNode('a', [{ id: 'p_in', dir: 'in' }, { id: 'p_out', dir: 'out' }], { pos: { x: 100, y: 0 } }),
      mkNode('b', [{ id: 'p_in', dir: 'in' }, { id: 'p_out', dir: 'out' }], { pos: { x: 200, y: 0 } }),
      mkNode('dst', [{ id: 'p_in', dir: 'in' }]),
      macro,
    ], [
      mkEdge('e1', 'src', 'p_out', 'a', 'p_in'),
      mkEdge('e2', 'a', 'p_out', 'b', 'p_in'),
      mkEdge('e3', 'b', 'p_out', 'dst', 'p_in'),
    ])
    h.sub.materializeLoadedMacros()
    const m = h.graph.getNode('m' as NodeId) as Node
    expect(m.pins.length).toBe(2) // one in proxy, one out proxy
    expect(edgeBetween(h.graph, 'src', 'm')).toBeDefined()
    expect(edgeBetween(h.graph, 'm', 'dst')).toBeDefined()
    expect(edgeBetween(h.graph, 'src', 'a')).toBeUndefined()
    expect((m.state['proxyMap'] as unknown[]).length).toBe(2)
  })
})

// ----- macro index ------------------------------------------------------------------------------

describe('Subgraph — macro index', () => {
  it('macroParentOf / macroDepthOf / macroIsAncestor across nesting; index refresh picks up new macros', () => {
    const h = harness()
    h.pipeline()
    const m1 = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId])!
    h.graph._addNode(mkNode('c', [{ id: 'p_in', dir: 'in' }], { pos: { x: 250, y: 80 } }))
    // The editor's sync invalidates on mutation; emulate it before index-dependent queries.
    h.sub.invalidateMacroIndex()
    const m2 = h.sub.createMacroFromSelection([m1, 'c' as NodeId])!
    h.sub.invalidateMacroIndex()
    expect(String(h.sub.macroParentOf('a' as NodeId)!.id)).toBe(String(m1))
    expect(String(h.sub.macroParentOf(m1)!.id)).toBe(String(m2))
    expect(h.sub.macroDepthOf('a' as NodeId)).toBe(2)
    expect(h.sub.macroIsAncestor(m2, 'a' as NodeId)).toBe(true)
    expect(h.sub.macroIsAncestor(m1, 'c' as NodeId)).toBe(false)
    // Stale-index contract: without invalidation a newly created macro is invisible to lookups.
    h.graph._addNode(mkNode('d', [{ id: 'p_in', dir: 'in' }], { pos: { x: 500, y: 500 } }))
    const m3 = h.sub.createMacroFromSelection(['d' as NodeId])!
    expect(h.sub.macroParentOf('d' as NodeId)).toBeUndefined()
    h.sub.invalidateMacroIndex()
    expect(String(h.sub.macroParentOf('d' as NodeId)!.id)).toBe(String(m3))
  })

  it('deepestExpandedMacro returns the innermost expanded macro', () => {
    const h = harness()
    h.pipeline()
    const m1 = h.sub.createMacroFromSelection(['a' as NodeId, 'b' as NodeId])!
    h.graph._addNode(mkNode('c', [{ id: 'p_in', dir: 'in' }], { pos: { x: 250, y: 80 } }))
    const m2 = h.sub.createMacroFromSelection([m1, 'c' as NodeId])!
    h.sub.invalidateMacroIndex()
    h.sub.setMacroCollapsed(m1, false)
    expect(String(h.sub.deepestExpandedMacro())).toBe(String(m1))
    h.sub.setMacroCollapsed(m2, false)
    expect(String(h.sub.deepestExpandedMacro())).toBe(String(m1)) // deeper nesting wins
  })
})
