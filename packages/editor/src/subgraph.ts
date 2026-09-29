import {
  AddNode, ConnectPins, DisconnectEdge, RemoveNode, SetNodeState,
  createEdgeId, createNodeId, createPinId, createMacro, isMacro, isTemplateBoundary, isTemplateInstance,
  macroMembers, planMacroCollapse, planTemplateExtraction, planTemplateUnpack,
  disconnectedWidgetBoundPins, templateInterface, materializeInterface, templateDefContains,
  TEMPLATE_INSTANCE_TYPE,
  CommandBus, Graph,
  type EventEmitter, type NodeRegistry, type CoreEvents, type Edge, type EdgeId, type MacroProxyRecord,
  type Node, type NodeId, type Pin, type PinId, type TemplateDefId, type TemplateDefinition,
} from '@xenolithengine/graph-core'
import {
  fitView, nodeBounds, renderMacroFrame, worldToScreen,
  type MacroFrameView, type NodeView, type RenderNodeOptions, type ViewportState, type ZoomBounds,
} from '@xenolithengine/graph-render-pixi'
import type { XenTokens } from '@xenolithengine/graph-theme-xen'
import type { Application, Container, ContainerChild, FederatedPointerEvent } from 'pixi.js'
import type { EditorEvents } from './events.js'
import type { TextEditOptions } from './widget-overlay.js'
import type { XenolithEditor } from './index.js'

export interface SubHost {
  ed: XenolithEditor
  app: Application
  breadcrumbDisabled: boolean
  breadcrumbEl: HTMLDivElement | null
  coreEvents: EventEmitter<CoreEvents>
  currentDefId: TemplateDefId | null
  definitions: Map<TemplateDefId, TemplateDefinition>
  displayBus: CommandBus
  displayGraph: Graph
  diveStack: { graph: Graph; bus: CommandBus; selectionIds: NodeId[]; viewport: ViewportState; defId: TemplateDefId | null }[]
  edgeRecords: Map<EdgeId, { graphics: Container & { visible: boolean; parent: Container | null }; edge: Edge }>
  edgesLayer: Container<ContainerChild>
  events: EventEmitter<EditorEvents>
  expandingMacros: Set<NodeId>
  hiddenMembers: Set<NodeId>
  interactive: boolean
  liveMode: boolean
  macroFrameLastTap: number
  macroFrames: Map<NodeId, MacroFrameView>
  macroFramesLayer: Container
  macroOverlayLayer: Container
  macroParentIndex: Map<NodeId, NodeId> | null
  nodesLayer: Container<ContainerChild>
  renderOpts: Map<NodeId, RenderNodeOptions>
  rootGraph: Graph
  templateRegistry: NodeRegistry
  theme: { tokens: XenTokens; commentHeaderStyle?: 'gradient' | 'tint' }
  viewport: { state: ViewportState; setState: (s: ViewportState) => void; zoomAt: (f: { x: number; y: number }, z: number) => void }
  viewportTweenRaf: number | null
  views: Map<NodeId, NodeView>
  zoomBounds: ZoomBounds
  ensureSize: (node: Node, render: RenderNodeOptions) => void
  ensureView: (node: Node) => NodeView
  ensureWidgetOverlay: () => { editText: (opts: TextEditOptions) => void }
  propagateRerouteTypes: () => void
  rebuildDisplay: () => void
  requestRender: () => void
  teardownDisplay: () => void
}

export class Subgraph {
  constructor(readonly h: SubHost) {}


  /** Group nodes into a collapsed macro. Boundary edges are rewired onto proxy pins (planMacroCollapse);
   *  members + internal edges hide. Defaults to the current selection. Returns the macro's id, or null
   *  if there's nothing groupable (macros can't be nested into a new macro here). */
  createMacroFromSelection(memberIds?: NodeId[], title = 'Macro'): NodeId | null {
    const ids = (memberIds ?? this.h.ed.selection.ids()) as NodeId[]
    // Members may themselves be macros — macro-in-macro nesting is allowed (a nested macro is just a
    // collapsed node with proxy pins by the time it's a member). Template interface boundary nodes
    // ($templateInput/$templateOutput) are NEVER groupable — they ARE the template's in/out pins, and
    // collapsing them away would silently destroy the interface.
    const members = ids.filter((id) => { const n = this.h.ed.graph.getNode(id); return !!n && !isTemplateBoundary(n) })
    if (members.length === 0) return null
    let minX = Infinity, minY = Infinity
    for (const id of members) { const n = this.h.ed.graph.getNode(id)!; minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y) }
    // Place the collapsed macro at the top-left of its members (so it lands where the anchor node was,
    // not floating above the group).
    const macro = createMacro({ x: minX, y: minY }, members)
    const edges = [...this.h.ed.graph.edges()] as Edge[]
    // Lift free widget-bound IN-pins of every member onto the macro so the macro's pin surface
    // matches Convert-to-Template (which exposes the same open boundary pins). Without this, the
    // user collapsing a Transform+Validate group loses access to its `scale/mode/mirror/response`
    // widget pins — the bug from 2026-05-30 (image #25/#26).
    const incomingByPin = new Set<string>()
    for (const e of edges) incomingByPin.add(String(e.to.pin))
    const hasIncoming = (pinId: PinId): boolean => incomingByPin.has(String(pinId))
    const liftPins: { node: NodeId; pin: PinId }[] = []
    for (const id of members) {
      const n = this.h.ed.graph.getNode(id) as Node | undefined
      if (!n) continue
      for (const lift of disconnectedWidgetBoundPins(n, hasIncoming)) liftPins.push(lift)
    }
    const plan = planMacroCollapse(macro.id, members, edges, (n, p) => this.pinInfo(n, p), { pin: createPinId, edge: createEdgeId }, { liftPins })
    macro.pins = plan.pins
    macro.state['proxyMap'] = plan.proxyMap as unknown
    // Collapsed macro reads as an ORDINARY node with pins (NOT a pill) — render.collapsed stays false;
    // state.collapsed (macro semantics: members hidden) is the toggle. Title names the group.
    const render: RenderNodeOptions = { category: 'macro', title }
    this.h.renderOpts.set(macro.id, render)
    this.h.ed.commandBus.transaction(() => {
      this.h.ed.commandBus.apply(new AddNode(macro))
      for (const eid of plan.disconnect) this.h.ed.commandBus.apply(new DisconnectEdge(eid))
      for (const e of plan.connect) this.h.ed.commandBus.apply(new ConnectPins(e))
    })
    this.h.ed.selection.replaceWith([macro.id])
    return macro.id
  }

  /** Ungroup a collapsed/expanded macro: dissolve the `Macro` wrapper and leave its members in the
   *  graph with their original edges restored. Undoable as one transaction. */
  ungroupMacro(id: NodeId): boolean {
    const macro = this.h.ed.graph.getNode(id)
    if (!macro || !isMacro(macro)) return false
    const members = macroMembers(macro as Node)
    this.h.ed.commandBus.transaction(() => {
      // If collapsed, move every edge currently on a macro proxy pin back onto the member pin it
      // proxies. We reconnect by the edge's CURRENT endpoints (not the stored proxyMap edgeId), so it
      // survives a neighbour macro having re-pointed the edge (macro→macro proxy↔proxy) — that
      // staleness is what made the old planMacroExpand path throw "edge not found".
      if (macro.state['collapsed']) {
        const proxyMap = (macro.state['proxyMap'] ?? []) as MacroProxyRecord[]
        const pinToMember = new Map<string, { node: NodeId; pin: PinId; dir: 'in' | 'out' }>()
        for (const r of proxyMap) pinToMember.set(String(r.macroPin), { node: r.memberNode, pin: r.memberPin, dir: r.direction })
        for (const e of [...this.h.ed.graph.edges()] as Edge[]) {
          if (e.to.node === id && pinToMember.has(String(e.to.pin))) {
            const m = pinToMember.get(String(e.to.pin))!
            this.h.ed.commandBus.apply(new DisconnectEdge(e.id))
            this.h.ed.commandBus.apply(new ConnectPins({ id: createEdgeId(), from: { ...e.from }, to: { node: m.node, pin: m.pin } }))
          } else if (e.from.node === id && pinToMember.has(String(e.from.pin))) {
            const m = pinToMember.get(String(e.from.pin))!
            this.h.ed.commandBus.apply(new DisconnectEdge(e.id))
            this.h.ed.commandBus.apply(new ConnectPins({ id: createEdgeId(), from: { node: m.node, pin: m.pin }, to: { ...e.to } }))
          }
        }
      }
      this.h.ed.commandBus.apply(new RemoveNode(id))
    })
    this.applyMacroVisibility()
    this.h.ed.selection.replaceWith(members.filter((m) => !!this.h.ed.graph.getNode(m)))
    this.h.requestRender()
    return true
  }

  // ----- live-template (public API) — reusable subgraph: one definition, many instances -----

  /** The reusable template definitions registered in this document, keyed by id. */
  get definitions(): ReadonlyMap<TemplateDefId, TemplateDefinition> { return this.h.definitions }

  /** Convert a selection into a reusable template: the members move into a fresh definition (with
   *  auto-derived `$templateInput`/`$templateOutput` boundary nodes), the outer graph keeps a single
   *  `$templateInstance` node wired in their place. Returns the instance node id, or null if there's
   *  nothing to extract. Undoable as one transaction. */
  createTemplateFromSelection(memberIds?: NodeId[], title = 'Template'): NodeId | null {
    const ids = (memberIds ?? this.h.ed.selection.ids()) as NodeId[]
    // Templates operate on FREE nodes only. Skip macro nodes and any node that is a member of a macro
    // (e.g. an expanded Gather/Pack's inlets/Merge/Sub), so converting a selection that overlaps a
    // macro can't drag the macro's guts into the template or orphan the macro by moving its members.
    // Also skip template interface boundaries ($templateInput/$templateOutput): they ARE the parent
    // template's in/out pins — pulling them into a nested template would destroy the interface.
    const members = ids
      .map((id) => this.h.ed.graph.getNode(id))
      .filter((n): n is Node => !!n && !isMacro(n) && !isTemplateBoundary(n) && this.macroParentOf(n.id) === undefined) as Node[]
    return this.extractTemplateFromMembers(members, title)
  }

  /** Core template-extraction step shared by the public Cmd+Shift+G path and the macro-conversion
   *  path. Trusts the caller's member list (no filtering) — the public entry filters first.
   *  `hiddenMembers` go into the definition + are removed from the outer graph but DON'T contribute
   *  to the template interface — used for nested-macro members whose pins are behind a proxy. */
  extractTemplateFromMembers(members: Node[], title: string, hiddenMembers: Node[] = []): NodeId | null {
    if (members.length === 0) return null
    let minX = Infinity, minY = Infinity
    for (const m of members) { minX = Math.min(minX, m.position.x); minY = Math.min(minY, m.position.y) }
    const instanceId = createNodeId()
    const plan = planTemplateExtraction(
      instanceId, members, [...this.h.ed.graph.edges()] as Edge[],
      (n, p) => this.pinInfo(n, p),
      { node: createNodeId, pin: createPinId, edge: createEdgeId, def: () => createNodeId() as unknown as TemplateDefId },
      title,
      hiddenMembers,
    )
    this.h.definitions.set(plan.definition.id, plan.definition)
    this.registerTemplateSchema(plan.definition.id)
    // Boundary nodes get minimal render opts so the dived-in view (and serialization) name them.
    for (const bn of plan.definition.nodes) {
      if (!this.h.renderOpts.has(bn.id) && (bn.type === '$templateInput' || bn.type === '$templateOutput')) {
        this.h.renderOpts.set(bn.id, { category: 'utility', title: bn.type === '$templateInput' ? 'In' : 'Out' })
      }
    }
    const instance: Node = {
      id: instanceId, type: TEMPLATE_INSTANCE_TYPE, position: { x: minX, y: minY },
      state: { definitionId: plan.definition.id, pinBoundary: plan.pinBoundary }, pins: plan.instancePins,
    }
    this.h.renderOpts.set(instanceId, { category: 'macro', title })
    this.h.ed.commandBus.transaction(() => {
      this.h.ed.commandBus.apply(new AddNode(instance))
      for (const eid of plan.outerDisconnect) this.h.ed.commandBus.apply(new DisconnectEdge(eid))
      for (const id of plan.removeFromOuter) this.h.ed.commandBus.apply(new RemoveNode(id))
      for (const e of plan.outerConnect) this.h.ed.commandBus.apply(new ConnectPins(e))
    })
    this.h.ed.selection.replaceWith([instanceId])
    return instanceId
  }

  /** (Re)register a definition as a palette schema so it shows in Tab search and can be inserted as a
   *  fresh instance. Pins mirror the current interface; call after create / rename / interface edit. */
  registerTemplateSchema(defId: TemplateDefId): void {
    const def = this.h.definitions.get(defId)
    if (!def) return
    const iface = templateInterface(def)
    this.h.templateRegistry.register({
      type: String(defId),
      title: def.title,
      category: 'macro',
      description: 'Reusable template instance',
      keywords: ['template', 'subgraph', def.title.toLowerCase()],
      pins: iface.map((s) => ({ kind: 'data', direction: s.direction, type: s.type, multiple: s.direction === 'out', ...(s.label !== undefined ? { label: s.label } : {}) })),
    })
  }

  /** Rename a template definition — updates its title, every live instance's displayed title, the
   *  palette entry, and the breadcrumb. */
  renameTemplate(defId: TemplateDefId, title: string): void {
    const def = this.h.definitions.get(defId)
    if (!def || title.trim() === '') return
    def.title = title
    for (const g of new Set([this.h.rootGraph, this.h.displayGraph])) {
      for (const n of g.nodes()) {
        if (!isTemplateInstance(n) || n.state['definitionId'] !== defId) continue
        const r = this.h.renderOpts.get(n.id) ?? {}; r.title = title; this.h.renderOpts.set(n.id, r)
        if (this.h.views.has(n.id)) this.resizeNodeView(n.id)
      }
    }
    this.registerTemplateSchema(defId)
    this.updateBreadcrumb()
    this.h.requestRender()
  }

  /** Unpack a `$templateInstance`: inline a fresh copy of its definition's members into the current
   *  graph (boundary nodes dissolve, outer edges reconnect to the member pins), then remove the
   *  instance. The definition and other instances are untouched. Undoable as one transaction. */
  unpackTemplateInstance(id: NodeId): boolean {
    const inst = this.h.ed.graph.getNode(id)
    if (!inst || !isTemplateInstance(inst)) return false
    const defId = inst.state['definitionId'] as TemplateDefId | undefined
    const def = defId !== undefined ? this.h.definitions.get(defId) : undefined
    if (!def) return false
    const plan = planTemplateUnpack(inst as Node, def, [...this.h.ed.graph.edges()] as Edge[], { node: createNodeId, pin: createPinId, edge: createEdgeId })
    // Carry render opts (title/category/colour) from each definition member onto its inlined copy.
    for (const [oldId, newId] of Object.entries(plan.nodeRemap)) {
      const ro = this.h.renderOpts.get(oldId as NodeId)
      if (ro) this.h.renderOpts.set(newId as NodeId, { ...ro })
    }
    this.h.ed.commandBus.transaction(() => {
      for (const n of plan.addNodes) this.h.ed.commandBus.apply(new AddNode(n))
      for (const eid of plan.removeEdges) this.h.ed.commandBus.apply(new DisconnectEdge(eid))
      this.h.ed.commandBus.apply(new RemoveNode(id))
      for (const e of plan.addEdges) this.h.ed.commandBus.apply(new ConnectPins(e))
    })
    // Selection covers TOP-LEVEL inlined members only. A node that's `state.members` of a nested
    // Macro that's also in the inlined set is "inside" — leaving it in the selection would let a
    // follow-up createMacroFromSelection list it BOTH on the new outer macro AND on the nested
    // one (double membership → phantom interface pins on the next convert-to-template cycle).
    const inlinedIds = new Set(plan.addNodes.map((n) => String(n.id)))
    const insideAnother = new Set<string>()
    for (const n of plan.addNodes) {
      if (n.type !== 'Macro') continue
      for (const m of macroMembers(n)) if (inlinedIds.has(String(m))) insideAnother.add(String(m))
    }
    this.h.ed.selection.replaceWith(plan.addNodes.filter((n) => !insideAnother.has(String(n.id))).map((n) => n.id))
    this.h.requestRender()
    return true
  }

  /** Convert a `$templateInstance` into an editable collapsed **Group** (Macro): inline a fresh copy of
   *  the definition's members, then wrap them in a macro. Now you can expand/edit it inline instead of
   *  diving — the link to the shared definition is dropped (it becomes a one-off group). Returns the
   *  new macro id, or null. */
  convertTemplateInstanceToMacro(id: NodeId): NodeId | null {
    const node = this.h.ed.graph.getNode(id)
    if (!node || !isTemplateInstance(node)) return null
    const title = this.h.renderOpts.get(id)?.title
    // Wrap unpack + re-collapse in a single outer transaction so one Ctrl+Z undoes the whole
    // conversion atomically (the inner methods' transactions join the outer one — without this,
    // undo only rolls back the macro re-collapse and leaves the graph as a sea of inlined members).
    let macroId: NodeId | null = null
    this.h.ed.commandBus.transaction(() => {
      if (!this.unpackTemplateInstance(id)) return // inlines members + selects them
      macroId = this.createMacroFromSelection(undefined, title ?? 'Group') // wraps the selection in a macro
    })
    return macroId
  }

  /** Convert a **Group** (Macro) into a reusable **Template**: dissolve the macro, then extract a
   *  template definition + instance from the FULL subgraph (its direct members + transitively any
   *  nested macros' members). Nested collapsed macros become collapsed Macro nodes inside the
   *  definition — diving into the template, you still see them as groups. Returns the instance id. */
  convertMacroToTemplate(id: NodeId): NodeId | null {
    const node = this.h.ed.graph.getNode(id)
    if (!node || !isMacro(node)) return null
    const title = this.h.renderOpts.get(id)?.title
    // Wrap ungroup + template-extraction in one outer transaction so a single Ctrl+Z atomically
    // restores the original collapsed macro. Without this, undo only rolled back the extraction
    // and left the macro dissolved into loose members across the canvas.
    let instanceId: NodeId | null = null
    this.h.ed.commandBus.transaction(() => {
      if (!this.ungroupMacro(id)) return // dissolves outer macro + selects its direct members
      // Direct members shape the template's interface (their boundary-crossing pins become In/Out
      // boundaries). Nested-macro members are pulled in as HIDDEN (definition-only): they're behind
      // their parent macro's proxy pins so have no real edges, and iterating their pins would mint
      // phantom $templateInput/$templateOutput for every "free-looking" pin. They still must come
      // along — the parent macro references them by id, so leaving them in the outer graph would
      // orphan them.
      //
      // Iteration is IN ORDER of the original macro's `state.members` so the resulting template
      // instance's pins appear in the same order as the macro's proxy pins (A, B, C — not C, B, A
      // from a stack-pop reversal that bit us before).
      const direct = this.h.ed.selection.ids() as NodeId[]
      const directSet = new Set(direct.map(String))
      // Defensive: if `direct` somehow contains BOTH a Macro AND nodes that are members of it
      // (e.g. an unpack→re-collapse cycle left them flat in the outer macro's `state.members`),
      // demote those inner-via-another-macro members to "hidden" so their pins don't double up.
      const memberOfAnotherMacroInDirect = new Set<string>()
      for (const nid of direct) {
        const n = this.h.ed.graph.getNode(nid)
        if (n && isMacro(n)) {
          for (const m of macroMembers(n as Node)) {
            if (directSet.has(String(m))) memberOfAnotherMacroInDirect.add(String(m))
          }
        }
      }
      const interfaceMembers: Node[] = []
      const hidden: Node[] = []
      const seen = new Set<string>()
      // Pass 1 — direct selection in order. Each ends up in `interfaceMembers` unless it's already
      // claimed by another macro in `direct` (then it joins `hidden`).
      for (const nid of direct) {
        if (seen.has(String(nid))) continue
        seen.add(String(nid))
        const n = this.h.ed.graph.getNode(nid)
        if (!n || isTemplateBoundary(n)) continue
        if (memberOfAnotherMacroInDirect.has(String(nid))) hidden.push(n as Node)
        else interfaceMembers.push(n as Node)
      }
      // Pass 2 — BFS into nested macros' members (these weren't in `direct` so they were never
      // selected — but they must come along so the included nested Macro doesn't orphan them).
      const queue: NodeId[] = []
      for (const n of [...interfaceMembers, ...hidden]) {
        if (isMacro(n)) for (const m of macroMembers(n)) queue.push(m)
      }
      while (queue.length) {
        const nid = queue.shift()!
        if (seen.has(String(nid))) continue
        seen.add(String(nid))
        const n = this.h.ed.graph.getNode(nid)
        if (!n || isTemplateBoundary(n)) continue
        hidden.push(n as Node)
        if (isMacro(n)) for (const m of macroMembers(n as Node)) queue.push(m)
      }
      instanceId = this.extractTemplateFromMembers(interfaceMembers, title ?? 'Template', hidden)
    })
    return instanceId
  }

  /** Mint a fresh `$templateInstance` node for a definition (pins materialised from its interface). */
  instantiateTemplateInstance(defId: TemplateDefId, worldPos: { x: number; y: number }): Node | null {
    const def = this.h.definitions.get(defId)
    if (!def) return null
    const { pins, pinBoundary } = materializeInterface(templateInterface(def), createPinId)
    return { id: createNodeId(), type: TEMPLATE_INSTANCE_TYPE, position: { ...worldPos }, state: { definitionId: defId, pinBoundary }, pins }
  }

  /** Insert a fresh instance of a template definition (the palette/insertNode path for a `$template…`
   *  type). Refused if it would create a cycle (instancing the definition we're currently inside, or
   *  one that transitively contains it). */
  insertTemplateInstance(defId: TemplateDefId, worldPos: { x: number; y: number }, opts: { center?: boolean }): Node | null {
    if (this.wouldRecurse(defId)) return null
    const node = this.instantiateTemplateInstance(defId, worldPos)
    if (!node) return null
    const render: RenderNodeOptions = { category: 'macro', title: this.h.definitions.get(defId)!.title }
    if (opts.center) {
      this.h.ensureSize(node, render)
      node.position = { x: worldPos.x - node.size!.x / 2, y: worldPos.y - node.size!.y / 2 }
    }
    this.h.renderOpts.set(node.id, render)
    this.h.ed.commandBus.apply(new AddNode(node))
    this.h.ed.selection.replaceWith([node.id])
    return node
  }

  /** Dive depth — 0 at the root document, 1+ while editing nested template definitions. */
  get diveDepth(): number { return this.h.diveStack.length }

  /** The definitions on the current dive branch — the one being edited plus every ancestor. Inserting
   *  (or diving into) any of these would create a recursive cycle, so they're refused and hidden from
   *  the palette. Read straight from the dive stack so it's correct even before the active definition
   *  is flushed back into #definitions. */
  diveChainDefs(): ReadonlySet<TemplateDefId> {
    const chain = new Set<TemplateDefId>()
    if (this.h.currentDefId !== null) chain.add(this.h.currentDefId)
    for (const f of this.h.diveStack) if (f.defId !== null) chain.add(f.defId)
    return chain
  }

  /** Would inserting an instance of `defId` here create a cycle? True for any definition on the
   *  current dive branch, or one that (already) transitively contains the definition we're inside. */
  wouldRecurse(defId: TemplateDefId): boolean {
    if (this.h.currentDefId === null) return false
    return this.diveChainDefs().has(defId) || templateDefContains(this.h.definitions, defId, this.h.currentDefId)
  }

  /** Enter a `$templateInstance`'s shared definition: the canvas swaps to render the definition's
   *  own graph (members + boundary nodes) on a per-level command bus, so edits land in the definition
   *  and the root is untouched until `diveOut`. Returns false if the node isn't an instance, its
   *  definition is missing, or entering would re-open a definition already in the dive chain. */
  diveInto(instanceId: NodeId): boolean {
    const inst = this.h.displayGraph.getNode(instanceId)
    if (!inst || !isTemplateInstance(inst)) return false
    const defId = inst.state['definitionId'] as TemplateDefId | undefined
    if (defId === undefined) return false
    const def = this.h.definitions.get(defId)
    if (!def) return false
    // No re-entry: refuse a definition already open in the chain, or one that transitively contains
    // the definition we're currently inside (defensive — construction already prevents cycles).
    if (defId === this.h.currentDefId || this.h.diveStack.some((f) => f.defId === defId)) return false
    if (this.h.currentDefId !== null && templateDefContains(this.h.definitions, defId, this.h.currentDefId)) return false

    this.h.diveStack.push({
      graph: this.h.displayGraph, bus: this.h.displayBus,
      selectionIds: this.h.ed.selection.ids().slice() as NodeId[],
      viewport: this.h.viewport.state, defId: this.h.currentDefId,
    })

    // A live graph + per-level bus for the definition. Sharing #coreEvents keeps the command→sync
    // bridge firing against the now-displayed definition graph.
    const g = new Graph()
    for (const n of def.nodes) g.internals()._addNode(n)
    for (const e of def.edges) g.internals()._addEdge(e)
    const bus = new CommandBus({ graph: g, events: this.h.coreEvents })

    this.h.teardownDisplay()
    this.h.ed.selection.clear()
    this.h.displayGraph = g
    this.h.displayBus = bus
    this.h.currentDefId = defId
    this.h.rebuildDisplay()
    this.h.ed.fitView()
    this.updateBreadcrumb()
    this.h.events.emit('dive:changed', { depth: this.h.ed.diveDepth, definitionId: String(defId) })
    return true
  }

  /** Pop out of one or more template definitions. `toDepth` is the dive depth to return to (default:
   *  one level up; 0 returns all the way to the root document). Flushes each edited definition back
   *  into its stored data and re-syncs the affected instances' pins on the parent. */
  diveOut(toDepth = this.h.ed.diveDepth - 1): void {
    if (this.h.diveStack.length === 0) return
    const target = Math.max(0, Math.min(toDepth, this.h.diveStack.length - 1))
    while (this.h.diveStack.length > target) {
      // Resolve wildcard/boundary types on the definition NOW (the per-edit sync is deferred to a
      // microtask that may not have run yet), so the flush captures concrete boundary pin types and
      // the instance pins below pick them up.
      this.h.propagateRerouteTypes()
      this.flushActiveDefinition()
      const leftDefId = this.h.currentDefId
      const frame = this.h.diveStack.pop()!
      this.h.teardownDisplay()
      this.h.ed.selection.clear()
      this.h.displayGraph = frame.graph
      this.h.displayBus = frame.bus
      this.h.currentDefId = frame.defId
      if (leftDefId !== null) this.resyncInstancePins(leftDefId)
      this.h.rebuildDisplay()
      this.h.ed.selection.replaceWith(frame.selectionIds)
      this.h.viewport.setState(frame.viewport)
    }
    this.updateBreadcrumb()
    this.h.events.emit('dive:changed', { depth: this.h.ed.diveDepth, definitionId: this.h.currentDefId !== null ? String(this.h.currentDefId) : null })
    this.h.requestRender()
  }

  /** Write the currently displayed definition's live graph back into its stored `TemplateDefinition`
   *  (so serialization + a later dive see the edits). No-op at the root. */
  flushActiveDefinition(): void {
    if (this.h.currentDefId === null) return
    const def = this.h.definitions.get(this.h.currentDefId)
    if (!def) return
    def.nodes = Array.from(this.h.displayGraph.nodes()) as Node[]
    def.edges = Array.from(this.h.displayGraph.edges()) as Edge[]
  }

  /** Re-derive a definition's interface and update every live instance of it (on the displayed graph)
   *  to match — preserving pin ids for boundary slots that still exist, and pruning edges that
   *  referenced a now-removed instance pin. Run on dive-out, after the parent graph is restored. */
  resyncInstancePins(defId: TemplateDefId): void {
    const def = this.h.definitions.get(defId)
    if (!def) return
    // The interface may have changed (added/renamed boundary nodes) — keep the palette schema current.
    this.registerTemplateSchema(defId)
    const iface = templateInterface(def)
    for (const node of Array.from(this.h.displayGraph.nodes()) as Node[]) {
      if (!isTemplateInstance(node) || node.state['definitionId'] !== defId) continue
      const prevMap = (node.state['pinBoundary'] ?? {}) as Record<string, string>
      const boundaryToPin = new Map<string, string>()
      for (const [pinId, b] of Object.entries(prevMap)) boundaryToPin.set(b, pinId)
      const pins: Pin[] = []
      const pinBoundary: Record<string, string> = {}
      const keptPinIds = new Set<string>()
      for (const slot of iface) {
        const id = (boundaryToPin.get(String(slot.boundary)) ?? String(createPinId())) as PinId
        keptPinIds.add(String(id))
        pins.push({ id, kind: 'data', direction: slot.direction, type: slot.type, multiple: slot.direction === 'out', ...(slot.label !== undefined ? { label: slot.label } : {}) })
        pinBoundary[String(id)] = String(slot.boundary)
      }
      // Drop parent-graph edges that referenced an instance pin the interface no longer has.
      for (const e of Array.from(this.h.displayGraph.edges())) {
        const stale = (e.from.node === node.id && !keptPinIds.has(String(e.from.pin))) || (e.to.node === node.id && !keptPinIds.has(String(e.to.pin)))
        if (stale) this.h.displayGraph.internals()._removeEdge(e.id)
      }
      node.pins = pins
      node.state['pinBoundary'] = pinBoundary
      // Pins changed (added/renamed/removed) → drop the stale size so the next view build refits the
      // box to the new labels. diveOut's #rebuildDisplay re-ensures the view + size right after.
      delete (node as { size?: unknown }).size
    }
  }

  /** Render (or remove) the dive breadcrumb in the overlay root: Root / DefTitle / … — each segment
   *  pops to that depth. Hidden at the root document. */
  updateBreadcrumb(): void {
    if (this.h.ed.diveDepth === 0 || this.h.breadcrumbDisabled || this.h.liveMode) {
      this.h.breadcrumbEl?.remove()
      this.h.breadcrumbEl = null
      return
    }
    if (!this.h.breadcrumbEl) {
      const el = document.createElement('div')
      el.setAttribute('data-xeno-breadcrumb', '')
      Object.assign(el.style, {
        position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '4px', alignItems: 'center',
        pointerEvents: 'auto', font: '500 12px var(--xeno-font, system-ui, sans-serif)',
        color: 'var(--xeno-text, #e8e8e8)', background: 'var(--xeno-panel, rgba(20,22,18,0.82))',
        border: '1px solid var(--xeno-border, rgba(255,255,255,0.12))', borderRadius: 'var(--xeno-radius, 8px)',
        padding: '4px 8px', backdropFilter: 'blur(8px)', zIndex: '20',
      })
      this.h.ed.overlayRoot.appendChild(el)
      this.h.breadcrumbEl = el
    }
    // Trail of displayed definitions from root to current = saved frames' defIds + the current one.
    const trail = [...this.h.diveStack.map((f) => f.defId), this.h.currentDefId]
    this.h.breadcrumbEl.replaceChildren()
    trail.forEach((defId, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.textContent = '›'; sep.style.opacity = '0.5'
        this.h.breadcrumbEl!.appendChild(sep)
      }
      const label = defId === null ? 'Root' : (this.h.definitions.get(defId)?.title ?? 'Template')
      const isCurrent = i === trail.length - 1
      const seg = document.createElement('button')
      seg.textContent = label
      Object.assign(seg.style, {
        all: 'unset', cursor: isCurrent ? 'default' : 'pointer', padding: '0 2px',
        opacity: isCurrent ? '1' : '0.75', fontWeight: isCurrent ? '700' : '500',
      })
      if (!isCurrent) seg.addEventListener('click', () => this.diveOut(i))
      this.h.breadcrumbEl!.appendChild(seg)
    })
  }

  /** Expand a collapsed macro: re-point each proxy edge from the macro pin back to the member pin and
   *  reveal members, with a brief grow-in animation. Idempotent. */
  expandMacro(id: NodeId): void {
    const m = this.h.ed.graph.getNode(id)
    if (!m || !isMacro(m) || !m.state['collapsed']) return
    // Only one open macro per nesting line: collapse any expanded macro that isn't an ancestor of the
    // one being opened (so opening a macro inside another keeps the chain, but opening a sibling closes
    // the previously-open one). Collapse deepest-first to unwind cleanly.
    const stale = [...this.h.ed.graph.nodes()]
      .filter((n) => isMacro(n) && !n.state['collapsed'] && n.id !== id && !this.macroIsAncestor(n.id, id))
      .sort((a, b) => this.macroDepthOf(b.id) - this.macroDepthOf(a.id))
    for (const n of stale) this.setMacroCollapsed(n.id, true)
    // Flag BEFORE the model flip so the resulting sync (which materialises the member + frame views)
    // primes them invisible — otherwise they paint one full frame before the grow-in resets them.
    this.h.expandingMacros.add(id)
    this.setMacroCollapsed(id, false)
    this.tweenViewportToMacroIfNeeded(id)
    this.animateMacroExpand(id)
  }

  /** If the expanded macro's member bbox doesn't sit comfortably inside the current viewport,
   *  animate the camera (pan + zoom) to fit it. Mirrors fitView() math but tweens through it
   *  instead of snapping, so the unfold reads as a continuous gesture. No-op when already in view. */
  tweenViewportToMacroIfNeeded(id: NodeId): void {
    const macro = this.h.ed.graph.getNode(id)
    if (!macro || !isMacro(macro)) return
    const memberIds = macroMembers(macro as Node)
    if (memberIds.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let counted = 0
    for (const mid of memberIds) {
      const n = this.h.ed.graph.getNode(mid)
      if (!n) continue
      const b = nodeBounds(n as Node, this.h.theme.tokens)
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height)
      counted++
    }
    if (counted === 0) return
    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    const screen = { width: Math.max(1, this.h.app.screen.width), height: Math.max(1, this.h.app.screen.height) }
    const cur = this.h.viewport.state
    const edgeMargin = 32
    const tl = worldToScreen({ x: bounds.x, y: bounds.y }, cur)
    const br = worldToScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, cur)
    const fitsCurrent =
      tl.x >= edgeMargin && tl.y >= edgeMargin &&
      br.x <= screen.width - edgeMargin && br.y <= screen.height - edgeMargin
    if (fitsCurrent) return
    const target = fitView(
      bounds, screen,
      { padding: 80, maxZoom: Math.max(cur.zoom, 1), minZoom: this.h.zoomBounds[0] },
    )
    this.tweenViewport(target, 260)
  }

  tweenViewport(target: ViewportState, durationMs: number): void {
    if (this.h.viewportTweenRaf !== null) { cancelAnimationFrame(this.h.viewportTweenRaf); this.h.viewportTweenRaf = null }
    const from = { ...this.h.viewport.state }
    const start = performance.now()
    const tick = (): void => {
      const raw = Math.min(1, (performance.now() - start) / durationMs)
      const e = 1 - Math.pow(1 - raw, 3) // ease-out cubic — matches the macro grow-in
      this.h.viewport.setState({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        zoom: from.zoom + (target.zoom - from.zoom) * e,
      })
      if (raw < 1) this.h.viewportTweenRaf = requestAnimationFrame(tick)
      else { this.h.viewportTweenRaf = null; this.h.viewport.setState(target) }
    }
    this.h.viewportTweenRaf = requestAnimationFrame(tick)
  }
  /** Re-collapse an expanded macro, animating the group shrinking back into the node first. */
  collapseMacro(id: NodeId): void {
    const m = this.h.ed.graph.getNode(id)
    if (!m || !isMacro(m) || m.state['collapsed']) return
    this.animateMacroCollapse(id, () => this.setMacroCollapsed(id, true))
  }

  /** Shrink-out: members + frame collapse toward the macro centre (mirror of the expand grow-in),
   *  then `onDone` flips the model to collapsed. */
  animateMacroCollapse(id: NodeId, onDone: () => void): void {
    const macro = this.h.ed.graph.getNode(id)
    if (!macro) { onDone(); return }
    const cx = macro.position.x + (macro.size?.x ?? 0) / 2
    const cy = macro.position.y + (macro.size?.y ?? 0) / 2
    const members = macroMembers(macro as Node).map((mid) => this.h.views.get(mid)).filter((v): v is NodeView => !!v)
    const frame = this.h.macroFrames.get(id)
    const targets: Container[] = [...members.map((v) => v.container), ...(frame ? [frame.container] : [])]
    if (targets.length === 0) { onDone(); return }
    const origin = new Map<Container, { x: number; y: number }>()
    for (const t of targets) origin.set(t, { x: t.position.x, y: t.position.y })
    const start = performance.now(), dur = 160
    const tick = (): void => {
      const raw = Math.min(1, (performance.now() - start) / dur)
      const e = raw * raw // ease-in
      for (const t of targets) {
        // Mid-animation graph mutation (e.g. AI deleting nodes via MCP) can destroy the container.
        // PIXI nulls its internal `scale` / `position` on destroy; skip rather than crash the tick.
        if (!t.scale || !t.position) continue
        const o = origin.get(t)!
        t.alpha = 1 - e
        t.scale.set(1 - 0.4 * e)
        t.position.set(cx + (o.x - cx) * (1 - e), cy + (o.y - cy) * (1 - e))
      }
      this.h.requestRender()
      if (raw < 1) requestAnimationFrame(tick)
      else { for (const t of targets) { const o = origin.get(t)!; t.alpha = 1; t.scale.set(1); t.position.set(o.x, o.y) } onDone() }
    }
    tick()
  }

  /** Grow-in: after the model expands, fade + scale the revealed members and frame up from the macro
   *  node's centre, so a double-click visibly "unfolds" the group rather than snapping. */
  animateMacroExpand(id: NodeId): void {
    const macro = this.h.ed.graph.getNode(id)
    if (!macro) return
    const cx = macro.position.x + (macro.size?.x ?? 0) / 2
    const cy = macro.position.y + (macro.size?.y ?? 0) / 2
    // Defer one frame so #syncFromGraph has materialised the member views + the frame (primed invisible).
    requestAnimationFrame(() => {
      this.h.expandingMacros.delete(id) // priming done its job; from here the animation owns alpha
      const members = macroMembers(macro as Node).map((mid) => this.h.views.get(mid)).filter((v): v is NodeView => !!v)
      const frame = this.h.macroFrames.get(id)
      const targets: Container[] = [...members.map((v) => v.container), ...(frame ? [frame.container] : [])]
      if (targets.length === 0) return
      const origin = new Map<Container, { x: number; y: number }>()
      for (const t of targets) origin.set(t, { x: t.position.x, y: t.position.y })
      const start = performance.now(), dur = 200
      const tick = (): void => {
        const raw = Math.min(1, (performance.now() - start) / dur)
        const e = 1 - Math.pow(1 - raw, 3) // ease-out cubic
        for (const t of targets) {
          const o = origin.get(t)!
          const s = 0.6 + 0.4 * e
          t.alpha = e
          // lerp position from the macro centre toward its real spot, scaled in.
          t.position.set(cx + (o.x - cx) * e, cy + (o.y - cy) * e)
          t.scale.set(s)
        }
        this.h.requestRender()
        if (raw < 1) requestAnimationFrame(tick)
        else for (const t of targets) { const o = origin.get(t)!; t.alpha = 1; t.scale.set(1); t.position.set(o.x, o.y) }
      }
      tick()
    })
  }
  toggleMacro(id: NodeId): void {
    const m = this.h.ed.graph.getNode(id)
    if (!m || !isMacro(m)) return
    if (m.state['collapsed']) this.expandMacro(id) // animated
    else this.collapseMacro(id)
  }

  /** Materialise declarative collapsed macros loaded from JSON: derive proxy pins + rewire boundary
   *  edges, deepest-nested first so an inner macro is already a collapsed node (with pins) before an
   *  outer macro computes its own boundary. Operates on pure model state (called before views exist). */
  materializeLoadedMacros(): void {
    const macros = [...this.h.ed.graph.nodes()].filter(
      (n) => isMacro(n) && n.state['collapsed'] && (n.pins?.length ?? 0) === 0,
    ) as Node[]
    if (macros.length === 0) return
    const parentOf = (nid: NodeId): Node | undefined => {
      for (const n of this.h.ed.graph.nodes()) if (isMacro(n) && macroMembers(n as Node).includes(nid)) return n as Node
      return undefined
    }
    const depthOf = (id: NodeId): number => { let d = 0, p = parentOf(id); while (p) { d++; p = parentOf(p.id) } return d }
    macros.sort((a, b) => depthOf(b.id) - depthOf(a.id)) // deepest first
    for (const macro of macros) {
      const members = macroMembers(macro)
      if (members.length === 0) continue
      const edges = [...this.h.ed.graph.edges()] as Edge[]
      // Same widget-pin lift as `createMacroFromSelection` — keep both paths consistent so a macro
      // built via group-from-selection and one rebuilt here (template extraction etc.) have the
      // same pin surface for the same members.
      const incomingByPin = new Set<string>()
      for (const e of edges) incomingByPin.add(String(e.to.pin))
      const liftPins: { node: NodeId; pin: PinId }[] = []
      for (const id of members) {
        const n = this.h.ed.graph.getNode(id) as Node | undefined
        if (!n) continue
        for (const lift of disconnectedWidgetBoundPins(n, (pid) => incomingByPin.has(String(pid)))) liftPins.push(lift)
      }
      const plan = planMacroCollapse(macro.id, members, edges, (n, p) => this.pinInfo(n, p), { pin: createPinId, edge: createEdgeId }, { liftPins })
      macro.pins = plan.pins
      macro.state['proxyMap'] = plan.proxyMap as unknown
      // Size was measured with the (then empty) pin list — recompute now that proxy pins exist, else
      // the pins overflow a too-short node body.
      delete (macro as { size?: unknown }).size
      this.h.ensureSize(macro, this.h.renderOpts.get(macro.id) ?? {})
      for (const eid of plan.disconnect) this.h.ed.graph.internals()._removeEdge(eid)
      for (const e of plan.connect) this.h.ed.graph.internals()._addEdge(e)
    }
  }

  pinInfo(node: NodeId, pin: PinId): { type: string; label?: string } {
    const n = this.h.ed.graph.getNode(node)
    const p = n?.pins.find((pp) => String(pp.id) === String(pin))
    return { type: String(p?.type ?? 'any'), ...(p?.label !== undefined ? { label: p.label } : {}) }
  }

  findEdge(from: { node: NodeId; pin: PinId }, to: { node: NodeId; pin: PinId }): Edge | undefined {
    for (const e of this.h.ed.graph.edges()) {
      if (e.from.node === from.node && String(e.from.pin) === String(from.pin) &&
          e.to.node === to.node && String(e.to.pin) === String(to.pin)) return e as Edge
    }
    return undefined
  }

  /** Toggle a macro between collapsed (edges on the macro proxy pins) and expanded (edges back on the
   *  member pins). Pins are fixed for the macro's lifetime — we only re-point the boundary edges. */
  setMacroCollapsed(id: NodeId, collapsed: boolean): void {
    const macro = this.h.ed.graph.getNode(id)
    if (!macro || !isMacro(macro) || !!macro.state['collapsed'] === collapsed) return
    const proxyMap = (macro.state['proxyMap'] ?? []) as MacroProxyRecord[]
    this.h.ed.commandBus.transaction(() => {
      for (const r of proxyMap) {
        const mem = { node: r.memberNode, pin: r.memberPin }
        const macroEnd = { node: id, pin: r.macroPin }
        const nextEnd = collapsed ? macroEnd : mem
        const prevEnd = collapsed ? mem : macroEnd
        // RESOLVE THE EXTERNAL ENDPOINT FROM THE CURRENT EDGE, NOT FROM THE PROXY-MAP SNAPSHOT.
        // The snapshot `r.externalNode/Pin` was recorded at macro-creation time; if the external
        // node was later wrapped into a template (or any other rewiring touched it), the snapshot
        // is stale and findEdge against it returns null → we'd create a phantom edge to a node
        // that no longer exists in the graph. Instead, look up the current edge by prevEnd alone.
        let cur: Edge | undefined
        for (const e of this.h.ed.graph.edges()) {
          const ee = e as Edge
          if (r.direction === 'in') {
            if (ee.to.node === prevEnd.node && String(ee.to.pin) === String(prevEnd.pin)) { cur = ee; break }
          } else {
            if (ee.from.node === prevEnd.node && String(ee.from.pin) === String(prevEnd.pin)) { cur = ee; break }
          }
        }
        if (!cur) continue
        const currentExt = r.direction === 'in' ? cur.from : cur.to
        this.h.ed.commandBus.apply(new DisconnectEdge(cur.id))
        const next: Edge = r.direction === 'in'
          ? { id: createEdgeId(), from: currentExt, to: nextEnd }
          : { id: createEdgeId(), from: nextEnd, to: currentExt }
        this.h.ed.commandBus.apply(new ConnectPins(next))
      }
      this.h.ed.commandBus.apply(new SetNodeState(id, { collapsed }))
    })
  }

  /** Hide member views/edges of collapsed macros, and hide the macro node itself while EXPANDED (a
   *  themed frame stands in for it). Called after each graph sync; cheap (touches only live views). */
  applyMacroVisibility(): void {
    const hidden = new Set<NodeId>()
    const expandedMacros = new Set<NodeId>()
    for (const n of this.h.ed.graph.nodes()) {
      if (!isMacro(n)) continue
      if (n.state['collapsed']) for (const m of macroMembers(n as Node)) hidden.add(m)
      else expandedMacros.add(n.id)
    }
    this.h.hiddenMembers = hidden
    for (const [nid, view] of this.h.views) view.container.visible = !hidden.has(nid) && !expandedMacros.has(nid)
    for (const [eid, rec] of this.h.edgeRecords) {
      const e = this.h.ed.graph.getEdge(eid)
      rec.graphics.visible = !(e !== undefined && (hidden.has(e.from.node) || hidden.has(e.to.node)))
    }
    this.syncMacroFrames(expandedMacros)
    this.reparentMacros()
    // Prime freshly-expanding macros invisible (members + frame) so #animateMacroExpand fades them in
    // from nothing — runs in the sync microtask, i.e. before the first paint, so there's no flash.
    for (const eid of this.h.expandingMacros) {
      const macro = this.h.ed.graph.getNode(eid)
      if (!macro) continue
      for (const mid of macroMembers(macro as Node)) { const v = this.h.views.get(mid); if (v) v.container.alpha = 0 }
      const f = this.h.macroFrames.get(eid); if (f) f.container.alpha = 0
    }
  }

  /** Keep macro z-order correct: an EXPANDED macro's frame + members reparent into #macroOverlayLayer
   *  (above all ordinary nodes) so the whole group reads as one thing on top; a COLLAPSED macro's node
   *  rises to the top of #nodesLayer. Nested macros stack by depth (deeper → on top). */
  /** Member → owning macro index. Rebuilt lazily; invalidated whenever the graph mutates (add/
   *  remove node, SetNodeState — covers `state.members` edits). Without this, every macro lookup
   *  was O(N) → `reparentMacros` ran O(M·N) per sync, which is what melts 37k-node paste. */
  invalidateMacroIndex(): void { this.h.macroParentIndex = null }
  rebuildMacroIndex(): Map<NodeId, NodeId> {
    const idx = new Map<NodeId, NodeId>()
    for (const n of this.h.ed.graph.nodes()) {
      if (!isMacro(n)) continue
      for (const m of macroMembers(n as Node)) idx.set(m, n.id as NodeId)
    }
    this.h.macroParentIndex = idx
    return idx
  }
  ensureMacroIndex(): Map<NodeId, NodeId> { return this.h.macroParentIndex ?? this.rebuildMacroIndex() }

  /** The macro whose member list contains `nid` (its immediate container), or undefined. O(1). */
  macroParentOf(nid: NodeId): Node | undefined {
    const idx = this.ensureMacroIndex()
    const pid = idx.get(nid)
    return pid !== undefined ? (this.h.ed.graph.getNode(pid) as Node | undefined) : undefined
  }
  /** Nesting depth of a node (how many macros transitively contain it). O(depth). */
  macroDepthOf(id: NodeId): number {
    const idx = this.ensureMacroIndex()
    let d = 0, p: NodeId | undefined = idx.get(id)
    while (p !== undefined) { d++; p = idx.get(p) }
    return d
  }
  /** Is `ancestor` a (transitive) container of `id`? O(depth). */
  macroIsAncestor(ancestor: NodeId, id: NodeId): boolean {
    const idx = this.ensureMacroIndex()
    let p: NodeId | undefined = idx.get(id)
    while (p !== undefined) { if (p === ancestor) return true; p = idx.get(p) }
    return false
  }
  /** Deepest currently-expanded macro (the innermost open one) — what a click-outside collapses first. */
  deepestExpandedMacro(): NodeId | null {
    let best: NodeId | null = null, bestD = -1
    for (const n of this.h.ed.graph.nodes()) {
      if (!isMacro(n) || n.state['collapsed']) continue
      const d = this.macroDepthOf(n.id)
      if (d > bestD) { bestD = d; best = n.id }
    }
    return best
  }

  reparentMacros(): void {
    const depthOf = (id: NodeId): number => this.macroDepthOf(id)

    const overlayMembers = new Map<NodeId, number>() // member id → owner macro depth
    const overlayFrames: { id: NodeId; depth: number }[] = []
    const collapsedMacros: { id: NodeId; depth: number }[] = []
    for (const n of this.h.ed.graph.nodes()) {
      if (!isMacro(n)) continue
      const depth = depthOf(n.id)
      if (n.state['collapsed']) collapsedMacros.push({ id: n.id, depth })
      else {
        for (const mid of macroMembers(n as Node)) overlayMembers.set(mid, depth)
        overlayFrames.push({ id: n.id, depth })
      }
    }
    // Reparent node views: expanded-macro members → overlay, everything else → the node layer.
    for (const [nid, view] of this.h.views) {
      const target = overlayMembers.has(nid) ? this.h.macroOverlayLayer : this.h.nodesLayer
      if (view.container.parent !== target) target.addChild(view.container)
    }
    // Expanded frames → overlay too (collapsed/removed frames stay/are gone in #macroFramesLayer).
    for (const f of overlayFrames) {
      const fr = this.h.macroFrames.get(f.id)
      if (fr && fr.container.parent !== this.h.macroOverlayLayer) this.h.macroOverlayLayer.addChild(fr.container)
    }
    // Any edge incident to an overlay member → overlay (so its whole length, including the stub from
    // the frame edge to the inlet pin, draws inside the expanded macro above the frame). Boundary
    // edges (one end external) ride over the scene briefly — acceptable for a thin wire.
    const overlayEdges: Container[] = []
    for (const [eid, rec] of this.h.edgeRecords) {
      const e = this.h.ed.graph.getEdge(eid)
      const inside = !!e && (overlayMembers.has(e.from.node) || overlayMembers.has(e.to.node))
      const target = inside ? this.h.macroOverlayLayer : this.h.edgesLayer
      if (rec.graphics.parent !== target) target.addChild(rec.graphics)
      if (inside) overlayEdges.push(rec.graphics)
    }
    // Order inside the overlay: frames (backgrounds) → member wires → member nodes; deeper on top.
    const order: Container[] = []
    overlayFrames.sort((a, b) => a.depth - b.depth)
    for (const f of overlayFrames) { const fr = this.h.macroFrames.get(f.id); if (fr) order.push(fr.container) }
    order.push(...overlayEdges)
    const members = [...overlayMembers].sort((a, b) => a[1] - b[1])
    for (const [mid] of members) { const v = this.h.views.get(mid); if (v) order.push(v.container) }
    order.forEach((c, i) => this.h.macroOverlayLayer.setChildIndex(c, i))
    // Collapsed macro nodes rise above ordinary nodes (shallowest first → deepest on top).
    collapsedMacros.sort((a, b) => a.depth - b.depth)
    for (const m of collapsedMacros) {
      const v = this.h.views.get(m.id)
      if (v?.container.visible && v.container.parent === this.h.nodesLayer) {
        this.h.nodesLayer.setChildIndex(v.container, this.h.nodesLayer.children.length - 1)
      }
    }
  }

  /** Reconcile expanded-macro frame views: a themed rectangle behind each expanded macro's members,
   *  sized to their bounds. Double-click the header to collapse. */
  /** World-space rect of an expanded macro's frame (members bounds + padding + header strip). */
  macroFrameRect(id: NodeId): { x: number; y: number; width: number; height: number } | null {
    const macro = this.h.ed.graph.getNode(id)
    if (!macro) return null
    const members = macroMembers(macro as Node).map((m) => this.h.ed.graph.getNode(m)).filter((n): n is Node => !!n)
    if (members.length === 0) return null
    const pad = 18, headerH = this.h.theme.tokens.geometry.comment.headerHeight
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const m of members) {
      const b = nodeBounds(m, this.h.theme.tokens)
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height)
    }
    return { x: minX - pad, y: minY - pad - headerH, width: (maxX - minX) + pad * 2, height: (maxY - minY) + pad * 2 + headerH }
  }

  syncMacroFrames(expandedMacros: ReadonlySet<NodeId>): void {
    for (const id of expandedMacros) {
      const rect = this.macroFrameRect(id)
      if (!rect) continue
      let frame = this.h.macroFrames.get(id)
      if (!frame) {
        frame = renderMacroFrame(this.h.theme.tokens, this.h.theme.commentHeaderStyle ?? 'gradient')
        this.h.macroFramesLayer.addChild(frame.container)
        this.wireMacroFrame(id, frame)
        this.h.macroFrames.set(id, frame)
      }
      frame.update(rect, this.h.renderOpts.get(id)?.title ?? 'Macro')
    }
    for (const [id, frame] of [...this.h.macroFrames]) {
      if (!expandedMacros.has(id)) { frame.destroy(); this.h.macroFrames.delete(id) }
    }
  }

  wireMacroFrame(id: NodeId, frame: MacroFrameView): void {
    // Click in THIS frame's body, outside a deeper open child macro → collapse the child (one level
    // per click). So clicking the parent group's empty body closes the sub-group nested inside it.
    frame.body.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button !== 0 || !this.h.interactive) return
      const deepest = this.deepestExpandedMacro()
      if (deepest && deepest !== id && this.macroIsAncestor(id, deepest)) {
        this.collapseMacro(deepest)
        e.stopPropagation()
      }
    })
    frame.header.on('pointerover', () => { frame.setState('hover'); this.h.requestRender() })
    frame.header.on('pointerout', () => { frame.setState('default'); this.h.requestRender() })
    frame.header.on('pointerdown', (e: FederatedPointerEvent) => {
      if (e.button !== 0 || !this.h.interactive) return
      e.stopPropagation()
      const now = performance.now()
      // Double-click the header to rename (collapse is via click-outside). Like a comment header.
      if (now - this.h.macroFrameLastTap < 320) { this.h.macroFrameLastTap = 0; requestAnimationFrame(() => this.editMacroTitle(id)); return }
      this.h.macroFrameLastTap = now
    })
  }

  /** Inline-rename an expanded macro via the same transparent overlay the comment header uses — the
   *  live glyphs are the frame's WebGL title, so no jump. Commits to the macro's render title. */
  editMacroTitle(id: NodeId): void {
    const frame = this.h.macroFrames.get(id)
    const rect = this.macroFrameRect(id)
    if (!frame || !rect) return
    const vp = this.h.viewport.state
    const t = this.h.theme.tokens, ct = t.typography.comment
    const headerH = t.geometry.comment.headerHeight
    const current = this.h.renderOpts.get(id)?.title ?? 'Macro'
    this.h.ensureWidgetOverlay().editText({
      rect: { x: rect.x * vp.zoom + vp.x + 2 * vp.zoom, y: rect.y * vp.zoom + vp.y + 2 * vp.zoom, width: rect.width * vp.zoom - 4 * vp.zoom, height: headerH * vp.zoom - 4 * vp.zoom },
      value: current,
      style: {
        background: 'transparent', text: 'transparent', border: 'transparent', borderWidth: 0, radius: 0,
        paddingX: 8 * vp.zoom, paddingY: 2 * vp.zoom, fontSize: ct.size * vp.zoom,
        fontFamily: t.typography.fontFamily, fontWeight: '700', placeholder: '', selection: 'transparent',
      },
      caretColor: ct.color, selectAll: false, autoGrow: true,
      onInput: (text: string) => { this.h.macroFrames.get(id)?.update(this.macroFrameRect(id) ?? rect, text); this.h.requestRender() },
      onCommit: (text: string) => {
        const r = this.h.renderOpts.get(id) ?? {}; r.title = text; this.h.renderOpts.set(id, r)
        // Rebuild the collapsed node view so the renamed title shows when collapsed too.
        const v = this.h.views.get(id)
        if (v) { v.container.destroy({ children: true }); this.h.views.delete(id) }
        const node = this.h.ed.graph.getNode(id)
        if (node) this.h.ensureView(node as Node)
        this.applyMacroVisibility()
        this.h.requestRender()
      },
    })
  }

  /** Inline-rename a node's title (header). For a `$templateInstance` this renames its definition
   *  (propagates to all instances + palette); for a `$templateInput`/`$templateOutput` boundary it
   *  also relabels the single interface pin so the rename flows to instance pins on dive-out; for any
   *  other node it just sets the displayed title. */
  editNodeTitle(id: NodeId): void {
    const node = this.h.ed.graph.getNode(id)
    const view = this.h.views.get(id)
    if (!node || !view || !node.size) return
    const vp = this.h.viewport.state
    const t = this.h.theme.tokens
    const headerH = t.geometry.node.headerHeight
    const heading = t.typography.heading
    // Exact title-glyph inset (mirrors node-renderer) so the DOM caret lands on the WebGL title — no
    // jump on enter.
    const chevron = t.geometry.header.chevronSize
    const titleStartX = t.geometry.node.headerPadding + 8 + chevron / 2 - 4 + chevron / 2 + t.geometry.header.titleGap
    const original = this.h.renderOpts.get(id)?.title ?? node.type
    let committed = false
    // Comment-rename mechanic: the DOM field's TEXT is transparent — the visible glyphs are the LIVE
    // WebGL title (updated per keystroke, un-ellipsised via fullTitle), so zero font/position jump;
    // only the caret shows. autoGrow lets the field + caret run past the node.
    this.renderNodeTitleLive(id, original, true)
    this.h.ensureWidgetOverlay().editText({
      rect: {
        x: node.position.x * vp.zoom + vp.x + titleStartX * vp.zoom,
        y: node.position.y * vp.zoom + vp.y + 2 * vp.zoom,
        width: Math.max(40, node.size.x - titleStartX - 8) * vp.zoom,
        height: (headerH - 4) * vp.zoom,
      },
      value: original,
      style: {
        background: 'transparent', text: 'transparent', border: 'transparent', borderWidth: 0, radius: 0,
        paddingX: 0, paddingY: 0, fontSize: heading.size * vp.zoom,
        fontFamily: t.typography.fontFamily, fontWeight: '700', placeholder: '', selection: 'transparent',
      },
      caretColor: heading.color, selectAll: false, autoGrow: true,
      onInput: (text: string) => this.renderNodeTitleLive(id, text, true),
      onCommit: (text: string) => { committed = true; const v = text.trim(); if (v !== '') this.commitNodeRename(id, v); else { this.renderNodeTitleLive(id, original, false); this.resizeNodeView(id) } },
      onClose: () => { if (!committed) { this.renderNodeTitleLive(id, original, false); this.resizeNodeView(id) } },
    })
  }

  /** Set a node's displayed title (optionally un-ellipsised) and rebuild its view, no size recompute —
   *  drives the live preview during inline rename. */
  renderNodeTitleLive(id: NodeId, title: string, full: boolean): void {
    const r = this.h.renderOpts.get(id) ?? {}; r.title = title
    if (full) r.fullTitle = true; else delete r.fullTitle
    this.h.renderOpts.set(id, r)
    const node = this.h.ed.graph.getNode(id), v = this.h.views.get(id)
    if (node && v) { v.container.destroy({ children: true }); this.h.views.delete(id); this.h.ensureView(node as Node) }
    this.h.requestRender()
  }

  /** Recompute a node's natural size from its current title/pins/widgets and rebuild its view —
   *  call after a rename or an interface change so the box grows/shrinks to fit. */
  resizeNodeView(id: NodeId): void {
    const node = this.h.ed.graph.getNode(id)
    if (!node) return
    delete (node as { size?: unknown }).size
    this.h.ensureSize(node as Node, this.h.renderOpts.get(id) ?? {})
    const v = this.h.views.get(id)
    if (v) { v.container.destroy({ children: true }); this.h.views.delete(id) }
    this.h.ensureView(node as Node)
    this.h.requestRender()
  }

  commitNodeRename(id: NodeId, text: string): void {
    const node = this.h.ed.graph.getNode(id)
    if (!node) return
    // Drop the edit-only fullTitle flag so the committed title ellipsises normally again.
    const ro = this.h.renderOpts.get(id); if (ro) delete ro.fullTitle
    if (isTemplateInstance(node)) {
      const defId = node.state['definitionId'] as TemplateDefId | undefined
      if (defId !== undefined) this.renameTemplate(defId, text)
      return
    }
    const r = this.h.renderOpts.get(id) ?? {}; r.title = text; this.h.renderOpts.set(id, r)
    // A boundary node's title doubles as its interface pin's label.
    if (isTemplateBoundary(node) && node.pins[0]) node.pins[0].label = text
    this.resizeNodeView(id)
  }
}
