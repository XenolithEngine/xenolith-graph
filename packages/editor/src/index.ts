import { Application, BitmapFontManager, Color, Container, EventEmitter as PixiEventEmitter, Graphics, Rectangle, RenderTexture, Sprite, Text, Texture, TilingSprite, type ColorSource, type ContainerChild } from 'pixi.js'
import {
  AddNode,
  CommandBus,
  ConnectPins,
  DisconnectEdge,
  EventEmitter,
  Graph,
  MoveNode,
  AddComment,
  RemoveComment,
  SetCommentText,
  createCommentId,
  NodeRegistry,
  TypeRegistry,
  RemoveNode,
  Selection,
  SetNodeState,
  isReroute,
  createReroute,
  SetNodePins,
  SetNodeWidgets,
  rerouteNodeSchema,
  REROUTE_NODE_TYPE,
  isMacro,
  macroMembers,
  flattenMacroProxies,
  flattenAllTemplateInstances,
  type MacroProxyRecord,
  flattenTemplateInstance,
  type FlattenedTemplate,
  isTemplateInstance,
  isTemplateBoundary,
  TEMPLATE_INPUT_TYPE,
  TEMPLATE_OUTPUT_TYPE,
  type TemplateDefId,
  type TemplateDefinition,
  createEdgeId,
  createNodeId,
  createPinId,
  clampWidgetValue,
  widgetValue,
  widgetBindKey,
  widgetVisibility,
  migrateNodePayload,
  type CoreEvents,
  type WidgetStyle,
  type Edge,
  type EdgeId,
  type Node,
  type NodeId,
  type Comment,
  type CommentId,
  type Pin,
  type PinId,
  type PinKind,
  type PinDirection,
  type WidgetSpec,
  type NodeSchema,
  type PinSchema,
  type NodeGlyph,
} from '@xenolithengine/graph-core'
import {
  bezierMidpoint,
  clearGlowTextureCache,
  clearGradientCache,
  computeEdgePath,
  computeNodeLayout,
  computeOverlapBackdropPlan,
  findPinByKey,
  createGridSprite,
  createPixiTextMeasurer,
  drawEdge,
  mergeEdgeOptions,
  measureNodeSize,
  InteractionManager,
  nodeBounds,
  rectIntersects,
  renderNode,
  IconRegistry,
  type MacroFrameView,
  resolveCategoryGradient,
  renderRerouteNode,
  renderRerouteNodeBox,
  rerouteSize,
  rerouteBoxSize,
  fitView,
  resolvePinFill,
  screenToWorld,
  worldToScreen,
  snapToGrid,
  shouldVirtualize,
  visibleWorldRect,
  lodLevel,
  cellKey,
  cellsForRect,
  type LODLevel,
  type LODThresholds,
  Viewport,
  xenTheme,
  resolveWidgetStyle,
  themeCssVars,
  type CustomWidgetController,
  type NodeView,
  type PinLayout,
  type RenderEdgeOptions,
  type RenderNodeOptions,
  type GraphCategoryPalette,
  type NodeSizeTokens,
  type TextMeasurer,
  type ThemeRenderContext,
  type GeomRect,
  type ViewportState,
  type XenolithTheme,
  type ZoomBounds,
} from '@xenolithengine/graph-render-pixi'
import { mergeTheme, type DeepPartial, type XenTokens } from '@xenolithengine/graph-theme-xen'
import { loadFonts, type FontUrlMap } from './fonts.js'
import { canConnect } from './pin-compat.js'
import { CommandRegistry } from './commands-registry.js'
import { SidebarManager } from './sidebar.js'
import { CommentController } from './comments-controller.js'
import { Subgraph } from './subgraph.js'
import { PointerController } from './pointer-controller.js'
import { DomWidgetLayer } from './dom-widgets.js'
import { ExportController } from './export.js'
import { PaletteSidebar, type PaletteSidebarOpts } from './palette-sidebar.js'
import { computeRerouteBridges } from './reroute-bridge.js'
import { spliceCompatible, danglingRerouteRemovalPlan } from './edge-insert.js'
import { InsertPalette } from './palette.js'
import { SearchPalette } from './search-palette.js'
import { findNodesIn, type FindNodesQuery, type FoundNode } from './find-nodes.js'
import { nearestNodeInDirection, type NavNodeRect } from './keyboard-nav.js'
import { pruneOrphanInlineReroutes } from './clipboard-prune.js'
import { EdgeContextMenu, type EdgeMenuItem } from './edge-menu.js'
import { ContextMenuRegistry } from './context-menu.js'
import type { WidgetOverlay } from './widget-overlay.js'
import { Minimap, type MinimapPosition } from './minimap.js'
import { EditorControls, type ControlsOptions } from './controls.js'
import { createGraphEventBridge, firePreventable, type EditorEvents } from './events.js'
import type { McpClient, McpEditorSurface } from './mcp.js'
import { layeredLayout } from './layout-ops.js'
import { resolvePin, type PinSelector } from './pin-resolve.js'
import {
  applyChangesToBus, createControlledBridge, documentReplacedChanges, snapshotGraph,
  type GraphChanges, type GraphMirror,
} from './controlled.js'
import { PluginHost, type PluginContext, type XenolithPlugin } from './plugin.js'
import {
  parseXenolithGraph,
  serializeXenolithGraph,
  type XenolithGraphV1,
} from './serialize.js'
import { importFromReactFlow, type ImportReactFlowOptions, type ImportReport } from './import-reactflow.js'

export {
  parseXenolithGraph,
  serializeXenolithGraph,
  XENOLITH_GRAPH_VERSION,
} from './serialize.js'
export { importFromReactFlow } from './import-reactflow.js'
export {
  reduceGraphChanges, snapshotGraph,
  type GraphChanges, type NodeChange, type EdgeChange, type GraphMirror,
} from './controlled.js'
export { ProposalQueue, AuditLog, buildHandlers } from './mcp.js'
export type {
  ProposalEntry, ProposalApproveResult, AuditEntry, AuditEffectDelta,
  ToolHandler, McpEditorSurface, BuildHandlersOptions,
} from './mcp.js'
export { ProposalsPanel } from './proposals-panel.js'
export type { ProposalsPanelOpts } from './proposals-panel.js'
export type {
  ReactFlowGraph,
  ReactFlowNode,
  ReactFlowEdge,
  ImportReactFlowOptions,
  ImportReport,
} from './import-reactflow.js'
export type {
  XenolithGraphV1,
  XenolithNodeV1,
  XenolithPinV1,
  XenolithEdgeV1,
  XenolithCommentV1,
  XenolithTemplateV1,
  XenolithGraphVersion,
} from './serialize.js'

export { NodeRegistry } from '@xenolithengine/graph-core'
export type { NodeSchema, PinSchema, NodeSearchResult, WidgetSpec, WidgetStyle, WidgetType, Node, Edge, NodeId, EdgeId, PinId } from '@xenolithengine/graph-core'
export type { CustomWidgetController, CanvasWidgetController, DomWidgetController, CustomWidgetContext, ViewportState } from '@xenolithengine/graph-render-pixi'
export type { MinimapPosition } from './minimap.js'
export type { FindNodesQuery, FoundNode } from './find-nodes.js'
export type { ControlsOptions, ControlsPosition } from './controls.js'
export type { EditorEvents, PreventablePayload } from './events.js'
export { CommandRegistry, Commands } from './commands-registry.js'
export { StepDebugger } from './step-debugger.js'
export {
  BUILTIN_RECIPES, createRecipeRegistry, instantiateRecipe,
  type RecipeDef, type RecipeNodeDef, type RecipeEdgeDef, type RecipeRegistry, type InstantiateResult,
} from './recipes.js'
export type { StepExecutor, StepRecord, StepDebuggerStatus, StepDebuggerEvents } from './step-debugger.js'
export { diffGraphs } from './graph-diff.js'
export { ContextMenuRegistry, type ContextMenuItemSpec, type ContextMenuTarget } from './context-menu.js'
export type { GraphDiff, DiffSnapshot, DiffSnapshotNode, DiffSnapshotEdge, DiffOptions } from './graph-diff.js'
export type { CommandSpec, HotkeySpec, CommandId } from './commands-registry.js'
export { SidebarManager } from './sidebar.js'
export type { SidebarManagerOpts } from './sidebar.js'
export { PluginHost } from './plugin.js'
export type { XenolithPlugin, PluginContext } from './plugin.js'
export type { FlattenedTemplate, PinRef } from '@xenolithengine/graph-core'

export const VERSION = '0.7.0-beta.7'


export interface XenolithEditorOptions {
  /** Full theme (Xen, Daylight, Liquid Glass) or a partial token override merged into Xen.
   *  Swap at runtime with `editor.setTheme(...)`. */
  theme?: XenolithTheme | DeepPartial<XenTokens>
  background?: string
  resizeToWindow?: boolean
  renderer?: 'webgl' | 'webgpu'
  viewport?: ViewportState
  zoomBounds?: ZoomBounds
  disableInteraction?: boolean
  disableGrid?: boolean
  /** Snap cell size in world pixels when dragging. Hold Alt during drag to disable. Default: 8. */
  snap?: number
  /** Show the overview minimap. `true` uses the default (bottom-right) placement; pass an object to
   *  set the corner/edge anchor or exact screen coordinates. Toggle later via `setMinimapVisible`. */
  minimap?: boolean | { position?: MinimapPosition }
  /** Show the built-in viewport controls (zoom / fit / reset / undo·redo / save / lock). `true` uses
   *  defaults; pass an object for position/orientation/which buttons. Toggle later via `setControls`. */
  controls?: boolean | ControlsOptions
  /** Custom connection guard, on top of the built-in type check. Return `false` to reject a wire.
   *  Receives the normalised out→in endpoints. Pair with `wouldCreateCycle` to forbid cycles.
   *  Update at runtime via `setIsValidConnection`. */
  isValidConnection?: (connection: ConnectionRequest) => boolean
  /** Self-hosted font URL overrides — map keyed by `<family>|<weight>[|<style>]`.
   *  Example: `{ 'Inter|400': '/fonts/Inter-Regular.woff2' }`. Anything not provided here is
   *  fetched from Google Fonts (the default). Update at runtime via `editor.fonts.selfHost(...)`. */
  fontUrls?: FontUrlMap
}

/** A would-be connection, normalised to out → in, passed to `isValidConnection`. */
export interface ConnectionRequest {
  source: NodeId
  sourcePin: PinId
  target: NodeId
  targetPin: PinId
}

/** Per-node execution status, surfaced as a coloured ring. `running` pulses; `idle` clears it.
 *  Lets a host show graph-execution progress (LLM/audio/pipeline showcases) without a runtime. */
export type NodeStatus = 'idle' | 'running' | 'ok' | 'error'

/** Plain structural snapshot of a node for a host interpreter (no PIXI/view data). */
export interface SnapshotNode {
  id: string
  type: string
  state: Record<string, unknown>
  pins: { id: string; kind: PinKind; direction: PinDirection; type: string; default?: unknown }[]
}
export interface SnapshotEdge {
  from: { node: string; pin: string }
  to: { node: string; pin: string }
}
/** A flat, structural view of the graph for execution — see {@link XenolithEditor.graphSnapshot}. */
export interface GraphSnapshot {
  nodes: SnapshotNode[]
  edges: SnapshotEdge[]
}

function resolveTheme(input: XenolithTheme | DeepPartial<XenTokens> | undefined): XenolithTheme {
  if (!input) return xenTheme
  if (typeof input === 'object' && 'id' in input && 'tokens' in input) return input as XenolithTheme
  return { id: 'xen-custom', tokens: mergeTheme(xenTheme.tokens, input as DeepPartial<XenTokens>) }
}

interface EdgeRecord {
  edge: Edge
  graphics: Graphics
  opts: RenderEdgeOptions
  /** Midpoint label Text, created on demand when `opts.label` is set. */
  label?: Text | undefined
  /** Cached endpoint coords of the last drawn path. If the next frame's endpoints match these,
   *  the bezier path hasn't moved and we can skip the redraw entirely — the dominant cost on
   *  edge-heavy graphs where most edges are static between frames. */
  lastFromX?: number | undefined
  lastFromY?: number | undefined
  lastToX?:   number | undefined
  lastToY?:   number | undefined
}

/** Reserved palette type that inserts a comment frame instead of a node. Lives in `#builtins` so it
 *  shows up in the standard insert search; `#insertFromPalette` intercepts it. */
const COMMENT_PALETTE_TYPE = '$comment'
const commentPaletteSchema: NodeSchema = {
  type: COMMENT_PALETTE_TYPE,
  title: 'Comment',
  category: 'Layout',
  description: 'Group nodes in a labelled frame',
  keywords: ['comment', 'group', 'frame', 'note', 'section'],
  pins: [],
}

/** Boundary nodes that declare a template definition's interface — insert one while dived into a
 *  template (Tab → "Input"/"Output"), wire it to a member, and on dive-out it becomes an instance
 *  pin (Blender Group Input/Output style). Rename it (node menu) to label the interface pin. */
const templateInputSchema: NodeSchema = {
  type: TEMPLATE_INPUT_TYPE,
  title: 'Input',
  category: 'utility',
  description: 'Template interface input',
  keywords: ['input', 'port', 'arg', 'parameter', 'template'],
  // The pin's label IS the interface-pin label (rename relabels it); default so a fresh Input/Output
  // gives the instance a labelled pin instead of a blank one.
  pins: [{ kind: 'data', direction: 'out', type: 'any', multiple: true, label: 'In' }],
}
const templateOutputSchema: NodeSchema = {
  type: TEMPLATE_OUTPUT_TYPE,
  title: 'Output',
  category: 'utility',
  description: 'Template interface output',
  keywords: ['output', 'port', 'return', 'result', 'template'],
  pins: [{ kind: 'data', direction: 'in', type: 'any', multiple: false, label: 'Out' }],
}

interface ClipboardSnapshot {
  nodes: Node[]
  edges: Edge[]
  comments: Comment[]
  renderOpts: Map<NodeId, RenderNodeOptions>
  edgeOpts:   Map<EdgeId, RenderEdgeOptions>
}

/** Multiply a colour's RGB by `f` (<1 darkens) — used to tone down LOD node fills. */
/** Coerce loosely-typed palette input (AI clients pass raw "#RRGGBB" strings or even CSS
 *  `linear-gradient(...)` expressions) into the discriminated union the renderer expects:
 *  `{ color }` for a solid accent, or `{ gradient: { start, end } }` for a two-stop fade. Anything
 *  unparseable is dropped with a warning rather than crashing the renderer. */
function normalisePalette(palette: Record<string, unknown> | undefined): GraphCategoryPalette | undefined {
  if (!palette) return undefined
  const out: Record<string, { color: string } | { gradient: { start: string; end: string } }> = {}
  for (const [cat, raw] of Object.entries(palette)) {
    const spec = normalisePaletteEntry(raw)
    if (spec) out[cat] = spec
    else if (typeof console !== 'undefined') console.warn(`setCategoryPalette: dropping invalid entry for '${cat}'`, raw)
  }
  return out
}
function normalisePaletteEntry(raw: unknown): { color: string } | { gradient: { start: string; end: string } } | undefined {
  if (typeof raw === 'string') {
    // CSS linear-gradient(...) — pluck the first two colour stops if present, else treat the whole
    // string as a colour (browsers parse named colours; we only need a stable hex/RGB(A) literal).
    const m = raw.match(/linear-gradient\s*\([^,]+,\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)\b[^,]*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)/i)
    if (m) return { gradient: { start: m[1]!, end: m[2]! } }
    return { color: raw }
  }
  if (raw && typeof raw === 'object') {
    const r = raw as { color?: unknown; gradient?: unknown; start?: unknown; end?: unknown }
    if (typeof r.color === 'string') return { color: r.color }
    if (typeof r.start === 'string' && typeof r.end === 'string') return { gradient: { start: r.start, end: r.end } }
    if (r.gradient && typeof r.gradient === 'object') {
      const g = r.gradient as { start?: unknown; end?: unknown }
      if (typeof g.start === 'string' && typeof g.end === 'string') return { gradient: { start: g.start, end: g.end } }
    }
  }
  return undefined
}

function darkenColor(c: ColorSource, f: number): number {
  const col = new Color(c)
  return new Color([col.red * f, col.green * f, col.blue * f]).toNumber()
}

export class XenolithEditor {
  readonly #rootGraph: Graph
  readonly #rootBus: CommandBus
  /** The graph + bus currently being displayed and edited. Equal to the root document at dive
   *  depth 0; a template definition's own graph + bus while dived into a `$templateInstance`. All
   *  render, interaction, selection, and undo route through these (via the `graph`/`commandBus`
   *  getters). `toJSON`/`loadJSON` stay bound to the root document. */
  #displayGraph: Graph
  #displayBus: CommandBus
  readonly selection: Selection
  /**
   * The active (displayed) graph — the root document at depth 0, a definition while dived.
   *
   * @internal — UNSTABLE shape. The `Graph` class is implementation detail and may change in any
   * minor release until v1.0. Hosts must use `toJSON()` / `getGraphReadonly()` to snapshot the
   * graph, and command APIs (`addNode`, `connect`, …) to mutate it. Mutating through `editor.graph`
   * bypasses the command bus → preventable events don't fire, undo/redo breaks.
   */
  get graph(): Graph { return this.#displayGraph }
  /**
   * The active (displayed) command bus — the root document's bus at depth 0.
   *
   * @internal — UNSTABLE. Dispatching commands directly bypasses preventable events (`node:removing`,
   * `edge:connecting`, etc.). Use the public mutation API (`addNode`, `removeNode`, `connect`, …)
   * which routes through the same bus but also fires the pre-mutation events.
   */
  get commandBus(): CommandBus { return this.#displayBus }

  /**
   * Public read-only snapshot of the current graph as a structured-clonable JSON document
   * (`xenolith.v1` format). Equivalent to {@link toJSON} — the stable, type-safe read
   * alternative to the internal `graph` getter.
   */
  getGraphReadonly(): Readonly<XenolithGraphV1> { return this.toJSON() }

  /** Live iteration over the displayed graph's nodes (root document at dive depth 0, the
   *  definition while dived). The read surface the selector hooks (`useNodes`, …) are built
   *  on — the stable, typed alternative to the internal `graph` getter. Objects are live
   *  views; mutating them is unsupported. */
  graphNodes(): IterableIterator<Readonly<Node>> { return this.#displayGraph.nodes() }

  /** Live iteration over the displayed graph's edges. See {@link graphNodes}. */
  graphEdges(): IterableIterator<Readonly<Edge>> { return this.#displayGraph.edges() }

  /** One node by id (live view of the displayed graph), or undefined. The single-node companion
   *  to {@link graphNodes} — the typed alternative to the internal `graph` getter. */
  getNode(id: NodeId): Readonly<Node> | undefined { return this.#displayGraph.getNode(id) }

  /** The live display graph, for the core read/traversal helpers (`topoOrder`, `evaluateGraph`,
   *  `reachableFrom`, `incomers` — all stable `graph-core` exports). READ-ONLY by convention:
   *  mutating it bypasses the command bus (no undo, no preventable events) — use the mutation
   *  API. This is the typed successor of the internal `graph` getter the Run guide used. */
  readGraph(): Graph { return this.#displayGraph }

  /** Replace a node's `state` object (bus-routed `SetNodeState` — undoable, fires the usual
   *  events). For ticking sims that must not flood undo history use widget-value writes with
   *  `ephemeral` or the plugin runtime-delegation surface instead. */
  setNodeState(nodeId: NodeId, state: Record<string, unknown>): void {
    this.commandBus.apply(new SetNodeState(nodeId, state))
  }

  /** Run many mutations as ONE undo entry (auto begin/end-group; rolls back and rethrows if fn
   *  throws). The public face of what the README has always advertised as
   *  `commandBus.beginGroup()/endGroup()` — grouping used to be reachable only through the
   *  internal bus getter, which is no longer part of the shipped typings. */
  transaction<R>(fn: () => R): R {
    return this.commandBus.transaction(fn)
  }

  /** Begin an undo group MANUALLY — for spans that can't be a synchronous `transaction()`:
   *  coalesce a string of keystrokes with `{ idleTimeoutMs }` (auto-closes N ms after the last
   *  mutation) or pair with {@link endGroup} yourself. Every mutation in between becomes ONE
   *  undo entry. */
  beginGroup(opts?: { label?: string; idleTimeoutMs?: number }): void {
    this.commandBus.beginGroup(opts)
  }

  /** Close a group opened by {@link beginGroup}. */
  endGroup(): void {
    this.commandBus.endGroup()
  }

  /** Plugin registry for context-menu items (right-click / long-press menus). Items are merged
   *  with the built-in menu at open time. See {@link ContextMenuRegistry}. */
  readonly contextMenu = new ContextMenuRegistry()

  // ---------------------------------------------------------------------------------------------
  // Public API namespaces (v0.7 BETA stable). Each is a frozen object lazily built on first read
  // (`??=` cache) so it's a stable reference for `useMemo`-style consumer code. The flat methods
  // on the editor (`editor.pan`, `editor.undo`, `editor.fitView`, …) still exist for back-compat
  // and remain @deprecated until v1.0 — new code should reach for the namespace form.
  // ---------------------------------------------------------------------------------------------

  #viewNs?: Readonly<{
    pan: (dx: number, dy: number) => void
    zoomAt: (focal: { x: number; y: number }, factor: number) => void
    resetView: () => void
    fitView: (opts?: { padding?: number; maxZoom?: number; minZoom?: number }) => void
    setViewport: (state: ViewportState) => void
    readonly state: ViewportState
    screenToWorld: (point: { x: number; y: number }) => { x: number; y: number }
    worldToScreen: (point: { x: number; y: number }) => { x: number; y: number }
    readonly lastPointerWorld: { x: number; y: number } | null
  }>
  get view() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const self = this
    return this.#viewNs ??= Object.freeze({
      pan: (dx: number, dy: number) => self.pan(dx, dy),
      zoomAt: (focal: { x: number; y: number }, factor: number) => self.zoomAt(focal, factor),
      resetView: () => self.resetView(),
      fitView: (opts?: { padding?: number; maxZoom?: number; minZoom?: number }) =>
        self.fitView(opts ?? {}),
      setViewport: (state: ViewportState) => self.setViewport(state),
      get state(): ViewportState { return self.viewport },
      screenToWorld: (point: { x: number; y: number }) => self.screenToWorld(point),
      worldToScreen: (point: { x: number; y: number }) => self.worldToScreen(point),
      get lastPointerWorld(): { x: number; y: number } | null { return self.lastPointerWorld() },
    })
  }

  #historyNs?: Readonly<{
    undo: () => boolean; redo: () => boolean
    readonly canUndo: boolean; readonly canRedo: boolean
    clear: () => void
  }>
  get history() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const self = this
    return this.#historyNs ??= Object.freeze({
      undo: () => self.undo(),
      redo: () => self.redo(),
      get canUndo(): boolean { return self.canUndo() },
      get canRedo(): boolean { return self.canRedo() },
      /** Forget every command in the undo/redo log. Call after `onReady` seeding so the user's
       *  first Ctrl+Z doesn't unwind the initial graph. */
      clear: () => self.commandBus.clearHistory(),
    })
  }

  #clipboardNs?: Readonly<{
    copy: () => boolean
    paste: (target?: { x: number; y: number } | { dx: number; dy: number }) => NodeId[]
    duplicate: (offset?: { dx: number; dy: number }) => NodeId[]
    selectAll: () => void
    deleteSelection: () => void
  }>
  get clipboard() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const self = this
    return this.#clipboardNs ??= Object.freeze({
      copy: () => self.copySelection(),
      paste: (target?: { x: number; y: number } | { dx: number; dy: number }) =>
        target === undefined ? self.paste() : self.paste(target),
      duplicate: (offset?: { dx: number; dy: number }) =>
        offset === undefined ? self.duplicateSelected() : self.duplicateSelected(offset),
      selectAll: () => self.selectAll(),
      deleteSelection: () => self.deleteSelected(),
    })
  }

  #chromeNs?: Readonly<{
    setControls: (opts: ControlsOptions | false) => void
    setMinimapVisible: (visible: boolean) => void
    setMinimapPosition: (position: MinimapPosition) => void
    setStatsVisible: (visible: boolean) => void
    toggleStats: () => void
    showOverlay: (label?: string) => void
    hideOverlay: () => void
    withOverlay: <T>(label: string, work: () => T | Promise<T>) => Promise<T>
    enterFullscreen: () => Promise<void>
    exitFullscreen: () => Promise<void>
    toggleFullscreen: () => Promise<void>
    readonly isFullscreen: boolean
    readonly overlayRoot: HTMLElement
    setBreadcrumbVisible: (visible: boolean) => void
    showProposals: () => boolean
    hideProposals: () => void
    readonly isProposalsVisible: boolean
  }>
  get chrome() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const self = this
    return this.#chromeNs ??= Object.freeze({
      setControls: (opts: ControlsOptions | false) => self.setControls(opts),
      setMinimapVisible: (visible: boolean) => self.setMinimapVisible(visible),
      setMinimapPosition: (position: MinimapPosition) => self.setMinimapPosition(position),
      setStatsVisible: (visible: boolean) => self.setStatsVisible(visible),
      toggleStats: () => self.toggleStats(),
      showOverlay: (label?: string) => label === undefined ? self.showOverlay() : self.showOverlay(label),
      hideOverlay: () => self.hideOverlay(),
      withOverlay: <T>(label: string, work: () => T | Promise<T>) => self.withOverlay(label, work),
      enterFullscreen: () => self.enterFullscreen(),
      exitFullscreen: () => self.exitFullscreen(),
      toggleFullscreen: () => self.toggleFullscreen(),
      get isFullscreen(): boolean { return self.isFullscreen() },
      get overlayRoot(): HTMLElement { return self.overlayRoot },
      setBreadcrumbVisible: (visible: boolean) => self.setBreadcrumbVisible(visible),
      showProposals: () => self.showProposals(),
      hideProposals: () => self.hideProposals(),
      get isProposalsVisible(): boolean { return self.isProposalsVisible() },
    })
  }
  readonly #app: Application
  /** True after `destroy()` runs. PIXI's `app.screen` getter throws on a destroyed Application
   *  instead of returning null, so we gate every access on this flag. */
  #destroyed = false
  readonly #host: HTMLElement
  /** Toggleable stats overlay (FPS, nodes, edges, selection, zoom). Hidden by default; press
   *  backtick (`) to toggle, or call `setStatsVisible()`. */
  #statsEl: HTMLDivElement | null = null
  #statsVisible = false
  #statsFrame = 0
  /** Themeable "Rendering…" busy overlay shown over the canvas during heavy loads so the first
   *  (blocking) render of a big graph is hidden behind a blur + spinner, then faded out. */
  #overlayEl: HTMLDivElement | null = null
  #overlayCard: HTMLDivElement | null = null
  #overlaySpinner: HTMLDivElement | null = null
  #overlayLabel: HTMLDivElement | null = null
  /** Render-on-demand dirty flag. The ticker only repaints (and reruns edge redraw + backdrop +
   *  shader onFrame) on frames where this is set. A static graph costs ~0 — no GPU work, no
   *  shader passes. Starts true so the first frame paints. */
  #needsRender = true
  /** Ids of edges with `animated: true`. While non-empty the ticker advances `#dashPhase` and marks
   *  the scene dirty every frame; empty → the graph stays render-on-demand idle. */
  readonly #animatedEdges = new Set<EdgeId>()
  #dashPhase = 0
  #theme: XenolithTheme
  #gridLayer: Container | null = null
  /** Live snapshot of the world MINUS the nodes layer — created lazily the first time the
   *  active theme opts in via `theme.needsBackdrop = true`. Themes that don't sample the
   *  backdrop pay zero extra render cost. */
  #backdropRT: RenderTexture | null = null
  /** World-space ring shown over the edge midpoint dot the cursor is hovering (affordance for the
   *  right-click menu). Null target = hidden. */
  #edgeHoverGfx!: Graphics
  #hoveredEdgeMid: EdgeId | null = null
  /** Per-node personal backdrop RTs for painter's-order compositing — allocated lazily for
   *  nodes whose AABB overlaps a lower-paint-order node, so the glass shader refracts what's
   *  visually underneath. Nodes with no overlap reuse the shared `#backdropRT`. */
  readonly #perNodeBackdropRT = new Map<NodeId, RenderTexture>()
  /** Last frame's overlap plan — used to revert nodes that stopped overlapping back to the
   *  shared backdrop via `onNodeBackdrop(id, null)`. */
  #lastOverlapPlan = new Map<string, string[]>()
  readonly #world: Container<ContainerChild>
  readonly #edgesLayer: Container<ContainerChild>
  readonly #nodesLayer: Container<ContainerChild>
  readonly #lodLayer: Container<ContainerChild>
  #commentsLayer!: Container
  #commentHeadersLayer!: Container
  #comments!: CommentController
  #pointer!: PointerController
  #sub!: Subgraph
  #macroFramesLayer!: Container
  /** Top layer (above nodes): an EXPANDED macro's frame + member views are reparented here so the
   *  whole group paints over everything else. Nested macros stack by depth within it. */
  #macroOverlayLayer!: Container
  readonly #macroFrames = new Map<NodeId, MacroFrameView>()
  /** Macros mid expand-animation. Their members + frame are primed invisible by the next sync (before
   *  paint) so the grow-in starts from nothing — without this one full-opacity frame paints first (jitter). */
  readonly #expandingMacros = new Set<NodeId>()
  /** Double-click window for an expanded macro frame header (rename). */
  #macroFrameLastTap = 0
  /** Member → owning macro. Rebuilt lazily; null means dirty. */
  #macroParentIndex: Map<NodeId, NodeId> | null = null
  /** In-flight fit-to-macro viewport tween. */
  #viewportTweenRaf: number | null = null
  readonly #viewport: Viewport
  readonly #interaction: InteractionManager | null
  readonly #zoomBounds: ZoomBounds
  readonly #snapSize: number
  readonly #views = new Map<NodeId, NodeView>()
  /** Per-node render options (category, title, collapsed). Captured at addNode so setTheme can
   *  re-issue the render with identical args after swapping the active theme. */
  readonly #renderOpts = new Map<NodeId, RenderNodeOptions>()
  /** Graph-owned category palette (from `categories` in xenolith.v1) — overrides theme category tokens. */
  #categoryPalette: GraphCategoryPalette | undefined
  /** Reusable live-template definitions, keyed by id. A `$templateInstance` node references one by
   *  `state.definitionId`; its pins mirror the definition's `$templateInput`/`$templateOutput`
   *  boundary nodes. Definitions are document-level — they live on the root, not per dive level. */
  readonly #definitions = new Map<TemplateDefId, TemplateDefinition>()
  /** Palette schemas for the registered template definitions (one per definition), so each shows up
   *  in Tab search and can be inserted as a fresh instance. Kept in sync with #definitions. */
  readonly #templateRegistry = new NodeRegistry()
  /** Saved parent levels while dived into template definitions. Each frame is the state to restore on
   *  dive-out. `#currentDefId` is the definition currently displayed (null at the root document). */
  #diveStack: { graph: Graph; bus: CommandBus; selectionIds: NodeId[]; viewport: ViewportState; defId: TemplateDefId | null }[] = []
  #currentDefId: TemplateDefId | null = null
  #breadcrumbEl: HTMLDivElement | null = null
  #breadcrumbDisabled = false
  /** Measures label/title text so `addNode` can backfill a missing `node.size` from content.
   *  Bound to PIXI's CanvasTextMetrics; falls back to a char-width estimate if that throws (e.g.
   *  a headless environment without a 2D canvas). */
  readonly #textMeasure: TextMeasurer
  readonly #edgeRecords = new Map<EdgeId, EdgeRecord>()
  /** Render opts per edge, kept persistent so undo of a DisconnectEdge can re-materialise the
   *  edge graphics with the same wire colour / type hint it had before. */
  readonly #edgeOpts = new Map<EdgeId, RenderEdgeOptions>()
  /** Applied under per-edge options. An explicit field on the edge wins. */
  #defaultEdgeOptions: RenderEdgeOptions = {}
  /** Edge ids incident to each node (both endpoints), so edge virtualization can materialise only
   *  the wires touching a visible node without scanning every edge. */
  readonly #edgesByNode = new Map<NodeId, EdgeId[]>()
  /** In-memory clipboard buffer set by `copySelection()` and consumed by `paste()`. Stores
   *  references to live node/edge objects + render opts at copy time — survives selection
   *  changes but not editor disposal. We skip JSON serialise/parse on the clipboard path; that
   *  cost showed up clearly in profiling at high node counts. */
  #clipboard: ClipboardSnapshot | null = null
  /** Most recent pointer position in world coords — used by paste-at-cursor and the
   *  ":pointermove" hook. */
  #lastPointerWorld: { x: number; y: number } | null = null
  /** Most recent pointer position in canvas/screen coords — used to open the palette at cursor. */
  #lastPointerScreen: { x: number; y: number } | null = null
  /** Registry of node schemas the insert palette searches. Hosts populate it via `editor.registry`. */
  readonly #registry = new NodeRegistry()
  /** Custom pin-type descriptors (colour/shape/compatibility). Read by connection validation and the
   *  node renderer. Hosts/plugins populate it via `editor.types`. */
  readonly #types = new TypeRegistry()
  readonly #commands = new CommandRegistry()
  #sidebar: SidebarManager | null = null
  #paletteSidebar: PaletteSidebar | null = null
  /** Header glyph icons by name (built-in Feather set + host/plugin-registered). A node's
   *  `glyph.icon` resolves through this. Populated via `editor.icons`. */
  readonly #icons = new IconRegistry()
  /** Built-in schemas always available in the palette, independent of (and unaffected by clearing)
   *  the host registry — currently just the Reroute node. */
  readonly #builtins = new NodeRegistry()
  #palette: InsertPalette | null = null
  /** Ctrl+F search over EXISTING graph nodes (H1) — built lazily on first open. */
  #search: SearchPalette | null = null
  /** Visually-hidden aria-live region announcing selection changes (G3 a11y). */
  #srLive: HTMLDivElement | null = null
  /** When the palette was opened via an edge's "Add Node" menu: the edge to splice into plus its
   *  endpoint types (so the palette filters to compatible nodes). Consumed by `#insertFromPalette`. */
  #pendingEdgeSplice: { edgeId: EdgeId; srcType: string; dstType: string } | null = null
  #edgeMenu: EdgeContextMenu | null = null
  #widgetOverlay: WidgetOverlay | null = null
  /** Screen-anchored DOM layer over the WebGL canvas for in-editor chrome (panels, controls,
   *  framework components). The container ignores pointer events; children opt back in. Created
   *  lazily on first `overlayRoot` access so headless/test editors pay nothing. */
  #overlayRoot: HTMLDivElement | null = null
  #controls: EditorControls | null = null
  #minimap: Minimap | null = null
  readonly #widgetControllers = new Map<string, CustomWidgetController>()
  readonly #coreEvents = new EventEmitter<CoreEvents>()
  readonly #events = new EventEmitter<EditorEvents>()
  /** Installed plugins + their disposers. The context factory is lazy so plugins always see the
   *  current display graph/bus. Disposed in `destroy()`. */
  readonly #pluginHost = new PluginHost(() => this.#pluginContext())
  #hoveredId: NodeId | null = null
  readonly #marqueeHovered = new Set<NodeId>()
  /** Members of every currently-collapsed macro — their node views + internal edges are hidden. */
  #hiddenMembers = new Set<NodeId>()
  #interactive = true
  /** Per-frame tick subscribers (for a host evaluator/simulation). Invoked every frame while the loop
   *  runs, or once per `step()`. The editor itself never reads them — it's not a runtime. */
  readonly #tickListeners = new Set<(dtMs: number) => void>()
  #looping = false
  /** Frame interval (ms) when the host requested an `startLoop({fps})` throttle. 0 = run every
   *  animation frame (default 60 fps). Time since the last fired tick accumulates and only
   *  releases when ≥ `#tickInterval` ms have passed. */
  #tickInterval = 0
  #tickAccum = 0
  #isValidConnection: ((c: ConnectionRequest) => boolean) | undefined
  #statusGfx: Graphics | null = null
  readonly #nodeStatus = new Map<NodeId, NodeStatus>()
  /** Self-hosted font URL map (passed into init or set via `editor.fonts.selfHost(...)`). */
  #fontUrls: FontUrlMap | undefined

  /** Font management — `selfHost(urls)` overrides Google-Fonts-CDN default per (family, weight). */
  readonly fonts = {
    selfHost: (urls: FontUrlMap): void => {
      this.#fontUrls = urls
      if (this.#theme.fonts?.length) void loadFonts(this.#theme.fonts, { selfHost: urls })
    },
  }

  private constructor(app: Application, host: HTMLElement, theme: XenolithTheme, opts: XenolithEditorOptions) {
    this.#app = app
    this.#host = host
    this.#theme = theme
    this.#textMeasure = this.#makeTextMeasure(theme)
    this.#builtins.register(rerouteNodeSchema)
    this.#builtins.register(commentPaletteSchema)
    this.#builtins.register(templateInputSchema)
    this.#builtins.register(templateOutputSchema)
    if (theme.needsBackdrop) {
      this.#backdropRT = this.#createBackdropRT()
    }
    this.#rootGraph = new Graph()
    this.#displayGraph = this.#rootGraph
    this.selection = new Selection()
    this.#rootBus = new CommandBus({ graph: this.#rootGraph, events: this.#coreEvents })
    this.#displayBus = this.#rootBus
    // Every command's execute() runs inside a bus transaction → N-step commands ("Clear all",
    // "Group selected", custom plugin macros) collapse to one undoable history entry.
    this.#commands.setExecutionMiddleware((fn) => this.#displayBus.transaction(fn))
    this.#zoomBounds = opts.zoomBounds ?? [0.25, 2]
    this.#snapSize = opts.snap ?? 8
    if (opts.fontUrls) this.#fontUrls = opts.fontUrls

    this.#world = new Container({ label: 'world' })
    this.#edgesLayer = new Container({ label: 'edges' })
    this.#nodesLayer = new Container({ label: 'nodes' })
    if (!opts.disableGrid) {
      this.#gridLayer = this.#createGrid()
      this.#world.addChild(this.#gridLayer)
    }
    // Comment frames are split across two layers so wires read correctly: the translucent BODY sits
    // under the edges (wires between inner nodes draw on top of the tint), while the HEADER bar sits
    // above the edges (the header always reads over any wire crossing the top of the frame).
    this.#commentsLayer = new Container({ label: 'comments' })
    this.#world.addChild(this.#commentsLayer)
    // Expanded-macro frames sit just above comment bodies, below edges — members + their wires draw
    // on top of the frame, same layering as a comment body.
    this.#macroFramesLayer = new Container({ label: 'macro-frames' })
    this.#world.addChild(this.#macroFramesLayer)
    this.#world.addChild(this.#edgesLayer, this.#nodesLayer)
    // Above nodes: an expanded macro's frame + members reparent here so the whole group is on top.
    this.#macroOverlayLayer = new Container({ label: 'macro-overlay' })
    this.#world.addChild(this.#macroOverlayLayer)
    this.#commentHeadersLayer = new Container({ label: 'comment-headers' })
    this.#world.addChildAt(this.#commentHeadersLayer, this.#world.getChildIndex(this.#nodesLayer))
    // LOD batch layer — at far zoom the whole graph is drawn as Graphics batches (nodes + edges) and
    // the live per-node/edge layers are hidden. Sits BELOW #nodesLayer so the sprite-level edge batch
    // renders under the node sprites (above it the wires would paint over the nodes); world-space so
    // pan/zoom ride the transform for free.
    this.#lodLayer = new Container({ label: 'lod' })
    this.#lodLayer.eventMode = 'none'
    this.#lodLayer.visible = false
    this.#world.addChildAt(this.#lodLayer, this.#world.getChildIndex(this.#nodesLayer))
    // Node status rings — world space, ABOVE nodes so they read clearly. Painted in #drawStatuses.
    this.#statusGfx = new Graphics()
    this.#statusGfx.eventMode = 'none'
    this.#world.addChild(this.#statusGfx)
    // Edge midpoint hover ring — drawn just above edges, below nodes, in world space so it tracks
    // pan/zoom. Cleared/repositioned as the cursor enters/leaves a midpoint dot.
    this.#edgeHoverGfx = new Graphics()
    this.#edgeHoverGfx.eventMode = 'none'
    this.#world.addChildAt(this.#edgeHoverGfx, this.#world.getChildIndex(this.#nodesLayer))
    app.stage.addChild(this.#world)

    this.#viewport = new Viewport(this.#world, opts.viewport)
    this.#comments = new CommentController({
      graph: () => this.graph,
      commandBus: () => this.commandBus,
      selection: this.selection,
      theme: () => this.#theme,
      viewport: this.#viewport,
      commentsLayer: this.#commentsLayer,
      commentHeadersLayer: this.#commentHeadersLayer,
      views: this.#views,
      edgesByNode: this.#edgesByNode,
      lodLevel: () => this.#lodLevel,
      interactive: () => this.#interactive,
      requestRender: () => this.#requestRender(),
      redrawEdge: (id) => this.#redrawEdge(id),
      virtualizeActive: () => this.#virtualizeActive(),
      virtualizeBands: () => this.#virtualizeBands(),
      rectIntersects,
      ensureEdgeMenu: () => this.#ensureEdgeMenu(),
      ensureWidgetOverlay: () => this.#ensureWidgetOverlay(),
      updateVisualStates: () => this.#updateVisualStates(),
      removeComment: (id) => this.removeComment(id),
      setCommentColor: (id, color) => this.setCommentColor(id, color),
    })

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const ptrSelf = this
    this.#domWidgets = new DomWidgetLayer({
      get graph() { return ptrSelf.graph },
      get host() { return ptrSelf.#host },
      get theme() { return ptrSelf.#theme },
      get viewport() { return ptrSelf.#viewport },
      get views() { return ptrSelf.#views },
      get nodesLayer() { return ptrSelf.#nodesLayer },
      get widgetControllers() { return ptrSelf.#widgetControllers },
      isPinConnected: (nodeId, pinKey) => ptrSelf.#isPinConnected(nodeId, pinKey),
      widgetDisplayValue: (node, w) => ptrSelf.#widgetDisplayValue(node, w),
      widgetThemeColors: (spec) => ptrSelf.#widgetThemeColors(spec),
      setWidgetValue: (nodeId, widgetId, v) => ptrSelf.setWidgetValue(nodeId, widgetId, v),
      openSidebar: (nodeId) => ptrSelf.openSidebar(nodeId),
    })
    this.#export = new ExportController({
      get graph() { return ptrSelf.graph },
      get theme() { return ptrSelf.#theme },
      get world() { return ptrSelf.#world },
      get app() { return ptrSelf.#app },
      get views() { return ptrSelf.#views },
      get frozen() { return ptrSelf.#frozen },
      get lodLevel() { return ptrSelf.#lodLevel },
      endFreeze: () => ptrSelf.#endFreeze(),
      applyLODLevel: (level) => ptrSelf.#applyLODLevel(level),
      ensureView: (n) => ptrSelf.#ensureView(n),
      materializeEdgeIfAbsent: (e) => {
        if (!ptrSelf.#edgeRecords.has(e.id)) ptrSelf.#materializeEdge(e, ptrSelf.#edgeOpts.get(e.id) ?? {})
      },
      applyMacroVisibility: () => ptrSelf.#applyMacroVisibility(),
      virtualizeActive: () => ptrSelf.#virtualizeActive(),
      cullToViewport: () => ptrSelf.#cullToViewport(),
      requestRender: () => ptrSelf.#requestRender(),
    })
    this.#pointer = new PointerController({
      ed: ptrSelf,
      get app() { return ptrSelf.#app },
      get comments() { return ptrSelf.#comments },
      connectionAllowed: (sourceNode, sourcePin, targetNode, targetPin) => ptrSelf.#connectionAllowed(sourceNode, sourcePin, targetNode, targetPin),
      deepestExpandedMacro: () => ptrSelf.#deepestExpandedMacro(),
      disposeEdgeGraphics: (edgeId) => ptrSelf.#disposeEdgeGraphics(edgeId),
      drawEdge: (g, from, to, opts) => ptrSelf.#drawEdge(g, from, to, opts),
      get edgeHoverGfx() { return ptrSelf.#edgeHoverGfx },
      get edgeOpts() { return ptrSelf.#edgeOpts },
      get edgeRecords() { return ptrSelf.#edgeRecords },
      edgesAttachedTo: (nodeIds) => ptrSelf.#edgesAttachedTo(nodeIds),
      get edgesLayer() { return ptrSelf.#edgesLayer },
      get events() { return ptrSelf.#events },
      findIncidentEdgeId: (nodeId, pinId) => ptrSelf.#findIncidentEdgeId(nodeId, pinId),
      get hiddenMembers() { return ptrSelf.#hiddenMembers },
      get host() { return ptrSelf.#host },
      get hoveredEdgeMid() { return ptrSelf.#hoveredEdgeMid },
      set hoveredEdgeMid(v) { ptrSelf.#hoveredEdgeMid = v },
      get hoveredId() { return ptrSelf.#hoveredId },
      set hoveredId(v) { ptrSelf.#hoveredId = v },
      get interactive() { return ptrSelf.#interactive },
      isDisplayModeWidget: (node, w) => ptrSelf.#isDisplayModeWidget(node, w),
      get lastPointerScreen() { return ptrSelf.#lastPointerScreen },
      set lastPointerScreen(v) { ptrSelf.#lastPointerScreen = v },
      get lastPointerWorld() { return ptrSelf.#lastPointerWorld },
      set lastPointerWorld(v) { ptrSelf.#lastPointerWorld = v },
      macroIsAncestor: (ancestor, id) => ptrSelf.#macroIsAncestor(ancestor, id),
      get marqueeHovered() { return ptrSelf.#marqueeHovered },
      get nodesLayer() { return ptrSelf.#nodesLayer },
      pinWorldPosition: (node, pinId) => ptrSelf.#pinWorldPosition(node, pinId),
      redrawEdge: (edgeId) => ptrSelf.#redrawEdge(edgeId),
      requestRender: () => ptrSelf.#requestRender(),
      get snapSize() { return ptrSelf.#snapSize },
      get theme() { return ptrSelf.#theme },
      updateEdgeMidpointHover: (world) => ptrSelf.#updateEdgeMidpointHover(world),
      updateVisualStates: () => ptrSelf.#updateVisualStates(),
      get viewport() { return ptrSelf.#viewport },
      get views() { return ptrSelf.#views },
      get widgetControllers() { return ptrSelf.#widgetControllers },
      get widgetOverlay() { return ptrSelf.#widgetOverlay },
      set widgetOverlay(v) { ptrSelf.#widgetOverlay = v },
      widgetThemeColors: (spec) => ptrSelf.#widgetThemeColors(spec),
      get world() { return ptrSelf.#world },
    })

    if (!opts.disableInteraction) {
      this.#interaction = new InteractionManager(app.canvas as HTMLCanvasElement)
      this.#interaction.attach()
      // iOS Safari long-press on ANY descendant of the host shows "image options" / text selection.
      // Suppress at the host level so DOM overlays (panels, controls, widgets) inherit too. Inputs
      // override `user-select` to `text` themselves so this doesn't block typing in widgets.
      const hs = this.#host.style as CSSStyleDeclaration & {
        webkitUserSelect?: string; webkitTouchCallout?: string
      }
      this.#host.style.userSelect = 'none'
      hs.webkitUserSelect = 'none'
      hs.webkitTouchCallout = 'none'
      this.#interaction.onZoom(({ focal, factor }) => {
        if (this.#htmlFieldFocused()) return // typing/picking in a DOM overlay — wheel must not zoom
        this.#viewport.zoomAt(focal, factor, this.#zoomBounds)
      })
      this.#interaction.onPan(({ dx, dy }) => {
        if (this.#htmlFieldFocused()) return
        this.#viewport.pan(dx, dy)
      })
      // Two-finger gesture starts → cancel any in-flight single-pointer interaction so the
      // first finger doesn't keep dragging a node while the second finger drives pan+zoom.
      this.#interaction.onGestureBegin(() => { this.#cancelInFlightInteraction() })
      // Long-press = touch equivalent of right-click. Cancel any in-flight drag first so we
      // don't pop the menu mid-drag (single touch on a node would be `pending` node-drag).
      this.#interaction.onLongPress(({ x, y }) => {
        if (this.#htmlFieldFocused()) return
        this.#endLongPressRing(true)
        this.#cancelInFlightInteraction()
        this.#openMenuAt({ x, y })
      })
      // Visual ring at the touch point during the hold — only when SOMETHING is under the finger,
      // otherwise the user sees a ring leading to nothing (empty-canvas long-press is a no-op).
      this.#interaction.onLongPressStart(({ x, y, ms }) => {
        if (!this.#hasMenuAt({ x, y })) return
        this.#beginLongPressRing(x, y, ms)
      })
      this.#interaction.onLongPressCancel(() => this.#endLongPressRing(false))
      app.stage.eventMode = 'static'
      app.stage.hitArea = app.screen
      // Any pointerdown that reaches the stage means the user is interacting with content, not
      // navigating — drop the navigation freeze at once so the live node (chevron, pins, widgets,
      // drag) responds immediately rather than being stuck behind a frozen sprite for ~130ms.
      app.stage.on('pointerdown', () => { if (this.#frozen) this.#endFreeze() })
      this.#wireStageInteraction()
      window.addEventListener('keydown', this.#onKeyDown)
      ;(app.canvas as HTMLCanvasElement).addEventListener('dblclick', this.#onDoubleClick)
      // Suppress the browser context menu — `#onContextMenu` only preventDefaults; the actual menu
      // OPEN fires on pointerup (after a non-drag right click) so dragging the canvas with the
      // right button doesn't flash the menu mid-pan.
      ;(app.canvas as HTMLCanvasElement).addEventListener('contextmenu', this.#onContextMenu)
      ;(app.canvas as HTMLCanvasElement).addEventListener('pointerdown', this.#onRightDown)
      ;(app.canvas as HTMLCanvasElement).addEventListener('pointerup',   this.#onRightUp)
      // G13 — HTML5 file/text DnD onto the canvas. preventDefault on dragover is required for
      // drop to fire; on drop we hit-test the world point against nodes and emit `node:drop`.
      ;(app.canvas as HTMLCanvasElement).addEventListener('dragover', this.#onDragOver)
      ;(app.canvas as HTMLCanvasElement).addEventListener('drop',     this.#onDrop)
    } else {
      this.#interaction = null
    }

    this.selection.on((e) => {
      this.#updateVisualStates(); this.#requestRender()
      this.#events.emit('selection:changed', { nodeIds: e.ids })
      this.#announceSelection(e.ids)
    })
    this.#setupA11y()
    this.#viewport.on((vp) => { this.#onViewportChanged(); this.#events.emit('viewport:changed', { x: vp.x, y: vp.y, zoom: vp.zoom }) })

    // Bridge command-bus lifecycle → public graph-mutation events (covers programmatic API, palette,
    // paste, drag-commit, and undo/redo through one choke point).
    createGraphEventBridge({
      coreEvents: this.#coreEvents,
      graph: () => this.#displayGraph,
      bus: this.#events,
      canUndo: () => this.commandBus.canUndo(),
      canRedo: () => this.commandBus.canRedo(),
    })

    // E5 / ADR 0006 — commit-time controlled protocol: coalesced change-arrays on the public
    // bus. One array per transaction/group commit, per top-level command, per undo/redo step.
    createControlledBridge({
      coreEvents: this.#coreEvents,
      bus: this.commandBus,
      graph: () => this.#displayGraph,
      emit: (changes) => { this.#events.emit('graph:changed', { changes }) },
    })

    // View-sync: after every command apply/undo/redo, reconcile views with the graph model so
    // undo of a Move/Connect/Remove visually reverts the canvas. We defer the reconcile to a
    // microtask so a transaction that fires N command:applied events collapses to one O(N) sync
    // instead of N × O(N+E) = O(N²) — critical for paste/duplicate at high node counts.
    const scheduleSync = (): void => { this.#scheduleSync(); this.#requestRender() }
    // Drop the macro parent-index whenever the graph topology MIGHT have changed (add/remove node,
    // SetNodeState that touched state.members). Cheaper to flag-and-rebuild on next read than to
    // mutate the index in lockstep with every command.
    const invalidateMacroIndex = ({ command }: { command: { type: string } }): void => {
      const t = command.type
      if (t === 'AddNode' || t === 'RemoveNode' || t === 'SetNodeState' || t === 'SetNodeWidgets') {
        this.#invalidateMacroIndex()
      }
    }
    this.#coreEvents.on('command:applied', invalidateMacroIndex)
    this.#coreEvents.on('command:undone',  invalidateMacroIndex)
    this.#coreEvents.on('command:redone',  invalidateMacroIndex)
    this.#coreEvents.on('command:applied', scheduleSync)
    this.#coreEvents.on('command:undone',  scheduleSync)
    this.#coreEvents.on('command:redone',  scheduleSync)

    // Repaint endpoint nodes when an edge attaches/detaches so the exec-pin "outlined when free /
    // filled gold when wired" signal stays live. Cheap: only the two endpoint nodes are touched.
    // A node with pin-bound widgets needs RESIZE (its row heights change with widget visibility)
    // — bare repaint would draw the new widget visibility into a stale size box.
    const repaintEndpoint = (id: NodeId): void => {
      if (!this.#views.has(id)) return
      const n = this.graph.getNode(id)
      // Resize (rebuilds size + view) when ANY widget binds to a pin — explicit `pinKey` OR
      // implicit via `key`. A `whenDisconnected` widget needs the node to shrink/grow on
      // connect/disconnect; `widgetBindKey()` is the same predicate computeWidgetRects uses.
      const hasBoundWidget = !!n?.widgets?.some((w) => widgetBindKey(w) !== undefined)
      if (hasBoundWidget) this.#resizeNodeView(id); else this.#rerenderNode(id)
    }
    const repaintEndpoints = (from: NodeId, to: NodeId): void => {
      repaintEndpoint(from)
      if (to !== from) repaintEndpoint(to)
      this.#requestRender()
    }
    this.#events.on('edge:connected',    ({ edge })   => {
      // `#edgesByNode` is rebuilt in a microtask via `#scheduleSync`, but this listener runs
      // SYNCHRONOUSLY right after the command — before that microtask. Without an up-front index
      // update, `#connectedPinIdsFor` (called by the renderer in `repaintEndpoints` below) would
      // see stale state and a pin-bound widget wouldn't hide on connect.
      this.#addEdgeToIndex(edge as Edge)
      repaintEndpoints(edge.from.node, edge.to.node)
    })
    this.#events.on('edge:disconnected', ({ edgeId }) => {
      // By the time this fires the edge is already gone from the graph, so look up endpoints
      // through the per-node index (which lags removal but still remembers the stale edgeId).
      const touched: NodeId[] = []
      for (const [nid, eids] of this.#edgesByNode) if (eids.includes(edgeId as EdgeId)) touched.push(nid)
      // Drop the dead edge id from the index NOW so the resize+repaint below sees it gone.
      for (const nid of touched) {
        const arr = this.#edgesByNode.get(nid)
        if (arr) {
          const filtered = arr.filter((e) => e !== edgeId)
          if (filtered.length === 0) this.#edgesByNode.delete(nid); else this.#edgesByNode.set(nid, filtered)
        }
      }
      if (touched.length === 2) repaintEndpoints(touched[0]!, touched[1]!)
      else if (touched.length === 1) repaintEndpoints(touched[0]!, touched[0]!)
    })

    // Render-on-demand: drop PIXI's unconditional per-frame render and drive it ourselves only
    // when the scene is dirty. On a static graph the ticker callback does a single boolean check
    // and returns — no edge redraw, no backdrop RT pass, no shader work, no GPU submit.
    app.ticker.remove(app.render, app)
    app.ticker.add(() => {
      // Drive the host loop first: a sim tick may mutate the graph (via the command bus), which sets
      // #needsRender below, so the frame it produces paints in the same pass. Cheap no-op when idle.
      if (this.#looping && this.#tickListeners.size > 0) {
        const dt = this.#app.ticker.deltaMS
        if (this.#tickInterval <= 0) {
          this.#emitTick(dt)
        } else {
          // Throttled tick — accumulate real frame time, fire onTick once per interval boundary.
          this.#tickAccum += dt
          if (this.#tickAccum >= this.#tickInterval) {
            this.#emitTick(this.#tickAccum)
            this.#tickAccum = 0
          }
        }
      }
      if (this.#statsVisible) this.#tickStats()
      // Keep animated edges flowing: bump the dash phase and mark dirty each frame, but only while
      // at least one animated edge exists — otherwise the graph stays render-on-demand idle.
      if (this.#animatedEdges.size > 0 && !this.#frozen) { this.#dashPhase += 1.6; this.#needsRender = true }
      if (!this.#needsRender) return
      this.#needsRender = false
      // Coalesce viewport-driven culling to one pass per frame: a fast wheel-zoom fires many
      // viewport:changed events, and culling on each would thrash create/destroy. Doing it here
      // throttles it to the frame rate.
      if (this.#cullPending) { this.#cullPending = false; this.#cullToViewport() }
      // While frozen (mid zoom/pan) the live nodes are hidden behind baked sprites that ride the
      // world transform — skip edge redraw, the backdrop RT and the glass shader entirely. Same in
      // LOD: the live node/edge layers are hidden behind the flat batch, so the backdrop RT and a
      // backdrop-sampling theme's per-frame shader (Liquid Glass) are pure wasted work.
      if (!this.#frozen && this.#lodLevel === 'full') {
        for (const edgeId of this.#edgeRecords.keys()) this.#redrawEdge(edgeId)
        this.#updateBackdrop()
        this.#theme.onFrame?.(this.#themeContext())
        this.#drawStatuses()
      }
      // Ticker may fire after destroy() — PIXI's `app.screen` getter THROWS on a destroyed
      // Application (not null-return), so gate on the explicit flag.
      if (this.#destroyed) return
      const screen = this.#app.screen
      this.#minimap?.setViewport(this.#viewport.state, screen.width, screen.height)
      // Tolerate transient PIXI v8 filter races (BindGroup.setResource null in _applyFiltersToTexture
      // when a bake-glow cache miss collides with a re-render). Logging > killing the ticker —
      // the next frame is almost always fine.
      try { this.#app.render() } catch (err) { console.warn('[editor] PIXI render frame failed (continuing)', err) }
      this.#domWidgets.position()
    })

    if (opts.minimap) {
      // The 210×150 minimap eats ~1/4 of a phone screen — auto-skip on coarse pointers when the
      // host opts in with just `true`. Hosts that pass an object explicitly opted into the layout
      // and presumably already sized things to fit.
      const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        && window.matchMedia('(pointer: coarse)').matches
      if (typeof opts.minimap === 'boolean' && coarse) {
        // skip
      } else {
        this.#ensureMinimap()
        if (typeof opts.minimap === 'object' && opts.minimap.position) this.#minimap!.setPosition(opts.minimap.position)
      }
    }

    if (opts.resizeToWindow !== false) {
      window.addEventListener('resize', this.#onResize)
    } else if (typeof ResizeObserver !== 'undefined') {
      // Embedded mode: fit the host element (panels, framework islands) instead of the window.
      // First-real-size guard: if the editor was mounted while its host was display:none (e.g.
      // a chip-switched framework pane in DemoFrame), init painted into a 1×1 PIXI stage and
      // every fitView() call inside `onReady` centred the graph in that 1×1 frame. Detect the
      // initial collapsed state and run one extra fitView() the first time the host gains real
      // dimensions, otherwise the graph stays invisible at a zoom that was correct for 1px.
      let wasCollapsed = host.clientWidth < 50 || host.clientHeight < 50
      const fit = (): void => {
        const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight)
        this.#app.renderer.resize(w, h)
        this.#onResize()
        if (wasCollapsed && w >= 50 && h >= 50) {
          wasCollapsed = false
          // Defer one tick so any pending loadJSON / fitOnLoad inside onReady has committed before
          // we re-frame. fitView snaps the world to whatever the graph contains right now.
          requestAnimationFrame(() => { if (!this.#destroyed) this.fitView({ padding: 80, maxZoom: 1 }) })
        }
      }
      fit()
      this.#hostResizeObserver = new ResizeObserver(fit)
      this.#hostResizeObserver.observe(host)
    }

    this.#applyThemeVars()
    this.#isValidConnection = opts.isValidConnection
    if (opts.controls) this.setControls(typeof opts.controls === 'object' ? opts.controls : {})
    this.#updateGrid() // size the infinite grid to the initial viewport

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const subSelf = this
    this.#sub = new Subgraph({
      ed: subSelf,
      get app() { return subSelf.#app },
      get breadcrumbDisabled() { return subSelf.#breadcrumbDisabled },
      get breadcrumbEl() { return subSelf.#breadcrumbEl },
      set breadcrumbEl(v) { subSelf.#breadcrumbEl = v },
      get coreEvents() { return subSelf.#coreEvents },
      get currentDefId() { return subSelf.#currentDefId },
      set currentDefId(v) { subSelf.#currentDefId = v },
      get definitions() { return subSelf.#definitions },
      get displayBus() { return subSelf.#displayBus },
      set displayBus(v) { subSelf.#displayBus = v },
      get displayGraph() { return subSelf.#displayGraph },
      set displayGraph(v) { subSelf.#displayGraph = v },
      get diveStack() { return subSelf.#diveStack },
      get edgeRecords() { return subSelf.#edgeRecords as never },
      get edgesLayer() { return subSelf.#edgesLayer },
      get events() { return subSelf.#events },
      get expandingMacros() { return subSelf.#expandingMacros },
      get hiddenMembers() { return subSelf.#hiddenMembers },
      set hiddenMembers(v) { subSelf.#hiddenMembers = v },
      get interactive() { return subSelf.#interactive },
      get liveMode() { return subSelf.#liveMode },
      get macroFrameLastTap() { return subSelf.#macroFrameLastTap },
      set macroFrameLastTap(v) { subSelf.#macroFrameLastTap = v },
      get macroFrames() { return subSelf.#macroFrames },
      get macroFramesLayer() { return subSelf.#macroFramesLayer },
      get macroOverlayLayer() { return subSelf.#macroOverlayLayer },
      get macroParentIndex() { return subSelf.#macroParentIndex },
      set macroParentIndex(v) { subSelf.#macroParentIndex = v },
      get nodesLayer() { return subSelf.#nodesLayer },
      get renderOpts() { return subSelf.#renderOpts },
      get rootGraph() { return subSelf.#rootGraph },
      get templateRegistry() { return subSelf.#templateRegistry },
      get theme() { return subSelf.#theme },
      get viewport() { return subSelf.#viewport },
      get viewportTweenRaf() { return subSelf.#viewportTweenRaf },
      set viewportTweenRaf(v) { subSelf.#viewportTweenRaf = v },
      get views() { return subSelf.#views },
      get zoomBounds() { return subSelf.#zoomBounds },
      ensureSize: (node, render) => subSelf.#ensureSize(node, render),
      ensureView: (node) => subSelf.#ensureView(node),
      ensureWidgetOverlay: () => subSelf.#ensureWidgetOverlay(),
      propagateRerouteTypes: () => subSelf.#propagateRerouteTypes(),
      rebuildDisplay: () => subSelf.#rebuildDisplay(),
      requestRender: () => subSelf.#requestRender(),
      teardownDisplay: () => subSelf.#teardownDisplay(),
    })
  }

  #hostResizeObserver: ResizeObserver | null = null

  /** Show/configure/hide the built-in viewport controls. Pass options to create or reconfigure,
   *  `false` to remove. The widget is vanilla DOM in `overlayRoot`, so every framework shares it. */
  setControls(opts: ControlsOptions | false): void {
    if (opts === false) { this.#controls?.destroy(); this.#controls = null; return }
    void this.overlayRoot // ensure the overlay layer exists
    if (this.#controls) this.#controls.setOptions(opts)
    else this.#controls = new EditorControls(this, opts)
  }

  /** Write the active theme's panel/control `--xeno-*` custom properties onto the host so in-editor
   *  chrome (panels, controls, framework components portalled into `overlayRoot`) and DOM widgets
   *  inherit them and restyle on `setTheme`. */
  #applyThemeVars(): void {
    for (const [k, v] of Object.entries(themeCssVars(this.#theme.tokens))) {
      this.#host.style.setProperty(k, v)
    }
  }

  /** Screen-anchored DOM overlay over the canvas. Framework adapters portal in-editor panels and
   *  controls here; the container ignores pointer events so the canvas stays interactive, and each
   *  panel opts back in (`pointer-events: auto`). Inherits the theme's `--xeno-*` vars from the host. */
  get overlayRoot(): HTMLElement {
    if (!this.#overlayRoot) {
      if (getComputedStyle(this.#host).position === 'static') this.#host.style.position = 'relative'
      const root = document.createElement('div')
      root.setAttribute('data-xeno-overlay-root', '')
      // Starlight (Astro docs themes generally) drops a `margin-top: 1rem` on every
      // adjacent-sibling pair inside `.sl-markdown-content`. When the editor mounts inside a
      // Starlight page (landing showcases) this margin cascades into palette rows, panel buttons,
      // controls — bloating layout. Starlight provides `.not-content` as the escape hatch; with
      // it on the overlayRoot, the rule's `:where(.not-content *)` negation excludes every
      // descendant. Harmless outside Starlight (just an extra class).
      root.className = 'not-content'
      // zIndex above the DOM-widget layer (5) so chrome — panels, controls, minimap — always sits
      // on top of in-node DOM widgets (e.g. a large image-preview widget must never cover a panel).
      Object.assign(root.style, {
        position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '10',
        // Typography reset — consumer apps often inherit aggressive `font` shorthands at :root
        // (Vite React template sets `font: 18px/145%` + `letter-spacing: 0.18px`), and chrome
        // elements (palette, panels, breadcrumb) that rely on inheriting just font-family while
        // setting their own font-size end up with cascaded line-height / letter-spacing that
        // bloats their layout. Force a sane default here so chrome is isolated from host CSS.
        font: '13px/1.3 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        letterSpacing: 'normal',
        // `text-align` also inherits — and the Vite React template sets it to `center` on #root.
        // Without this reset every palette section header, item title and description ends up
        // centred. Force `left` (LTR) — descendants that need centering override locally.
        textAlign: 'left',
      } as Partial<CSSStyleDeclaration>)
      this.#host.appendChild(root)
      this.#overlayRoot = root
    }
    return this.#overlayRoot
  }

  #longPressRing: HTMLDivElement | null = null

  /** Paint a growing ring at the touch point so the user can see the long-press hold progressing.
   *  CSS `transition` runs for `ms` — at completion the ring is at full size & opacity, exactly
   *  when `intent:long-press` fires and the menu pops. Hidden behind pointer-events:none. */
  #beginLongPressRing(x: number, y: number, ms: number): void {
    this.#endLongPressRing(false)
    const root = this.overlayRoot
    const ring = document.createElement('div')
    Object.assign(ring.style, {
      position: 'absolute', left: `${x}px`, top: `${y}px`,
      width: '14px', height: '14px', borderRadius: '50%',
      transform: 'translate(-50%, -50%) scale(1)',
      border: '2px solid var(--xeno-accent, #FCB400)',
      opacity: '0.85', pointerEvents: 'none',
      transition: `transform ${ms}ms ease-out, opacity ${ms}ms ease-out`,
      willChange: 'transform, opacity',
    } as Partial<CSSStyleDeclaration>)
    root.appendChild(ring)
    this.#longPressRing = ring
    requestAnimationFrame(() => {
      if (!this.#longPressRing) return
      this.#longPressRing.style.transform = 'translate(-50%, -50%) scale(4)'
      this.#longPressRing.style.opacity = '0.15'
    })
  }

  #endLongPressRing(success: boolean): void {
    const ring = this.#longPressRing
    if (!ring) return
    this.#longPressRing = null
    if (success) {
      // Quick flash-out so the menu pops cleanly.
      ring.style.transition = 'transform 120ms ease-out, opacity 120ms ease-out'
      ring.style.transform = 'translate(-50%, -50%) scale(6)'
      ring.style.opacity = '0'
    } else {
      ring.style.transition = 'opacity 150ms ease-out'
      ring.style.opacity = '0'
    }
    setTimeout(() => ring.remove(), 200)
  }

  /** Enter fullscreen on the editor host. Uses the native Fullscreen API where supported (desktop,
   *  Android Chrome, iPadOS Safari 16+); falls back to a CSS pseudo-fullscreen (position:fixed
   *  inset:0 + high z-index) on iPhone Safari which still doesn't support requestFullscreen. */
  async enterFullscreen(): Promise<void> {
    if (this.isFullscreen()) return
    const el = this.#host as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
    if (typeof el.requestFullscreen === 'function') {
      try { await el.requestFullscreen(); return } catch { /* fall through to CSS fallback */ }
    } else if (typeof el.webkitRequestFullscreen === 'function') {
      try { await el.webkitRequestFullscreen(); return } catch { /* fall through */ }
    }
    el.classList.add('xeno-pseudo-fullscreen')
    if (!document.getElementById('xeno-pseudo-fullscreen-style')) {
      const s = document.createElement('style')
      s.id = 'xeno-pseudo-fullscreen-style'
      s.textContent =
        '.xeno-pseudo-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;' +
        'height:100dvh!important;z-index:2147483646!important;background:#000;}'
      document.head.appendChild(s)
    }
    this.#onResize()
  }

  async exitFullscreen(): Promise<void> {
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> }
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      try { await document.exitFullscreen() } catch { /* ignore */ }
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      try { await doc.webkitExitFullscreen() } catch { /* ignore */ }
    }
    this.#host.classList.remove('xeno-pseudo-fullscreen')
    this.#onResize()
  }

  toggleFullscreen(): Promise<void> {
    return this.isFullscreen() ? this.exitFullscreen() : this.enterFullscreen()
  }

  isFullscreen(): boolean {
    return document.fullscreenElement === this.#host || this.#host.classList.contains('xeno-pseudo-fullscreen')
  }

  /** Mark the scene dirty so the next ticker frame repaints. Cheap to call repeatedly — the flag
   *  collapses many calls in one frame into a single render. */
  #requestRender = (): void => { this.#needsRender = true }
  #resizeScheduled = false
  readonly #onResize = (): void => {
    // PIXI's `resizeTo: window` resizes the renderer on its OWN rAF, so the `resize` event fires
    // BEFORE `this.#app.screen` updates. Defer a frame (coalesced) so chrome reads fresh dims —
    // otherwise the minimap/grid keep the pre-resize layout (e.g. after closing devtools).
    if (this.#resizeScheduled) return
    this.#resizeScheduled = true
    requestAnimationFrame(() => {
      this.#resizeScheduled = false
      // Editor may have been destroyed between scheduling and the frame firing (React unmount,
      // HMR, etc.). PIXI's `app.screen` getter throws on a destroyed Application — gate on flag.
      if (this.#destroyed) return
      const screen = this.#app.screen
      this.#minimap?.place(screen.width, screen.height)
      this.#minimap?.setViewport(this.#viewport.state, screen.width, screen.height)
      this.#updateGrid()
      this.#domWidgets.position()
      this.#requestRender()
    })
  }

  #minimapSyncScheduled = false
  /** Coalesce many node mutations (e.g. a 1391-node loadJSON calling addNode per node) into one
   *  minimap rebuild on the next microtask. */
  #scheduleMinimapSync(): void {
    if (this.#minimapSyncScheduled || !this.#minimap) return
    this.#minimapSyncScheduled = true
    queueMicrotask(() => { this.#minimapSyncScheduled = false; this.#syncMinimap() })
  }

  /** Feed the minimap the current node rects (world space). */
  #syncMinimap(): void {
    if (!this.#minimap) return
    const nodes: { x: number; y: number; width: number; height: number }[] = []
    for (const n of this.graph.nodes()) {
      const size = n.size ?? { x: this.#theme.tokens.geometry.node.minWidth, y: 40 }
      nodes.push({ x: n.position.x, y: n.position.y, width: size.x, height: size.y })
    }
    this.#minimap.setData(nodes)
  }

  /** Create the WebGL minimap and wire its recenter-on-click; idempotent. Lets `setMinimapVisible`
   *  (and the declarative `<XenolithMiniMap>`) enable a minimap that wasn't requested at init. */
  #ensureMinimap(): Minimap {
    if (this.#minimap) return this.#minimap
    const mm = new Minimap(this.#theme.tokens)
    mm.onRecenter = (wx, wy) => {
      const vp = this.#viewport.state
      this.#viewport.setState({
        zoom: vp.zoom,
        x: this.#app.screen.width / 2 - wx * vp.zoom,
        y: this.#app.screen.height / 2 - wy * vp.zoom,
      })
    }
    this.#app.stage.addChild(mm.container)
    mm.place(this.#app.screen.width, this.#app.screen.height)
    this.#minimap = mm
    this.#syncMinimap()
    return mm
  }

  /** Show / hide the overview minimap. Creates it lazily the first time it's shown. */
  setMinimapVisible(visible: boolean): void {
    if (visible) this.#ensureMinimap()
    this.#minimap?.setVisible(visible)
    this.#requestRender()
  }
  /** Move the minimap to a standard anchor (8 directions) or exact screen coordinates. */
  setMinimapPosition(position: MinimapPosition): void { this.#minimap?.setPosition(position); this.#requestRender() }

  #frozen = false
  #freezeTimer: ReturnType<typeof setTimeout> | null = null
  #freezeRT: RenderTexture | null = null
  #frozenSprites: Sprite[] = []
  #captureVp: ViewportState | null = null

  /** Viewport changed (zoom/pan). For themes that opt in (`freezeOnNavigate`, e.g. Liquid Glass) we
   *  BAKE each node into a sprite at gesture start (its current pixels — background/refraction
   *  included), hide the live node, and let the baked sprites ride the world transform. Grid + edges
   *  stay live. When the view pans/zooms beyond what was captured we re-bake (else new area shows
   *  empty). A 130ms idle debounce restores the live nodes. Cheap themes (Xen) just repaint. (The
   *  per-node bake is also the basis for LOD: freeze off-screen / far-zoom nodes the same way.) */
  #onViewportChanged(): void {
    this.#updateGrid()
    if (!this.#theme.freezeOnNavigate) { this.#cullPending = true; this.#requestRender(); return }
    if (this.#frozen && this.#captureStale()) this.#endFreeze()
    if (!this.#frozen) this.#beginFreeze()
    this.#requestRender()
    if (this.#freezeTimer) clearTimeout(this.#freezeTimer)
    this.#freezeTimer = setTimeout(() => this.#endFreeze(), 130)
  }

  /** True when the live view has moved/zoomed beyond the baked sprites — time to re-capture so the
   *  newly-revealed area isn't blank and zoomed-in nodes stay crisp. */
  #captureStale(): boolean {
    const c = this.#captureVp
    if (!c) return true
    const v = this.#viewport.state
    if (v.zoom < c.zoom * 0.97 || v.zoom > c.zoom * 1.6) return true
    const sw = Math.max(1, this.#app.screen.width)
    const sh = Math.max(1, this.#app.screen.height)
    return Math.abs(v.x - c.x) > sw * 0.3 || Math.abs(v.y - c.y) > sh * 0.3
  }

  #beginFreeze(): void {
    const vp = this.#viewport.state
    const res = this.#app.renderer.resolution
    const sw = Math.max(1, this.#app.screen.width)
    const sh = Math.max(1, this.#app.screen.height)
    // Refresh the backdrop so the captured glass refraction is current, then snapshot the screen —
    // each node sprite is a sub-region of it, so we don't re-run the glass shader per node.
    this.#updateBackdrop()
    if (this.#freezeRT) this.#freezeRT.destroy(true)
    this.#freezeRT = RenderTexture.create({ width: sw, height: sh, resolution: res })
    this.#app.renderer.render({ container: this.#app.stage, target: this.#freezeRT })
    this.#captureVp = vp

    for (const [id, view] of this.#views) {
      const node = this.graph.getNode(id)
      if (!node?.size) continue
      const sx = node.position.x * vp.zoom + vp.x
      const sy = node.position.y * vp.zoom + vp.y
      const sWid = node.size.x * vp.zoom
      const sHei = node.size.y * vp.zoom
      // Skip nodes fully off-screen — nothing to bake.
      if (sx + sWid < 0 || sy + sHei < 0 || sx > sw || sy > sh) continue
      const frame = new Rectangle(
        Math.max(0, sx), Math.max(0, sy),
        Math.min(sWid, sw - Math.max(0, sx)), Math.min(sHei, sh - Math.max(0, sy)),
      )
      if (frame.width <= 0 || frame.height <= 0) continue
      const tex = new Texture({ source: this.#freezeRT.source, frame })
      const sprite = new Sprite(tex)
      sprite.eventMode = 'none'
      // Place back in world space at the (clipped) node rect; the world transform makes it track.
      sprite.position.set((frame.x - vp.x) / vp.zoom, (frame.y - vp.y) / vp.zoom)
      sprite.width = frame.width / vp.zoom
      sprite.height = frame.height / vp.zoom
      this.#nodesLayer.addChild(sprite)
      this.#frozenSprites.push(sprite)
      view.container.visible = false
    }
    this.#frozen = true
  }

  #endFreeze(): void {
    for (const s of this.#frozenSprites) { this.#nodesLayer.removeChild(s); s.destroy() }
    this.#frozenSprites = []
    this.#freezeRT?.destroy(true)
    this.#freezeRT = null
    for (const view of this.#views.values()) view.container.visible = true
    this.#frozen = false
    // Restoring visible=true blindly re-exposed collapsed-macro members. Re-apply macro rules so
    // hidden members go back to hidden.
    this.#applyMacroVisibility()
    this.#requestRender()
  }

  // ─── Viewport virtualization (#59) ────────────────────────────────────────────────────────────
  // Past the threshold (theme.virtualizeThreshold, default 300) only nodes near the viewport keep a
  // live PIXI view; off-screen nodes are data only (0 GPU). Hysteresis (inner create-band / outer
  // keep-band) stops create/destroy churn — and the resulting flicker — during a pan. At or below
  // the threshold this is fully inert: every node renders 1:1, exactly as before.
  #virtualizeInnerMargin = 256
  #virtualizeOuterMargin = 768
  #cullPending = false
  // Three-tier LOD: 'full' real nodes (close), 'sprite' one baked texture per node TYPE (mid —
  // recognisable + cheap, and crucially no LG per-node backdrop RTs), 'flat' a single batch of rects
  // (far). Boundaries carry hysteresis so a hovering zoom doesn't thrash. See lodLevel().
  #lodLevel: LODLevel = 'full'
  #lodThresholds: LODThresholds = { lowEnter: 0.18, lowExit: 0.24, highEnter: 0.42, highExit: 0.52 }
  /** Baked node textures, shared by signature (type + collapsed + category + size) — a handful of
   *  textures cover the whole graph since the node type-set is small. */
  readonly #bakeCache = new Map<string, Texture>()
  // Spatial grid: buckets node ids by world cell so culling queries only nodes near the viewport
  // instead of scanning the whole graph each frame — the O(N)-per-frame trap at 100k+ nodes.
  readonly #spatialCell = 1024
  readonly #spatialGrid = new Map<string, NodeId[]>()
  #spatialMaxW = 0
  #spatialMaxH = 0

  #virtualizeActive(): boolean {
    return shouldVirtualize(this.graph.nodeCount, this.#theme.virtualizeThreshold ?? 300)
  }

  /** True while `id` is being live-dragged (node drag or comment-group move) — its view sits at the
   *  cursor offset, ahead of the not-yet-committed `node.position`. */
  #isLiveDraggingNode(id: NodeId): boolean {
    if (this.#pointer.isDraggingNode(id)) return true
    if (this.#comments.isDraggingNode(id)) return true
    return false
  }

  /** Materialise a node's view if it has none; otherwise just refresh its position. */
  #ensureView(node: Node): NodeView {
    const existing = this.#views.get(node.id)
    if (existing) {
      // Don't yank a node that's mid-drag back to its committed position — a sync firing during the
      // drag (e.g. a per-tick widget write while animating) would otherwise make it jitter/teleport.
      if (!this.#isLiveDraggingNode(node.id)) existing.container.position.set(node.position.x, node.position.y)
      return existing
    }
    const opts = this.#renderOpts.get(node.id) ?? {}
    this.#ensureSize(node, opts)
    const view = this.#renderNode(node, opts)
    this.#views.set(node.id, view)
    this.#nodesLayer.addChild(view.container)
    this.#wireNodeInteraction(node.id, view)
    view.container.position.set(node.position.x, node.position.y)
    return view
  }

  /** Destroy a view because the node scrolled off-screen. The node stays as data, so — unlike a
   *  node removed from the graph — we must NOT clear its status or drop it from the selection. */
  #destroyViewOffscreen(id: NodeId): void {
    const view = this.#views.get(id)
    if (!view) return
    view.container.destroy({ children: true })
    this.#views.delete(id)
    this.#marqueeHovered.delete(id)
    if (this.#hoveredId === id) this.#hoveredId = null
  }

  /** Insert one node into the spatial grid (by its top-left cell) and grow the tracked max size. */
  #addToSpatialGrid(node: Node): void {
    const key = cellKey(node.position.x, node.position.y, this.#spatialCell)
    const bucket = this.#spatialGrid.get(key)
    if (bucket) bucket.push(node.id); else this.#spatialGrid.set(key, [node.id])
    if (node.size) {
      if (node.size.x > this.#spatialMaxW) this.#spatialMaxW = node.size.x
      if (node.size.y > this.#spatialMaxH) this.#spatialMaxH = node.size.y
    }
  }

  /** Rebuild the whole grid from the current graph — cheap O(N), run only on graph edits (sync),
   *  not per frame. Keeps buckets free of moved/removed ids. */
  #rebuildSpatialGrid(): void {
    this.#spatialGrid.clear()
    this.#spatialMaxW = 0
    this.#spatialMaxH = 0
    for (const n of this.graph.nodes()) this.#addToSpatialGrid(n as Node)
  }

  /** Node ids whose bounds intersect `rect`, gathered from the grid cells the rect overlaps (padded
   *  by the largest node so a node whose top-left sits just outside the rect is still caught). */
  #nodesInRect(rect: GeomRect): NodeId[] {
    const padded: GeomRect = {
      x: rect.x - this.#spatialMaxW,
      y: rect.y - this.#spatialMaxH,
      width: rect.width + this.#spatialMaxW,
      height: rect.height + this.#spatialMaxH,
    }
    const out: NodeId[] = []
    for (const key of cellsForRect(padded, this.#spatialCell)) {
      const bucket = this.#spatialGrid.get(key)
      if (!bucket) continue
      for (const id of bucket) {
        const n = this.graph.getNode(id)
        if (n && rectIntersects(nodeBounds(n as Node, this.#theme.tokens), rect)) out.push(id)
      }
    }
    return out
  }

  #addEdgeToIndex(edge: Edge): void {
    for (const nodeId of [edge.from.node, edge.to.node]) {
      const bucket = this.#edgesByNode.get(nodeId)
      if (bucket) bucket.push(edge.id); else this.#edgesByNode.set(nodeId, [edge.id])
    }
  }

  #rebuildEdgeIndex(): void {
    this.#edgesByNode.clear()
    for (const e of this.graph.edges()) this.#addEdgeToIndex(e as Edge)
  }

  /** Add an edge as DATA only (model + opts + index), no Graphics — the virtualized loadJSON path.
   *  #cullEdges materialises the visible ones later. */
  #addEdgeData(edge: Edge, opts: RenderEdgeOptions): void {
    this.graph.internals()._addEdge(edge)
    this.#edgeOpts.set(edge.id, opts)
    this.#addEdgeToIndex(edge)
  }

  /** Materialise only edges incident to a currently-live node; dispose the rest. Keeps the edge
   *  Graphics count O(visible) — without this, app.render walks every wire in the graph each frame
   *  (the real lag on large connected graphs). Only meaningful at the full LOD level. */
  #cullEdges(): void {
    const desired = new Set<EdgeId>()
    for (const nodeId of this.#views.keys()) {
      const inc = this.#edgesByNode.get(nodeId)
      if (inc) for (const eid of inc) desired.add(eid)
    }
    for (const eid of desired) {
      if (!this.#edgeRecords.has(eid)) {
        const edge = this.graph.getEdge(eid)
        if (edge) this.#materializeEdge(edge as Edge, this.#edgeOpts.get(eid) ?? {})
      }
    }
    for (const eid of [...this.#edgeRecords.keys()]) {
      if (!desired.has(eid)) this.#disposeEdgeGraphics(eid)
    }
  }

  /** World-space inner (create) and outer (keep) overscan rects for the current viewport. */
  #virtualizeBands(): { inner: GeomRect; outer: GeomRect } {
    const vp = this.#viewport.state
    const sw = Math.max(1, this.#app.screen.width)
    const sh = Math.max(1, this.#app.screen.height)
    return {
      inner: visibleWorldRect(sw, sh, vp, this.#virtualizeInnerMargin),
      outer: visibleWorldRect(sw, sh, vp, this.#virtualizeOuterMargin),
    }
  }

  /** Reconcile live views with the viewport (pan/zoom path) across the three LOD levels. */
  #cullToViewport(): void {
    if (!this.#virtualizeActive()) return
    // Comments virtualize on the same pan/zoom pass as nodes (thousands off-screen otherwise).
    if (this.graph.commentCount > 0) this.#comments.sync()
    const level = lodLevel(this.#viewport.state.zoom, this.#lodLevel, this.#lodThresholds)
    if (level !== this.#lodLevel) this.#applyLODLevel(level)
    // 'flat' draws the whole graph as static batch Graphics in world space — pan/zoom ride the
    // transform for free, nothing to reconcile.
    if (this.#lodLevel === 'flat') { this.#requestRender(); return }
    // 'full' and 'sprite' both virtualize per node; #ensureView builds the right kind of view.
    // The spatial grid keeps this O(visible): only nodes in the viewport's cells are examined, never
    // the whole graph. Hysteresis — create in the inner band, destroy past the outer band.
    const { inner, outer } = this.#virtualizeBands()
    const outerIds = new Set<string>(this.#nodesInRect(outer).map(String))
    let changed = false
    for (const id of this.#nodesInRect(inner)) {
      if (!this.#views.has(id)) { const n = this.graph.getNode(id); if (n) { this.#ensureView(n as Node); changed = true } }
    }
    for (const id of [...this.#views.keys()]) {
      if (!outerIds.has(String(id))) { this.#destroyViewOffscreen(id); changed = true }
    }
    if (!changed) return
    if (this.#lodLevel === 'full') this.#cullEdges() // wires follow the live nodes
    // A freshly-materialised view starts with visible=true, but if it's a member of a collapsed
    // macro it must stay hidden. Without this, paste-then-pan reveals "dissolved" members the
    // moment they re-enter the viewport — exactly the regression image #23 was showing.
    this.#applyMacroVisibility()
    this.#updateVisualStates()
    // NOT #scheduleMinimapSync(): culling only changes which views are live, not the graph data the
    // minimap draws (node positions are unchanged). Rebuilding it here meant an O(N) minimap repaint
    // every pan frame — the real lag at 100k+. The minimap's viewport frame still updates each tick.
    this.#requestRender()
  }

  /** Switch detail level: wipe live views (full↔sprite swaps the view kind; flat has none), toggle
   *  the layers, and (re)build the batch Graphics the new level needs. One-off cost per crossing. */
  #applyLODLevel(level: LODLevel): void {
    this.#lodLevel = level
    // Comments collapse to a plain rectangle at any non-full LOD (no per-frame gradient/title cost).
    const simpleComments = level !== 'full'
    this.#comments.setSimplified(simpleComments)
    for (const id of [...this.#views.keys()]) this.#destroyViewOffscreen(id)
    this.#lodLayer.removeChildren().forEach((c) => c.destroy())
    // Leaving full: the per-edge Graphics are replaced by the LOD line batch, so free them.
    if (level !== 'full') for (const id of [...this.#edgeRecords.keys()]) this.#disposeEdgeGraphics(id)
    if (level === 'full') {
      this.#nodesLayer.visible = true
      this.#edgesLayer.visible = true
      this.#lodLayer.visible = false
    } else if (level === 'sprite') {
      // Real edges hidden; draw them as the cheap line batch. Nodes become baked sprites (built lazily
      // by #cullToViewport via #ensureView), so the live node layer stays visible to host them.
      this.#nodesLayer.visible = true
      this.#edgesLayer.visible = false
      this.#lodLayer.addChild(this.#buildLODEdges())
      this.#lodLayer.visible = true
    } else {
      this.#nodesLayer.visible = false
      this.#edgesLayer.visible = false
      this.#lodLayer.addChild(this.#buildLODEdges(), this.#buildLODNodes())
      this.#lodLayer.visible = true
    }
  }

  /** Faint thin straight lines centre-to-centre for every edge, in one Graphics. The real bezier
   *  routing is invisible at this zoom and a per-edge Graphics each is what makes the wire-web crawl. */
  #buildLODEdges(): Graphics {
    const edges = new Graphics()
    const hidden = this.#hiddenMembers
    for (const e of this.graph.edges()) {
      if (hidden.has(e.from.node) || hidden.has(e.to.node)) continue
      const a = this.graph.getNode(e.from.node), b = this.graph.getNode(e.to.node)
      if (!a || !b) continue
      const aw = a.size?.x ?? 0, ah = a.size?.y ?? 0, bw = b.size?.x ?? 0, bh = b.size?.y ?? 0
      edges.moveTo(a.position.x + aw / 2, a.position.y + ah / 2)
      edges.lineTo(b.position.x + bw / 2, b.position.y + bh / 2)
    }
    edges.stroke({ color: 0x8a93a6, width: 2, alpha: 0.18 })
    return edges
  }

  /** One rounded rect per node, category colour at reduced brightness, all in one Graphics → a single
   *  draw call for the whole graph at far zoom. */
  #buildLODNodes(): Graphics {
    const tokens = this.#theme.tokens
    const radius = tokens.geometry.node.radius
    const nodes = new Graphics()
    const hidden = this.#hiddenMembers
    for (const n of this.graph.nodes()) {
      if (hidden.has(n.id)) continue
      const w = n.size?.x ?? tokens.geometry.node.minWidth
      const h = n.size?.y ?? tokens.geometry.node.headerHeight
      const ro = this.#renderOpts.get(n.id)
      const cat = resolveCategoryGradient(ro?.category, tokens, this.#categoryPalette, ro?.color)
      nodes.roundRect(n.position.x, n.position.y, w, h, radius).fill({ color: darkenColor(cat.start, 0.55) })
    }
    return nodes
  }

  /** Bake a node's default appearance (empty state — widgets at defaults) to a shared texture keyed
   *  by type/collapsed/category/size. Uses the base Xen renderNode (not theme.renderNode) so the LG
   *  glass shader — and its per-node backdrop RTs — are skipped entirely: the sprite is flat pixels. */
  #bakeNodeTexture(node: Node): Texture {
    const opts = this.#renderOpts.get(node.id) ?? {}
    const tokens = this.#theme.tokens
    const w = Math.max(1, Math.ceil(node.size?.x ?? tokens.geometry.node.minWidth))
    const h = Math.max(1, Math.ceil(node.size?.y ?? tokens.geometry.node.headerHeight))
    // Colour-affecting fields go in the cache key: a per-node colour or a palette entry for the
    // category changes the baked pixels, so two same-type nodes can't share a sprite blindly.
    const palette = this.#categoryPalette
    const catColour = opts.color ?? (opts.category && palette ? JSON.stringify(palette[opts.category]) : '')
    const sig = `${node.type}|${opts.collapsed ? 'c' : 'e'}|${opts.category ?? ''}|${catColour}|${w}x${h}`
    const cached = this.#bakeCache.get(sig)
    if (cached) return cached
    const blank: Node = { ...node, state: {} }
    const view = renderNode(blank, tokens, { ...opts, ...(palette ? { categoryPalette: palette } : {}), renderer: this.#app.renderer as never, customWidgets: this.#widgetControllers })
    // generateTexture() bakes the container correctly even when called repeatedly mid-frame — a raw
    // renderer.render(target) loop only filled the first texture and left the rest blank.
    const tex = this.#app.renderer.generateTexture({ target: view.container, frame: new Rectangle(0, 0, w, h) })
    view.container.destroy({ children: true })
    this.#bakeCache.set(sig, tex)
    return tex
  }

  /** Sprite-LOD view: a single baked-texture sprite. Edges are drawn by the line batch, so
   *  pinLocalPosition isn't needed for wires here (returns null). */
  #spriteViewFor(node: Node): NodeView {
    const container = new Container({ label: `node:${node.id}` })
    container.position.set(node.position.x, node.position.y)
    container.addChild(new Sprite(this.#bakeNodeTexture(node)))
    return {
      container,
      setVisualState: () => {},
      setCollapsed: () => {},
      isCollapsed: () => false,
      pinLocalPosition: () => null,
    }
  }


  /** Double-click on empty canvas opens the insert palette at the cursor. Skipped when the
   *  cursor is over a node (so double-clicking a node body never spawns a palette on top of it). */
  readonly #onDoubleClick = (e: MouseEvent): void => {
    if (this.#hoveredId !== null) {
      const n = this.graph.getNode(this.#hoveredId)
      // Double-clicking a macro toggles it (collapsed ⇄ expanded); a template instance dives into
      // its shared definition.
      if (n && isMacro(n)) this.toggleMacro(this.#hoveredId)
      else if (n && isTemplateInstance(n)) this.diveInto(this.#hoveredId)
      return
    }
    this.openPalette({ x: e.offsetX, y: e.offsetY })
  }

  /** Right-click on (or near) an edge opens its context menu — Add Reroute / Add Node. Right-click
   *  on empty canvas is ignored (lets the browser menu through is undesirable on a canvas, so we
   *  simply suppress and do nothing). */
  // Tracks a right-button press so we can fire the context menu on RELEASE (mouseup) only when
  // the pointer didn't move — right-mouse-drag is the pan gesture and must NOT pop the menu.
  #rightDownAt: { x: number; y: number } | null = null
  readonly #onRightDown = (e: PointerEvent): void => {
    if (e.button !== 2) return
    this.#rightDownAt = { x: e.clientX, y: e.clientY }
  }
  readonly #onRightUp = (e: PointerEvent): void => {
    if (e.button !== 2 || !this.#rightDownAt) return
    const dx = e.clientX - this.#rightDownAt.x
    const dy = e.clientY - this.#rightDownAt.y
    this.#rightDownAt = null
    // Movement threshold — pan, not a click. Tuned so a tiny accidental jitter (≤4px) still
    // counts as a click; deliberate drag suppresses the menu.
    if (Math.hypot(dx, dy) > 4) return
    this.#openMenuAt({ x: e.offsetX, y: e.offsetY })
  }

  /** HTML5 DnD — dragover MUST preventDefault to mark the area as a drop target. */
  readonly #onDragOver = (e: DragEvent): void => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
  /** Translate a file/text drop into a `node:drop` event with the world-space drop position and
   *  the node it landed on (if any). Hosts wire image uploaders, JSON loaders, etc. through this. */
  readonly #onDrop = (e: DragEvent): void => {
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return
    const screen = { x: e.offsetX, y: e.offsetY }
    const world = screenToWorld(screen, this.#viewport.state)
    const nodeId = this.#pickNodeAt(world)
    const files = Array.from(dt.files ?? [])
    const items: Record<string, string> = {}
    for (const t of dt.types) {
      // Skip the synthetic "Files" entry (it isn't a string payload — files are surfaced via `files`).
      if (t === 'Files') continue
      const data = dt.getData(t)
      if (data) items[t] = data
    }
    const text = items['text/plain'] ?? null
    this.#events.emit('node:drop', { nodeId, files, text, items, position: world })
  }

  /** True when there is a pickable target (pin / node / edge) under `screen` — used to gate the
   *  long-press ring so we don't promise a menu on empty canvas. Same hit-test ladder as #openMenuAt. */
  #hasMenuAt(screen: { x: number; y: number }): boolean {
    const world = screenToWorld(screen, this.#viewport.state)
    if (this.#pickPinAt(world)) return true
    if (this.#pickNodeAt(world) !== null) return true
    const tolerance = this.#theme.tokens.geometry.edge.midpointRadius + 5
    if (this.#pickEdgeAt(world, tolerance)) return true
    return false
  }

  /** Pick the deepest interactive target under `screen` (pin → node → edge midpoint → canvas) and
   *  open the matching context menu. Called from `#onRightUp` after confirming the gesture wasn't
   *  a pan. Emits preventable `*:contextmenu` event — listeners that call `cancel()` (e.g. a host
   *  with its own menu UI) suppress the built-in menu. */
  #openMenuAt(screen: { x: number; y: number }): void {
    const world = screenToWorld(screen, this.#viewport.state)
    const pinHit = this.#pickPinAt(world)
    if (pinHit) { this.#openPinMenu(pinHit.nodeId, pinHit.pinId, screen); return }
    const nodeId = (this.#hoveredId !== null && this.graph.getNode(this.#hoveredId)) ? this.#hoveredId : this.#pickNodeAt(world)
    if (nodeId !== null) {
      if (!firePreventable(this.#events, 'node:contextmenu', { nodeId, screen })) return
      this.#openNodeMenu(nodeId, screen)
      return
    }
    const tolerance = this.#theme.tokens.geometry.edge.midpointRadius + 5
    const edgeId = this.#pickEdgeAt(world, tolerance)
    if (edgeId) {
      if (!firePreventable(this.#events, 'edge:contextmenu', { edgeId, screen })) return
      this.#openEdgeMenu(edgeId, screen)
      return
    }
    // Empty canvas — let plugin items show; if none registered AND no listener engages, drop.
    if (!firePreventable(this.#events, 'canvas:contextmenu', { screen, worldPosition: world })) return
    this.#openCanvasMenu(screen, world)
  }

  /** Open a context menu for empty canvas. Built-in items are empty by default; only registered
   *  plugin items appear. If nothing's registered the menu is suppressed silently. */
  #openCanvasMenu(screen: { x: number; y: number }, world: { x: number; y: number }): void {
    const { start, end } = this.contextMenu.itemsFor({ kind: 'canvas', worldPosition: world })
    const items = [...start, ...end]
    if (items.length === 0) return
    this.#ensureEdgeMenu().open(screen, items)
  }

  /** Suppress the browser context menu — the editor opens its own on `pointerup` (`#onRightUp`)
   *  so right-button drag doesn't flash a menu mid-pan. */
  readonly #onContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
  }

  /** Topmost pin whose hit area contains `world`, or null. Walks live views (so it respects pin
   *  positions at the current zoom + per-node row heights). Used by the right-click pin menu. */
  #pickPinAt(world: { x: number; y: number }): { nodeId: NodeId; pinId: string } | null {
    const r = this.#theme.tokens.geometry.pin.diameter / 2 + this.#theme.tokens.geometry.pin.hitPadding
    let best: { nodeId: NodeId; pinId: string } | null = null
    let bestDist = r
    for (const n of this.graph.nodes()) {
      if (this.#hiddenMembers.has(n.id)) continue
      for (const pin of (n as Node).pins) {
        const pos = this.#pinWorldPosition(n as Node, String(pin.id))
        if (!pos) continue
        const d = Math.hypot(world.x - pos.x, world.y - pos.y)
        if (d <= bestDist) { bestDist = d; best = { nodeId: n.id as NodeId, pinId: String(pin.id) } }
      }
    }
    return best
  }

  /** Open the pin context menu for one specific pin. MVP item: Unbind — disconnects every edge
   *  attached to that pin in one undoable transaction.
   *
   *  Inline `$reroute` knots are pure edge midpoints (split a wire visually, no fan-out, no
   *  unbinding semantics). Showing "Unbind" on them is meaningless — Delete the reroute removes
   *  the knot and reconnects the wire end-to-end. So the pin menu is suppressed entirely on
   *  inline reroutes; right-click should fall through to the node menu instead. */
  #openPinMenu(nodeId: NodeId, pinId: string, screen: { x: number; y: number }): void {
    const node = this.graph.getNode(nodeId)
    if (node && isReroute(node)) return
    const incident: EdgeId[] = []
    for (const edge of this.graph.edges()) {
      if ((edge.from.node === nodeId && String(edge.from.pin) === pinId) ||
          (edge.to.node   === nodeId && String(edge.to.pin)   === pinId)) {
        incident.push(edge.id as EdgeId)
      }
    }
    const menu = this.#ensureEdgeMenu()
    const items: EdgeMenuItem[] = []
    items.push({
      label: incident.length > 1 ? 'Unbind (all wires)' : 'Unbind',
      hint: incident.length > 0 ? `${incident.length} wire${incident.length === 1 ? '' : 's'}` : 'no wires',
      onSelect: () => {
        if (incident.length === 0) return
        this.commandBus.transaction(() => {
          for (const eid of incident) this.deleteEdge(eid)
        })
        this.#requestRender()
      },
    })
    menu.open(screen, items)
  }

  /** Topmost visible node whose box contains a world point (iteration order ≈ paint order, so the
   *  last match wins). Skips hidden macro members. Used by the right-click node menu. */
  #pickNodeAt(world: { x: number; y: number }): NodeId | null {
    let hit: NodeId | null = null
    for (const n of this.graph.nodes()) {
      if (this.#hiddenMembers.has(n.id)) continue
      const size = n.size ?? { x: 0, y: 0 }
      if (world.x >= n.position.x && world.x <= n.position.x + size.x &&
          world.y >= n.position.y && world.y <= n.position.y + size.y) hit = n.id as NodeId
    }
    return hit
  }

  /** Open the node context menu. Right-clicking a node that isn't part of the current selection
   *  selects just it first. Items depend on how many nodes are selected: one → Delete; many → Group
   *  (in-place collapse macro) or Convert to Template (reusable subgraph). */
  #openNodeMenu(nodeId: NodeId, screen: { x: number; y: number }): void {
    if (!this.selection.ids().some((id) => id === nodeId)) this.selection.replaceWith([nodeId])
    const count = this.selection.ids().length
    const menu = this.#ensureEdgeMenu()
    if (count <= 1) {
      // Rename is offered only for "our" nodes — template instances, macro groups, and a template's
      // I/O boundary nodes — not arbitrary nodes, to avoid confusing per-node title editing. Unpack /
      // Ungroup are the inverse of Convert to Template / Group.
      const node = this.graph.getNode(nodeId)
      const renamable = !!node && (isTemplateInstance(node) || isMacro(node) || isTemplateBoundary(node))
      const items: EdgeMenuItem[] = []
      if (renamable) items.push({ label: 'Rename', hint: 'F2', onSelect: () => this.#editNodeTitle(nodeId) })
      if (node && isTemplateInstance(node)) {
        items.push({ label: 'Convert to Group', hint: 'editable', onSelect: () => { this.convertTemplateInstanceToMacro(nodeId); this.#requestRender() } })
        items.push({ label: 'Unpack', hint: 'inline', onSelect: () => this.unpackTemplateInstance(nodeId) })
      } else if (node && isMacro(node)) {
        items.push({ label: 'Convert to Template', hint: 'reusable', onSelect: () => { this.convertMacroToTemplate(nodeId); this.#requestRender() } })
        items.push({ label: 'Ungroup', hint: 'dissolve', onSelect: () => this.ungroupMacro(nodeId) })
      }
      items.push({ label: 'Delete', hint: 'Del', onSelect: () => { this.deleteSelected(); this.#requestRender() } })
      const plugin = this.contextMenu.itemsFor({ kind: 'node', nodeId })
      menu.open(screen, [...plugin.start, ...items, ...plugin.end])
    } else {
      const plugin = this.contextMenu.itemsFor({ kind: 'node', nodeId })
      menu.open(screen, [...plugin.start,
        { label: 'Group', hint: '⌘G', onSelect: () => { this.createMacroFromSelection(); this.#requestRender() } },
        { label: 'Convert to Template', hint: '⌘⇧G', onSelect: () => { this.createTemplateFromSelection(); this.#requestRender() } },
        ...plugin.end,
      ])
    }
  }

  /** Open the edge context menu at `screen` for `edgeId`. */
  #openEdgeMenu(edgeId: EdgeId, screen: { x: number; y: number }): void {
    const edge = this.graph.getEdge(edgeId)
    if (!edge) return
    const srcNode = this.graph.getNode(edge.from.node)
    const dstNode = this.graph.getNode(edge.to.node)
    const srcType = String(srcNode?.pins.find((p) => String(p.id) === String(edge.from.pin))?.type ?? 'any')
    const dstType = String(dstNode?.pins.find((p) => String(p.id) === String(edge.to.pin))?.type ?? 'any')
    const world = screenToWorld(screen, this.#viewport.state)
    if (!this.#edgeMenu) this.#edgeMenu = new EdgeContextMenu(this.#host, this.#theme.paletteStyle)
    const plugin = this.contextMenu.itemsFor({ kind: 'edge', edgeId })
    this.#edgeMenu.open(screen, [...plugin.start,
      { label: 'Add Reroute', hint: 'dot', onSelect: () => { this.insertRerouteOnEdge(edgeId, world); this.#requestRender() } },
      { label: 'Add Node', hint: 'search', onSelect: () => {
          this.#pendingEdgeSplice = { edgeId, srcType, dstType }
          this.openPalette(screen)
        } },
      { label: 'Delete', hint: 'break', onSelect: () => { this.deleteEdge(edgeId); this.#requestRender() } },
      ...plugin.end,
    ])
  }

  /** Force a repaint on the next frame regardless of internal dirty tracking. Hosts can call
   *  this after mutating the canvas element / DPR or any state the editor can't observe.
   *
   *  @internal — renderer internals; hidden from the public `.d.ts` at v1.0. */
  requestRender(): void { this.#requestRender() }

  /** Ephemeral position write — bypasses the command bus AND syncs the view + incident edges in
   *  the same beat. The autolayout plugin's tween uses this per animation frame; the FINAL
   *  position commits once through a normal MoveNode so undo stays clean. */
  #setNodePositionEphemeral(nodeId: NodeId, x: number, y: number): void {
    const node = this.graph.getNode(nodeId)
    if (!node) return
    ;(node as { position: { x: number; y: number } }).position = { x, y }
    const view = this.#views.get(nodeId)
    if (view) view.container.position.set(x, y)
    const incident = this.#edgesByNode.get(nodeId)
    if (incident) for (const eid of incident) this.#redrawEdge(eid)
    this.#requestRender()
  }

  /** Show or hide the stats overlay (FPS, node/edge/selection counts, zoom). Hotkey: backtick.
   *  No render cost when hidden — the overlay is detached from the DOM. */
  setStatsVisible(visible: boolean): void {
    if (visible === this.#statsVisible) return
    this.#statsVisible = visible
    if (visible) {
      if (!this.#statsEl) this.#statsEl = this.#createStatsOverlay()
      // Ensure overlay positions relative to the host, not the page.
      if (getComputedStyle(this.#host).position === 'static') {
        this.#host.style.position = 'relative'
      }
      this.#host.appendChild(this.#statsEl)
      this.#statsFrame = 0
      this.#tickStats()
    } else if (this.#statsEl?.parentElement) {
      this.#statsEl.parentElement.removeChild(this.#statsEl)
    }
  }
  toggleStats(): void { this.setStatsVisible(!this.#statsVisible) }

  // ===== Themeable busy/rendering overlay ======================================================

  #ensureOverlay(): void {
    if (this.#overlayEl) return
    if (!document.getElementById('xeno-overlay-style')) {
      const style = document.createElement('style')
      style.id = 'xeno-overlay-style'
      style.textContent = '@keyframes xeno-spin { to { transform: rotate(360deg) } }'
      document.head.appendChild(style)
    }
    const el = document.createElement('div')
    el.setAttribute('data-xeno-overlay', '')
    Object.assign(el.style, {
      position: 'absolute', inset: '0', zIndex: '1500',
      display: 'none', alignItems: 'center', justifyContent: 'center',
      opacity: '0', pointerEvents: 'none',
      transition: 'opacity 260ms ease',
    } as Partial<CSSStyleDeclaration>)

    const card = document.createElement('div')
    Object.assign(card.style, {
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 20px', borderRadius: '12px',
      font: "600 14px 'Inter', system-ui, sans-serif", letterSpacing: '0.02em',
    } as Partial<CSSStyleDeclaration>)

    const spinner = document.createElement('div')
    Object.assign(spinner.style, {
      width: '20px', height: '20px', borderRadius: '50%',
      borderStyle: 'solid', borderWidth: '2.5px',
      animation: 'xeno-spin 0.7s linear infinite',
    } as Partial<CSSStyleDeclaration>)

    const label = document.createElement('div')
    label.textContent = 'Rendering…'

    card.append(spinner, label)
    el.appendChild(card)
    if (getComputedStyle(this.#host).position === 'static') this.#host.style.position = 'relative'
    this.#host.appendChild(el)
    this.#overlayEl = el
    this.#overlayCard = card
    this.#overlaySpinner = spinner
    this.#overlayLabel = label
    this.#styleOverlay()
  }

  /** Apply the active theme's PaletteStyle to the overlay (frosted card for Liquid Glass, dark for
   *  Xen) plus an accent-coloured spinner. */
  #styleOverlay(): void {
    if (!this.#overlayEl) return
    const s = this.#theme.paletteStyle
    const accent = s?.accent ?? '#FCB400'
    const text = s?.textColor ?? '#FFFFFF'
    const muted = s?.mutedColor ?? 'rgba(255,255,255,0.25)'
    // Scrim: always a soft blur over the scene so the heavy first render is hidden.
    Object.assign(this.#overlayEl.style, {
      background: 'rgba(0, 0, 0, 0.28)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    } as Partial<CSSStyleDeclaration>)
    Object.assign(this.#overlayCard!.style, {
      background: s?.panelBackground ?? 'rgba(20,20,20,0.7)',
      border: `1px solid ${s?.panelBorder ?? 'rgba(255,255,255,0.12)'}`,
      boxShadow: s?.panelShadow ?? '0 12px 40px rgba(0,0,0,0.5)',
      backdropFilter: s?.backdropFilter ?? 'none', WebkitBackdropFilter: s?.backdropFilter ?? 'none',
      color: text,
    } as Partial<CSSStyleDeclaration>)
    Object.assign(this.#overlaySpinner!.style, { borderColor: muted, borderTopColor: accent } as Partial<CSSStyleDeclaration>)
  }

  #overlayHideTimer: ReturnType<typeof setTimeout> | null = null

  /** Show the busy overlay with `label`, immediately (no fade-in) so it covers a blocking render. */
  showOverlay(label = 'Rendering…'): void {
    this.#ensureOverlay()
    if (this.#overlayHideTimer) { clearTimeout(this.#overlayHideTimer); this.#overlayHideTimer = null }
    if (this.#overlayLabel) this.#overlayLabel.textContent = label
    const el = this.#overlayEl!
    el.style.display = 'flex'
    el.style.transition = 'none'
    el.style.opacity = '1'
    // Force reflow so a subsequent fade-out animates from opacity 1.
    void el.offsetHeight
    el.style.transition = 'opacity 260ms ease'
  }

  /** Fade the busy overlay out, then fully detach it (`display:none`) so its backdrop blur stops
   *  costing GPU once hidden. */
  hideOverlay(): void {
    if (!this.#overlayEl) return
    const el = this.#overlayEl
    el.style.opacity = '0'
    if (this.#overlayHideTimer) clearTimeout(this.#overlayHideTimer)
    this.#overlayHideTimer = setTimeout(() => { el.style.display = 'none'; this.#overlayHideTimer = null }, 300)
  }

  /** Run `work` (a possibly-heavy, possibly-async load) behind the themeable busy overlay: the
   *  overlay paints first, then `work` runs, then we wait for the resulting render frame to paint,
   *  then fade the overlay out. Keeps big-graph loads smooth instead of a frozen pop-in. */
  async withOverlay<T>(label: string, work: () => T | Promise<T>): Promise<T> {
    this.showOverlay(label)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      return await work()
    } finally {
      this.#requestRender()
      // Wait for the (heavy) render frame to actually paint before revealing the scene.
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      this.hideOverlay()
    }
  }

  #createStatsOverlay(): HTMLDivElement {
    const el = document.createElement('div')
    el.setAttribute('data-xeno-stats', '')
    Object.assign(el.style, {
      position:        'absolute',
      top:             '12px',
      right:           '12px',
      zIndex:          '1000',
      fontFamily:      'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize:        '11px',
      lineHeight:      '1.5',
      color:           'rgba(255, 255, 255, 0.92)',
      background:      'rgba(0, 0, 0, 0.55)',
      backdropFilter:  'blur(8px)',
      border:          '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius:    '6px',
      padding:         '8px 12px',
      pointerEvents:   'none',
      whiteSpace:      'pre',
      userSelect:      'none',
    })
    return el
  }

  #tickStats(): void {
    // Throttle DOM updates to ~10 Hz so the readout stays legible and we don't burn CPU on
    // textContent assignment 60 times a second.
    this.#statsFrame++
    if (this.#statsFrame % 6 !== 0) return
    const el = this.#statsEl
    if (!el) return
    const fps  = this.#app.ticker.FPS.toFixed(0).padStart(3)
    const ms   = this.#app.ticker.deltaMS.toFixed(1).padStart(5)
    const vp   = this.#viewport.state
    el.textContent =
      `FPS    ${fps}  (${ms} ms)\n` +
      `Nodes  ${this.graph.nodeCount}\n` +
      `Edges  ${this.graph.edgeCount}\n` +
      `Sel    ${this.selection.size}\n` +
      `Zoom   ${vp.zoom.toFixed(2)}`
  }

  static async init(
    target: string | HTMLElement,
    opts: XenolithEditorOptions = {},
  ): Promise<XenolithEditor> {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    if (!(el instanceof HTMLElement)) {
      throw new Error(
        `XenolithEditor.init: target ${JSON.stringify(target)} did not resolve to an HTMLElement`,
      )
    }
    // BitmapText atlas resolution — node/pin/widget text uses one shared atlas instead of a
    // texture per Text instance. Bake at device DPR so it stays crisp when zoomed in.
    BitmapFontManager.defaultOptions.resolution = Math.ceil(window.devicePixelRatio || 1)
    const theme = resolveTheme(opts.theme)
    if (theme.fonts?.length) {
      const fontOpts = opts.fontUrls ? { selfHost: opts.fontUrls } : {}
      await loadFonts(theme.fonts, fontOpts)
    }
    const app = new Application()
    const initOpts: Parameters<Application['init']>[0] = {
      background: opts.background ?? theme.tokens.color.surface.canvas,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preference: opts.renderer ?? 'webgl',
    }
    if (opts.resizeToWindow !== false) initOpts.resizeTo = window
    await app.init(initOpts)
    // Mark the host so Starlight (Astro docs themes) doesn't apply its `.sl-markdown-content`
    // sibling-margin rules to the canvas and overlay chrome. `.not-content` is Starlight's escape
    // hatch — harmless outside Starlight (just an additional class on the user's element).
    el.classList.add('not-content')
    // Typography reset on the host — every chrome DOM child (palette, edge-menu, widget-overlay,
    // controls, panels, breadcrumb, minimap, perf overlay) is appended either here or into
    // overlayRoot; both descend from the host. Resetting once at the host means each child
    // inherits sane defaults instead of the consumer app's `:root { font: 18px/145% }`,
    // `text-align: center`, `letter-spacing: 0.18px` etc. Color stays inherited so theme tokens
    // can still flow through if a theme relies on that.
    Object.assign(el.style, {
      font: '13px/1.3 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      letterSpacing: 'normal',
      textAlign: 'left',
    } as Partial<CSSStyleDeclaration>)
    el.appendChild(app.canvas)
    const editor = new XenolithEditor(app, el, theme, opts)
    // Debug aid for screenshot tooling, e2e probes, perf measurements — always expose the most
    // recently constructed editor on globalThis. Overwritten by next init, no leak.
    ;(globalThis as { __xenoEditor?: XenolithEditor }).__xenoEditor = editor
    return editor
  }

  // ----- theme hook wrappers ---------------------------------------------------------------
  // Every visual element goes through these so that #theme.<hook> wins when present, with the
  // built-in Xen renderer as a fallback. Keeps the rest of the editor agnostic to which theme
  // is currently active.

  #renderNode(node: Node, opts: RenderNodeOptions): NodeView {
    const enriched: RenderNodeOptions = {
      ...opts,
      ...(this.#categoryPalette ? { categoryPalette: this.#categoryPalette } : {}),
      renderer: this.#app.renderer as never,
      requestRender: this.#requestRender,
      customWidgets: this.#widgetControllers,
      types: this.#types,
      connectedPinIds: this.#connectedPinIdsFor(node.id),
      ...(this.#pinLiveValueFor(node.id) ? { pinLiveValue: this.#pinLiveValueFor(node.id)! } : {}),
      // Mark a node with a header glyph (explicit node.glyph, or the built-in template/group markers)
      // so kinds read apart without relying on colour.
      ...(() => { const g = this.#resolveGlyph(node); return g ? { glyph: g } : {} })(),
    }
    if (isReroute(node)) {
      return this.#theme.renderReroute?.(node, enriched, this.#themeContext())
        ?? renderRerouteNode(node, this.#theme.tokens, enriched)
    }
    if (node.type === REROUTE_NODE_TYPE) {
      return this.#theme.renderRerouteNode?.(node, enriched, this.#themeContext())
        ?? renderRerouteNodeBox(node, this.#theme.tokens, enriched)
    }
    // Mid-zoom sprite LOD: a baked-texture sprite instead of the live node (recognisable + cheap, and
    // for Liquid Glass it skips the per-node backdrop RTs that make overlaps crawl).
    if (this.#lodLevel === 'sprite') return this.#spriteViewFor(node)
    return this.#theme.renderNode?.(node, enriched, this.#themeContext()) ?? renderNode(node, this.#theme.tokens, enriched)
  }
  #drawEdge(g: Graphics, from: PinLayout, to: PinLayout, opts: RenderEdgeOptions): Graphics {
    const merged = mergeEdgeOptions(this.#defaultEdgeOptions, opts)
    return this.#theme.drawEdge?.(g, from, to, merged) ?? drawEdge(g, from, to, this.#theme.tokens, merged)
  }
  #renderEdge(from: PinLayout, to: PinLayout, opts: RenderEdgeOptions): Graphics {
    return this.#drawEdge(new Graphics(), from, to, opts)
  }
  #createGrid(): Container {
    return this.#theme.createGrid?.() ?? createGridSprite(this.#theme.tokens)
  }

  /** True when a DOM input/textarea/select/contenteditable has focus (a widget or comment editor) —
   *  callers suppress canvas zoom/pan so the wheel scrolls/does nothing instead of warping the view. */
  #htmlFieldFocused(): boolean {
    const el = document.activeElement as HTMLElement | null
    if (!el) return false
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
  }

  #ensureEdgeMenu(): EdgeContextMenu {
    if (!this.#edgeMenu) this.#edgeMenu = new EdgeContextMenu(this.#host, this.#theme.paletteStyle)
    return this.#edgeMenu
  }

  /** Make the background grid effectively infinite: instead of one giant fixed TilingSprite (which
   *  runs out on huge graphs — hence empty zones when you pan far), resize/reposition it to cover
   *  exactly the visible world rect each viewport change, keeping the dot pattern phase-aligned to
   *  the world grid. Only applies to the default TilingSprite grid; custom theme grids are left as-is. */
  #updateGrid(): void {
    const layer = this.#gridLayer
    // The grid TilingSprite is the layer itself (Xen) or nested in a backdrop Container (Liquid
    // Glass wraps it with a gradient sprite). Find whichever and keep it covering the viewport.
    const g = layer instanceof TilingSprite
      ? layer
      : layer?.children.find((c): c is TilingSprite => c instanceof TilingSprite)
    if (!g) return
    const vp = this.#viewport.state
    const sw = Math.max(1, this.#app.screen.width)
    const sh = Math.max(1, this.#app.screen.height)
    const rect = visibleWorldRect(sw, sh, vp, 64) // small overscan so a fast pan never shows an edge
    g.position.set(rect.x, rect.y)
    g.width = rect.width
    g.height = rect.height
    const spacing = this.#theme.tokens.background.grid.spacing
    g.tilePosition.set(-rect.x % spacing, -rect.y % spacing)
  }

  #createBackdropRT(): RenderTexture {
    const rt = RenderTexture.create({
      width:      Math.max(1, this.#app.screen.width),
      height:     Math.max(1, this.#app.screen.height),
      resolution: this.#app.renderer.resolution,
      antialias:  true,
    })
    // Clear to the canvas colour immediately so glass nodes that render before the first
    // #updateBackdrop sample the background, not an uninitialised (black) texture.
    this.#app.renderer.render({
      container: new Container(), target: rt, clear: true,
      clearColor: this.#theme.tokens.color.surface.canvas,
    })
    return rt
  }

  /** Render the world for backdrop sampling. Painter's-order compositing:
   *
   *   1. Shared base backdrop = world minus nodes (edges, grid, comments). One RT.
   *   2. AABB-overlap plan via `computeOverlapBackdropPlan` against paint-order list of nodes.
   *      Nodes with no lower-overlapping neighbours share the base RT (cheap path).
   *   3. For each overlapping node in paint order: render base + lower-overlapping neighbours
   *      into a personal RT, then notify the theme via `onNodeBackdrop(id, source)`. Lower
   *      neighbours are already rendered with their own current backdrop textures (we process
   *      bottom-up), so the composition refracts correctly through multiple stacked glass nodes.
   *   4. Nodes that left the plan since last frame are reset to the shared backdrop via
   *      `onNodeBackdrop(id, null)`.
   *
   * No-op when the active theme has `needsBackdrop = false`. */
  #updateBackdrop(): void {
    if (!this.#backdropRT) return
    const sw = Math.max(1, this.#app.screen.width)
    const sh = Math.max(1, this.#app.screen.height)
    if (this.#backdropRT.width !== sw || this.#backdropRT.height !== sh) {
      this.#backdropRT.resize(sw, sh)
      for (const rt of this.#perNodeBackdropRT.values()) rt.resize(sw, sh)
    }

    // Comment frames (body + header layers) are NOT part of the glass refraction stack — keep them
    // out of every backdrop render so glass nodes don't sample/refract them (and we don't pay to
    // draw them per node).
    const commentsWereVisible = this.#commentsLayer.visible
    const commentHeadersWereVisible = this.#commentHeadersLayer.visible
    const macroFramesWereVisible = this.#macroFramesLayer.visible
    const macroOverlayWasVisible = this.#macroOverlayLayer.visible
    this.#commentsLayer.visible = false
    this.#commentHeadersLayer.visible = false
    this.#macroFramesLayer.visible = false
    this.#macroOverlayLayer.visible = false

    // Paint-order list of node IDs with their world-space AABBs. During a drag we use the
    // container.position (live, snap-aware) instead of node.position (only committed on drop)
    // so overlap detection works during the drag, not after.
    const rects: { id: string; x: number; y: number; width: number; height: number }[] = []
    const containerById = new Map<string, Container>()
    for (const [id, view] of this.#views) {
      const node = this.graph.getNode(id)
      if (!node) continue
      // Skip nodes that aren't part of the live node layer: collapsed-macro members (hidden) and
      // expanded-macro members (in the overlay). Otherwise Pass 2 would toggle them visible into a
      // personal backdrop RT and the glass node above would refract those ghosts (the LG artifact).
      if (this.#hiddenMembers.has(id) || view.container.parent !== this.#nodesLayer) continue
      const size = node.size ?? { x: 150, y: 70 }
      rects.push({
        id:     String(id),
        x:      view.container.position.x,
        y:      view.container.position.y,
        width:  size.x,
        height: size.y,
      })
      containerById.set(String(id), view.container)
    }
    const plan = computeOverlapBackdropPlan(rects)

    // Clear the backdrop RTs to the canvas colour, not transparent/black — the world backdrop
    // (gradient + grid) is finite, so anything a glass node samples beyond its extent must read as
    // the background, otherwise far-out nodes refract a black void.
    const clearColor = this.#theme.tokens.color.surface.canvas

    // Pass 1 — shared base backdrop: hide every node, render stage, restore.
    const nodesWereVisible = this.#nodesLayer.visible
    this.#nodesLayer.visible = false
    this.#app.renderer.render({ container: this.#app.stage, target: this.#backdropRT, clearColor })
    this.#nodesLayer.visible = nodesWereVisible

    // Pass 2 — per-overlapping-node personal backdrops. Restore nodesLayer; we'll toggle
    // individual node containers' visibility instead of hiding the whole layer.
    if (plan.size > 0) {
      const visBackup = new Map<string, boolean>()
      for (const [id, container] of containerById) {
        visBackup.set(id, container.visible)
        container.visible = false
      }
      // Iterate plan in paint order so lower nodes' personal RTs are committed before higher
      // nodes that depend on them render. Map iteration order matches insertion order which
      // matches the paint-order loop in computeOverlapBackdropPlan.
      for (const [nodeId, lowerIds] of plan) {
        let rt = this.#perNodeBackdropRT.get(nodeId as NodeId)
        if (!rt) {
          rt = RenderTexture.create({
            width:      sw,
            height:     sh,
            resolution: this.#app.renderer.resolution,
            antialias:  true,
          })
          this.#perNodeBackdropRT.set(nodeId as NodeId, rt)
        }
        for (const lid of lowerIds) {
          const c = containerById.get(lid)
          if (c) c.visible = true
        }
        this.#app.renderer.render({ container: this.#app.stage, target: rt, clearColor })
        for (const lid of lowerIds) {
          const c = containerById.get(lid)
          if (c) c.visible = false
        }
        this.#theme.onNodeBackdrop?.(nodeId, rt.source)
      }
      // Restore.
      for (const [id, container] of containerById) {
        container.visible = visBackup.get(id) ?? true
      }
    }

    // Nodes that were in last frame's plan but not this frame: revert to shared backdrop.
    // We pass the shared backdrop source explicitly (not null) so the theme just swaps the
    // mesh's uBackdropTex back to it — passing null would fall back to Texture.WHITE and the
    // glass body would render as a blank pale rectangle.
    const sharedSource = this.#backdropRT.source
    for (const oldId of this.#lastOverlapPlan.keys()) {
      if (!plan.has(oldId)) {
        this.#theme.onNodeBackdrop?.(oldId, sharedSource)
        const rt = this.#perNodeBackdropRT.get(oldId as NodeId)
        if (rt) {
          rt.destroy(true)
          this.#perNodeBackdropRT.delete(oldId as NodeId)
        }
      }
    }
    this.#lastOverlapPlan = plan
    this.#commentsLayer.visible = commentsWereVisible
    this.#commentHeadersLayer.visible = commentHeadersWereVisible
    this.#macroFramesLayer.visible = macroFramesWereVisible
    this.#macroOverlayLayer.visible = macroOverlayWasVisible
  }

  /** Theme hooks read this to drive backdrop-sampling shaders. */
  #themeContext(): ThemeRenderContext {
    return { backdropTexture: this.#backdropRT?.source ?? null }
  }

  /** Build a text measurer from the active theme's font family. Falls back to a crude char-width
   *  estimate when CanvasTextMetrics is unavailable (no 2D canvas — e.g. some test envs). */
  #makeTextMeasure(theme: XenolithTheme): TextMeasurer {
    const fontFamily = theme.tokens.typography.fontFamily
    try {
      const pixi = createPixiTextMeasurer(fontFamily)
      pixi('test', 12, 700) // probe — throws here if there is no canvas backend
      return pixi
    } catch {
      return (text, fontSize) => text.length * fontSize * 0.55
    }
  }

  #sizeTokens(): NodeSizeTokens {
    const g = this.#theme.tokens.geometry
    const t = this.#theme.tokens.typography
    return {
      node:   { minWidth: g.node.minWidth, headerHeight: g.node.headerHeight, headerPadding: g.node.headerPadding },
      pin:    { diameter: g.pin.diameter, rowSpacing: g.pin.rowSpacing, rowHeight: g.pin.rowHeight, labelGap: g.pin.labelGap },
      header: { toPinsGap: g.header.toPinsGap, chevronSize: g.header.chevronSize, titleGap: g.header.titleGap },
      typography: {
        titleSize: t.heading.size, titleWeight: t.heading.weight,
        labelSize: t.label.size,   labelWeight: t.label.weight,
      },
      widget: { rowHeight: g.widget.rowHeight, gap: g.widget.gap, controlMinWidth: g.widget.controlMinWidth },
    }
  }

  /** Backfill a content-derived size when the host/command gave none (palette inserts, ComfyUI
   *  imports, reroute splices). One resolved size keeps renderer, geom bounds, edge endpoints and
   *  backdrop in sync. Called from both `addNode` and the command-driven sync path. */
  #ensureSize(node: Node, render: RenderNodeOptions): void {
    if (node.size) return
    node.size = isReroute(node)
      ? rerouteSize(this.#theme.tokens)
      : node.type === REROUTE_NODE_TYPE
        ? rerouteBoxSize(this.#theme.tokens)
        : measureNodeSize(node, render.title ?? node.type, this.#sizeTokens(), this.#textMeasure, (k) => this.#isPinConnected(node.id, k))
  }

  /** Add a node as DATA only — graph model + render opts + size, no PIXI view. Used by the
   *  virtualized loadJSON path where views are materialised lazily by #cullToViewport(). */
  #addNodeData(node: Node, render: RenderNodeOptions = {}): void {
    this.#ensureSize(node, render)
    this.graph.internals()._addNode(node)
    this.#renderOpts.set(node.id, render)
    this.#addToSpatialGrid(node)
  }

  addNode(node: Node, render: RenderNodeOptions = {}): Node {
    this.#addNodeData(node, render)
    // Virtualized + off-screen → leave it as data; #cullToViewport materialises it when it scrolls
    // into view. This is what lets procedural mass-adds (addNode in a loop) stay bounded too.
    if (!this.#virtualizeActive() || this.#nodeIntersects(node, this.#virtualizeBands().inner)) {
      this.#ensureView(node)
    }
    if (node.widgets?.some((w) => w.type === 'custom')) this.#domWidgets.sync()
    this.#scheduleMinimapSync()
    this.#requestRender()
    return node
  }

  // ----- comments (public API) — all go through the command bus, so they're undoable -----

  /** Add a comment/group frame. Defaults to a frame at the last cursor world-position. Returns its id. */
  addComment(opts: { position?: { x: number; y: number }; size?: { x: number; y: number }; text?: string; color?: string } = {}): CommentId {
    const id = createCommentId()
    const comment: Comment = {
      id,
      position: opts.position ?? (this.#lastPointerWorld ? { ...this.#lastPointerWorld } : { x: 0, y: 0 }),
      size: opts.size ?? { x: 240, y: 160 },
      text: opts.text ?? 'Comment',
      ...(opts.color !== undefined ? { color: opts.color } : {}),
    }
    this.commandBus.apply(new AddComment(comment))
    return id
  }

  removeComment(id: CommentId): void {
    if (this.graph.getComment(id)) this.commandBus.apply(new RemoveComment(id))
  }

  setCommentText(id: CommentId, text: string): void {
    if (this.graph.getComment(id)) this.commandBus.apply(new SetCommentText(id, text))
  }

  setCommentColor(id: CommentId, color: string): void {
    const c = this.graph.getComment(id)
    if (c) this.commandBus.apply(new SetCommentText(id, c.text, color))
  }

  // ----- macro (public API) — inline collapse, pin-proxied; all through the command bus -----
  createMacroFromSelection(memberIds?: NodeId[], title = 'Macro'): NodeId | null {
    return this.#sub.createMacroFromSelection(memberIds, title)
  }
  ungroupMacro(id: NodeId): boolean {
    return this.#sub.ungroupMacro(id)
  }
  createTemplateFromSelection(memberIds?: NodeId[], title = 'Template'): NodeId | null {
    return this.#sub.createTemplateFromSelection(memberIds, title)
  }
  #extractTemplateFromMembers(members: Node[], title: string, hiddenMembers: Node[] = []): NodeId | null {
    return this.#sub.extractTemplateFromMembers(members, title, hiddenMembers)
  }
  #registerTemplateSchema(defId: TemplateDefId): void {
    return this.#sub.registerTemplateSchema(defId)
  }
  renameTemplate(defId: TemplateDefId, title: string): void {
    return this.#sub.renameTemplate(defId, title)
  }
  unpackTemplateInstance(id: NodeId): boolean {
    return this.#sub.unpackTemplateInstance(id)
  }
  convertTemplateInstanceToMacro(id: NodeId): NodeId | null {
    return this.#sub.convertTemplateInstanceToMacro(id)
  }
  convertMacroToTemplate(id: NodeId): NodeId | null {
    return this.#sub.convertMacroToTemplate(id)
  }
  #instantiateTemplateInstance(defId: TemplateDefId, worldPos: { x: number; y: number }): Node | null {
    return this.#sub.instantiateTemplateInstance(defId, worldPos)
  }
  #insertTemplateInstance(defId: TemplateDefId, worldPos: { x: number; y: number }, opts: { center?: boolean }): Node | null {
    return this.#sub.insertTemplateInstance(defId, worldPos, opts)
  }
  #diveChainDefs(): ReadonlySet<TemplateDefId> {
    return this.#sub.diveChainDefs()
  }
  #wouldRecurse(defId: TemplateDefId): boolean {
    return this.#sub.wouldRecurse(defId)
  }
  diveInto(instanceId: NodeId): boolean {
    return this.#sub.diveInto(instanceId)
  }
  diveOut(toDepth = this.diveDepth - 1): void {
    return this.#sub.diveOut(toDepth)
  }
  #flushActiveDefinition(): void {
    return this.#sub.flushActiveDefinition()
  }
  #resyncInstancePins(defId: TemplateDefId): void {
    return this.#sub.resyncInstancePins(defId)
  }
  #updateBreadcrumb(): void {
    return this.#sub.updateBreadcrumb()
  }
  expandMacro(id: NodeId): void {
    return this.#sub.expandMacro(id)
  }
  #tweenViewportToMacroIfNeeded(id: NodeId): void {
    return this.#sub.tweenViewportToMacroIfNeeded(id)
  }
  #tweenViewport(target: ViewportState, durationMs: number): void {
    return this.#sub.tweenViewport(target, durationMs)
  }
  collapseMacro(id: NodeId): void {
    return this.#sub.collapseMacro(id)
  }
  #animateMacroCollapse(id: NodeId, onDone: () => void): void {
    return this.#sub.animateMacroCollapse(id, onDone)
  }
  #animateMacroExpand(id: NodeId): void {
    return this.#sub.animateMacroExpand(id)
  }
  toggleMacro(id: NodeId): void {
    return this.#sub.toggleMacro(id)
  }
  #materializeLoadedMacros(): void {
    return this.#sub.materializeLoadedMacros()
  }
  #pinInfo(node: NodeId, pin: PinId): { type: string; label?: string } {
    return this.#sub.pinInfo(node, pin)
  }
  #findEdge(from: { node: NodeId; pin: PinId }, to: { node: NodeId; pin: PinId }): Edge | undefined {
    return this.#sub.findEdge(from, to)
  }
  #setMacroCollapsed(id: NodeId, collapsed: boolean): void {
    return this.#sub.setMacroCollapsed(id, collapsed)
  }
  #applyMacroVisibility(): void {
    return this.#sub.applyMacroVisibility()
  }
  #invalidateMacroIndex(): void {
    return this.#sub.invalidateMacroIndex()
  }
  #rebuildMacroIndex(): Map<NodeId, NodeId> {
    return this.#sub.rebuildMacroIndex()
  }
  #ensureMacroIndex(): Map<NodeId, NodeId> {
    return this.#sub.ensureMacroIndex()
  }
  #macroParentOf(nid: NodeId): Node | undefined {
    return this.#sub.macroParentOf(nid)
  }
  #macroDepthOf(id: NodeId): number {
    return this.#sub.macroDepthOf(id)
  }
  #macroIsAncestor(ancestor: NodeId, id: NodeId): boolean {
    return this.#sub.macroIsAncestor(ancestor, id)
  }
  #deepestExpandedMacro(): NodeId | null {
    return this.#sub.deepestExpandedMacro()
  }
  #reparentMacros(): void {
    return this.#sub.reparentMacros()
  }
  #macroFrameRect(id: NodeId): { x: number; y: number; width: number; height: number } | null {
    return this.#sub.macroFrameRect(id)
  }
  #syncMacroFrames(expandedMacros: ReadonlySet<NodeId>): void {
    return this.#sub.syncMacroFrames(expandedMacros)
  }
  #wireMacroFrame(id: NodeId, frame: MacroFrameView): void {
    return this.#sub.wireMacroFrame(id, frame)
  }
  #editMacroTitle(id: NodeId): void {
    return this.#sub.editMacroTitle(id)
  }
  #editNodeTitle(id: NodeId): void {
    return this.#sub.editNodeTitle(id)
  }
  #renderNodeTitleLive(id: NodeId, title: string, full: boolean): void {
    return this.#sub.renderNodeTitleLive(id, title, full)
  }
  #resizeNodeView(id: NodeId): void {
    return this.#sub.resizeNodeView(id)
  }
  #commitNodeRename(id: NodeId, text: string): void {
    return this.#sub.commitNodeRename(id, text)
  }
  get definitions() { return this.#sub.definitions }
  get diveDepth() { return this.#sub.diveDepth }
  #nodeIntersects(node: Node, rect: GeomRect): boolean {
    return rectIntersects(nodeBounds(node, this.#theme.tokens), rect)
  }

  /** THE canonical way to wire two nodes (E2). Pin refs resolve exactly like the MCP
   *  `connect_pins` tool — see `pin-resolve.ts`: pin id → label (case-insensitive) → numeric
   *  index → `'in'`/`'out'` keyword → `undefined` = the node's single pin of that direction.
   *
   *  Unlike the pre-0.7.5 direct-index `connect`, this routes through the command bus: the edge
   *  is UNDOABLE (one `history.undo()` removes it), fires `edge:connecting` (vetoable — a veto
   *  throws) and `edge:connected`, runs the built-in type-compatibility gate (`canConnect` +
   *  the optional `isValidConnection` hook — same gate a drag-dropped wire passes), and seeds
   *  the wire's render opts with the source pin's type so wire colours match pin colours.
   *
   *  Throws on: unresolvable ref (message lists the node's available pins of the needed
   *  direction), incompatible pins, or an `edge:connecting` veto. For mirroring a controlled
   *  `edges` prop with pre-existing ids, use `addEdge` instead.
   *
   *  @example editor.connect(src, 'Output', sink, 'In')
   *  @example editor.connect(src, 0, sink, 0)            // index overload (legacy shape)
   *  @example editor.connect(src, undefined, sink, undefined) // single-pin nodes */
  connect(
    fromNode: Node,
    fromRef: PinSelector,
    toNode: Node,
    toRef: PinSelector,
    opts: RenderEdgeOptions = {},
  ): EdgeId {
    const fromPin = resolvePin<Pin>(fromNode, fromRef, 'out')
    const toPin = resolvePin<Pin>(toNode, toRef, 'in')
    if (!this.#connectionAllowed(fromNode, fromPin, toNode, toPin)) {
      throw new Error(
        `connect: incompatible pins — ${fromNode.type}.${fromPin.label ?? fromPin.id}(${fromPin.type}, ${fromPin.direction}) `
        + `→ ${toNode.type}.${toPin.label ?? toPin.id}(${toPin.type}, ${toPin.direction}). `
        + 'Wires need opposite directions, matching kinds and compatible types (or an `any` wildcard).',
      )
    }
    const edge: Edge = {
      id: createEdgeId(),
      from: { node: fromNode.id, pin: fromPin.id },
      to:   { node: toNode.id,   pin: toPin.id   },
    }
    if (!firePreventable(this.#events, 'edge:connecting', { edge })) {
      throw new Error(`connect: edge vetoed by an 'edge:connecting' listener (${fromNode.type} → ${toNode.type})`)
    }
    // Default the wire's colour source to the OUT pin type (drag-path parity); caller opts win.
    // Set BEFORE the command lands so the bridge's synchronous listeners (index sync, endpoint
    // repaint) and a later #cullEdges re-materialise see the same opts.
    this.#edgeOpts.set(edge.id, { sourceType: String(fromPin.type), ...opts })
    this.commandBus.apply(new ConnectPins(edge))
    return edge.id
  }

  /** Move a node to an absolute world position (undoable). View reconciles on the next microtask via
   *  the command-bus sync. Used by the React controlled layer to reflect a `nodes` prop change. */
  moveNode(nodeId: NodeId, position: { x: number; y: number }): boolean {
    if (!this.graph.getNode(nodeId)) return false
    this.commandBus.apply(new MoveNode(nodeId, position))
    return true
  }

  /** Remove a node and its incident edges (undoable). Listeners on `node:removing` may veto
   *  via `payload.cancel()` — returns false in that case without touching the command bus. */
  removeNode(nodeId: NodeId): boolean {
    if (!this.graph.getNode(nodeId)) return false
    if (!firePreventable(this.#events, 'node:removing', { nodeId })) return false
    this.commandBus.apply(new RemoveNode(nodeId))
    return true
  }

  /** Add a pre-built edge, preserving its id and pin endpoints (undoable). Unlike `connect`, which
   *  mints a fresh edge id, this keeps the caller's id — needed by the controlled layer to mirror an
   *  `edges` prop without id drift. No-op if an edge with that id already exists. Listeners on
   *  `edge:connecting` may veto via `payload.cancel()` (returns false). For hand-building graphs
   *  prefer the canonical `connect(from, ref, to, ref)` — it resolves pin labels/indices, gates
   *  on compatibility and throws loudly; this method is the mirroring/low-level escape hatch. */
  addEdge(edge: Edge): boolean {
    if (this.graph.getEdge(edge.id)) return false
    if (!firePreventable(this.#events, 'edge:connecting', { edge })) return false
    this.commandBus.apply(new ConnectPins(edge))
    return true
  }

  /** Disconnect an edge by id (undoable). Listeners on `edge:disconnecting` may veto. For destructive
   *  removal that also cleans up dangling inline reroutes left behind, use `deleteEdge`. */
  disconnectEdge(edgeId: EdgeId): boolean {
    if (!this.graph.getEdge(edgeId)) return false
    if (!firePreventable(this.#events, 'edge:disconnecting', { edgeId })) return false
    this.commandBus.apply(new DisconnectEdge(edgeId))
    return true
  }

  /** Replace the current selection with the given node ids (fires `selection:changed`). */
  setSelection(nodeIds: readonly NodeId[]): void {
    this.selection.replaceWith(nodeIds)
  }

  // ---- widgets ---------------------------------------------------------------------------------

  #widgetSpec(nodeId: NodeId, widgetId: string): { node: Node; spec: WidgetSpec } | null {
    const node = this.graph.getNode(nodeId)
    const spec = node?.widgets?.find((w) => w.id === widgetId)
    return node && spec ? { node, spec } : null
  }

  /** Register a custom widget controller. Either **canvas-draw** (fast, painted to a WebGL texture)
   *  or **DOM-mounted** (arbitrary HTML — the contract the React/Vue/Svelte adapters wrap). A
   *  `custom` widget's `renderer` field names the controller. */
  registerWidget(name: string, controller: CustomWidgetController): void {
    this.#widgetControllers.set(name, controller)
    this.#domWidgets.sync()
  }

  /** Provider that resolves the live runtime value flowing into a node's bound pin (typically
   *  registered by a runtime plugin such as `@xenolithengine/graph-plugin-runtime`). A `'always'` (display)
   *  widget reads this when its bound pin is connected — that's how Output-style preview nodes
   *  show what's wired through them. Without a provider, display widgets fall back to state. */
  #pinLiveValueProvider: ((nodeId: NodeId, pinKey: string) => unknown) | null = null
  setPinLiveValueProvider(fn: ((nodeId: NodeId, pinKey: string) => unknown) | null): void {
    this.#pinLiveValueProvider = fn
    this.#requestRender()
  }
  #pinLiveValueFor(nodeId: NodeId): ((pinKey: string) => unknown) | undefined {
    const p = this.#pinLiveValueProvider
    if (!p) return undefined
    return (k) => p(nodeId, k)
  }

  // ---- DOM-mounted custom widgets (extraction M2 -> dom-widgets.ts) ------------------------
  // Screen-space layer over the canvas hosting framework/HTML widgets, glued to their nodes'
  // on-screen widget rects every painted frame. The layer object owns the div + mounted map.
  #domWidgets!: DomWidgetLayer
  #export!: ExportController

  /** True when the data IN-pin identified by `pinKey` (matched against pin label, then id) has
   *  ≥1 incoming edge. Drives pin-bound widget visibility — a widget bound to a connected pin is
   *  hidden so the pin's normal label takes the row width. */
  #isPinConnected(nodeId: NodeId, pinKey: string): boolean {
    const node = this.graph.getNode(nodeId)
    if (!node) return false
    const pin = findPinByKey(node as Node, pinKey)
    if (!pin) return false
    const pinId = String(pin.id)
    // Walk only edges INCIDENT to this node — O(node.degree), not O(graph.E). Called per-frame from
    // `#positionDomWidgets` for every visible DOM widget, so the index lookup is what keeps a 10k
    // node + 9k edge graph at 60fps; a naïve `graph.edges()` walk would melt it.
    for (const eid of this.#edgesByNode.get(nodeId) ?? []) {
      const e = this.graph.getEdge(eid as EdgeId)
      if (e && String(e.to.node) === String(nodeId) && String(e.to.pin) === pinId) return true
    }
    return false
  }

  /** Resolve the value a widget should display: live runtime value when its bound pin is wired
   *  AND visibility is 'always' (display widgets), else the stored state default. Applies to
   *  BOTH custom and built-in widgets — display-mode contract is widget-type-agnostic. */
  #widgetDisplayValue(node: Node, w: WidgetSpec): unknown {
    const bind = widgetBindKey(w)
    if (bind && widgetVisibility(w) === 'always' && this.#isPinConnected(node.id, bind)) {
      const live = this.#pinLiveValueProvider?.(node.id, bind)
      if (live !== undefined) return live
    }
    return widgetValue(node, w)
  }
  /** True when the widget is a "live readout" — bound IN-pin is wired AND visibility is 'always'.
   *  Editing such widgets is suppressed (the next live update would clobber the change). */
  #isDisplayModeWidget(node: Node, w: WidgetSpec): boolean {
    const bind = widgetBindKey(w)
    return !!bind && widgetVisibility(w) === 'always' && this.#isPinConnected(node.id, bind)
  }

  /** Theme accent/text/muted for a custom widget, so canvas/DOM widgets can match the active
   *  theme (gold on Xen, cyan on LG) unless their own `style` overrides those tokens. */
  #widgetThemeColors(spec?: { style?: WidgetStyle }): { accent: string; text: string; muted: string } {
    const r = resolveWidgetStyle(this.#theme.tokens, spec?.style)
    return { accent: r.fill, text: r.text, muted: r.label }
  }

  /** Subscribe to a public editor event (node/edge lifecycle, selection, viewport, widgets,
   *  history). Returns an unsubscribe fn. See {@link EditorEvents} for the full surface. */
  on<E extends keyof EditorEvents>(event: E, handler: (payload: EditorEvents[E]) => void): () => void {
    return this.#events.on(event, handler)
  }

  /** Current value of a widget (clamped `node.state[key]`, or its default). */
  getWidgetValue(nodeId: NodeId, widgetId: string): unknown {
    const found = this.#widgetSpec(nodeId, widgetId)
    return found ? widgetValue(found.node, found.spec) : undefined
  }

  /** Set a widget's value. Clamps to the widget's constraints, refreshes the widget, and emits
   *  `widget:changed`. No-op for valueless widgets (button).
   *
   *  By default the write is undoable (a `SetNodeState` command). Pass `{ ephemeral: true }` for a
   *  transient write (e.g. a simulation updating readouts every tick): the state is mutated in place,
   *  the widget repaints and `widget:changed` fires, but NO command is pushed onto the undo stack —
   *  so a per-frame writer doesn't bloat undo history. */
  setWidgetValue(nodeId: NodeId, widgetId: string, value: unknown, opts?: { ephemeral?: boolean }): void {
    const found = this.#widgetSpec(nodeId, widgetId)
    if (!found || found.spec.key === undefined) return
    const clamped = clampWidgetValue(found.spec, value)
    if (opts?.ephemeral) {
      const node = this.graph.getNode(nodeId)
      if (node) (node.state as Record<string, unknown>)[found.spec.key] = clamped
    } else {
      this.commandBus.apply(new SetNodeState(nodeId, { [found.spec.key]: clamped }))
    }
    // A state-only change doesn't trigger a node re-render in #syncFromGraph, so refresh the
    // widget's visual directly (combo/number/text would otherwise show the stale value).
    this.#views.get(nodeId)?.updateWidget?.(widgetId, clamped)
    // A1 — displayOptions.show: if any sibling widget conditions its visibility on this node's
    // state, the change might toggle it on/off, which changes layout (height + widget rects). Do
    // a full rerender ONLY when the node opts in (avoids the per-keystroke rebuild on plain nodes).
    // CRITICAL: recompute node.size before the rerender — measureNodeSize is the single source for
    // backdrop/edges/bounds, and the existing cached size doesn't know about the new visibility.
    const node = this.graph.getNode(nodeId) as Node | undefined
    if (node?.widgets?.some((w) => w.displayOptions?.show !== undefined)) {
      const title = this.#renderOpts.get(nodeId)?.title ?? node.type
      node.size = measureNodeSize(node, title, this.#sizeTokens(), this.#textMeasure, (k) => this.#isPinConnected(nodeId, k))
      this.#rerenderNode(nodeId)
    }
    // Propagate to downstream display widgets: if THIS widget is bound to an OUT-pin, every IN-pin
    // it feeds may host a `visibility:'always'` widget that needs to repaint with the new live
    // value (built-in OR custom — display-mode contract is widget-type-agnostic). Without this,
    // moving an upstream slider leaves downstream readouts stale until something else triggers a
    // node re-render. Edges incident to the source are O(degree) via #edgesByNode.
    this.#propagateToDisplayConsumers(nodeId, found.spec)
    this.#requestRender()
    this.#events.emit('widget:changed', { nodeId, widgetId, value: clamped })
    // H2 — defineDynamicNode: if the node's schema declares a `dynamic` callback, let it
    // recompute pins/widgets from the latest state. We do this AFTER emitting widget:changed
    // so listeners observing the value see it before any structural pin/widget mutation lands.
    this.#applyDynamicSchema(nodeId)
  }

  #applyDynamicSchema(nodeId: NodeId): void {
    const node = this.graph.getNode(nodeId) as Node | undefined
    if (!node) return
    const dyn = this.#registry.get(node.type)?.dynamic
    if (!dyn) return
    let result: { pins?: PinSchema[]; widgets?: WidgetSpec[] } | undefined
    try { result = dyn(node) } catch { return }
    if (!result) return
    if (result.pins) {
      const pins: Pin[] = result.pins.map((p, i) => {
        const existing = node.pins[i]
        // Reuse existing pin id when possible (preserves incident edges); mint fresh otherwise.
        const id = existing && existing.label === p.label && existing.direction === p.direction
          ? existing.id
          : createPinId()
        const pin: Pin = {
          id, kind: p.kind, direction: p.direction, type: p.type,
          multiple: p.multiple ?? false,
        }
        if (p.label !== undefined) pin.label = p.label
        if (p.default !== undefined) pin.default = p.default
        return pin
      })
      this.setNodePins(nodeId, pins)
    }
    if (result.widgets) this.setNodeWidgets(nodeId, result.widgets)
  }

  #propagateToDisplayConsumers(srcNodeId: NodeId, srcSpec: WidgetSpec): void {
    const bind = widgetBindKey(srcSpec)
    if (!bind) return
    const srcNode = this.graph.getNode(srcNodeId)
    if (!srcNode) return
    const srcPin = srcNode.pins.find((p) => p.label === bind || String(p.id) === bind)
    if (!srcPin || srcPin.direction !== 'out') return
    const out = this.#edgesByNode.get(srcNodeId)
    if (!out) return
    for (const eid of out) {
      const edge = this.graph.getEdge(eid)
      if (!edge || String(edge.from.pin) !== String(srcPin.id)) continue
      const dstNode = this.graph.getNode(edge.to.node)
      if (!dstNode || !dstNode.widgets) continue
      const dstView = this.#views.get(edge.to.node)
      if (!dstView?.updateWidget) continue
      for (const w of dstNode.widgets) {
        const dbind = widgetBindKey(w)
        if (!dbind || widgetVisibility(w) !== 'always') continue
        const dpin = dstNode.pins.find((p) => p.label === dbind || String(p.id) === dbind)
        if (!dpin || String(dpin.id) !== String(edge.to.pin)) continue
        const live = this.#widgetDisplayValue(dstNode as Node, w)
        dstView.updateWidget(w.id, live)
      }
    }
  }

  /** Registry of node schemas. Hosts register their node types here; the insert palette searches
   *  it. e.g. `editor.registry.register({ type: 'Transform', title: 'Transform', pins: [...] })`. */
  get registry(): NodeRegistry { return this.#registry }

  /** Registry of custom pin-type descriptors (colour/shape/compatibility). Drives connection
   *  validation and pin colours. e.g. `editor.types.register({ id: 'struct:Agent', color: '#9b59ff' })`. */
  get types(): TypeRegistry { return this.#types }

  /** Toggle the dive breadcrumb (Root › Def1 › Def2 …) in the overlay root. Visible by default
   *  whenever the editor is inside a template definition (`diveDepth > 0`). Hosts that render
   *  their own navigation can `setBreadcrumbVisible(false)` to suppress. */
  setBreadcrumbVisible(visible: boolean): void {
    this.#breadcrumbDisabled = !visible
    this.#updateBreadcrumb()
  }

  /** Named-commands registry — hosts register their own actions (`editor.commands.register({id,
   *  label, execute, canExecute?, hotkey?})`) and Xenolith routes matching key chords through
   *  it. Baklava commandHandler parity. The hotkey listener fires BEFORE built-in shortcuts so
   *  hosts can override them. */
  get commands(): CommandRegistry { return this.#commands }

  /** Open the properties sidebar for `nodeId` — a DOM panel that lists every widget on that
   *  node flagged with `showInSidebar: true`. Theme-aware (--xeno-* CSS vars). Lazy: the panel
   *  is created on first open and reused. Programmatic only — there's no per-node cog button;
   *  hosts wire their own trigger (toolbar button, double-click, palette command). No-op when
   *  `nodeId` doesn't exist. Fires `sidebar:opened`. */
  openSidebar(nodeId: NodeId): void {
    this.#ensureSidebar()
    this.#sidebar!.open(nodeId)
  }
  closeSidebar(): void { this.#sidebar?.close() }
  isSidebarOpen(): boolean { return this.#sidebar?.isOpen() ?? false }
  /** Re-read the open node's state and repaint the panel. Wired internally to widget:changed
   *  + setNodeWidgets; hosts rarely call this directly. */
  refreshSidebar(): void { this.#sidebar?.refresh() }

  /** G6 — persistent palette sidebar. Docked DOM panel listing every registered NodeSchema
   *  grouped by category, draggable onto the canvas. Off by default; toggle with `true`/`false`.
   *  Drag-and-drop is wired through the canvas's existing `node:drop` event — the panel sets
   *  `text/plain` to the schema's `type`, the editor inserts it at the drop point automatically. */
  setPaletteSidebar(opts: boolean | PaletteSidebarOpts): void {
    if (opts === false) {
      this.#paletteSidebar?.unmount()
      this.#paletteSidebar = null
      return
    }
    const cfg = opts === true ? {} : opts
    if (!this.#paletteSidebar) {
      this.#paletteSidebar = new PaletteSidebar(this.#registry, this.overlayRoot, cfg)
      this.#paletteSidebar.mount()
      // Auto-insertNode when a palette item is dropped on the canvas. Host listeners can also
      // observe `node:drop` to layer on validation / snapping; this default path keeps the
      // panel useful out of the box.
      this.on('node:drop', (e) => {
        if (e.text && this.#registry.has(e.text)) this.insertNode(e.text, e.position)
      })
    } else {
      this.#paletteSidebar.refresh()
    }
  }

  #ensureSidebar(): void {
    if (this.#sidebar) return
    this.#sidebar = new SidebarManager({
      overlayRoot: this.overlayRoot,
      getNode: (id) => this.graph.getNode(id) as Node | undefined,
      getNodeTitle: (id) => this.#renderOpts.get(id)?.title,
      setWidgetValue: (nodeId, widgetId, value) => this.setWidgetValue(nodeId, widgetId, value),
      onOpen: (nodeId) => this.#events.emit('sidebar:opened', { nodeId }),
      onClose: () => this.#events.emit('sidebar:closed', {}),
    })
    // Keep the panel in sync with state mutations + structural changes. Cheap (no-op when closed).
    this.on('widget:changed', () => this.#sidebar?.refresh())
    this.on('node:removed', ({ nodeId }) => {
      if (this.#sidebar?.currentNodeId() === nodeId) this.#sidebar.close()
    })
  }

  /** Registry of header glyph icons. Has a built-in Feather set (`layers`, `box`, `cpu`, `database`,
   *  `branch`, `code`, `play`, …); add your own via `editor.icons.register('name', '<path …/>')`.
   *  Set a node's glyph through `NodeSchema.glyph` or `editor.setNodeGlyph(id, { icon, side })`. */
  get icons(): IconRegistry { return this.#icons }

  /** Set (or clear with `null`) a node's header glyph at runtime — overrides any schema glyph. The
   *  icon must be registered in `editor.icons`. Re-renders the node (it refits to the glyph). */
  setNodeGlyph(nodeId: NodeId, glyph: NodeGlyph | null): void {
    const node = this.graph.getNode(nodeId)
    if (!node) return
    if (glyph) (node as { glyph?: NodeGlyph }).glyph = { ...glyph }
    else delete (node as { glyph?: NodeGlyph }).glyph
    delete (node as { size?: unknown }).size // the glyph reserves header width → refit
    this.#rerenderNode(nodeId)
    this.#requestRender()
  }

  /** Resolve a node's effective header glyph to drawable svg + side: an explicit `node.glyph` wins,
   *  else the built-in template/group markers. Returns undefined for a plain node. */
  #resolveGlyph(node: Node): { svg: string; side: 'left' | 'right' } | undefined {
    if (node.glyph) {
      const svg = this.#icons.get(node.glyph.icon)
      if (svg) return { svg, side: node.glyph.side ?? 'left' }
    }
    if (isTemplateInstance(node)) return { svg: this.#icons.get('layers')!, side: 'left' }
    if (isMacro(node)) return { svg: this.#icons.get('box')!, side: 'left' }
    return undefined
  }

  /** Install a plugin. `install` runs immediately with a {@link PluginContext}; any returned
   *  disposer runs on `destroy()`. Throws if a plugin with the same `name` is already installed. */
  use(plugin: XenolithPlugin): void { this.#pluginHost.use(plugin) }

  /** Build the stable facade handed to a plugin's `install`. `graph`/`commandBus` are getters so a
   *  plugin always reads the currently displayed graph (root, or a dived template definition). */
  #pluginContext(): PluginContext {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- intentional: host-bag/observer closures capture the editor alias
    const self = this
    return {
      registry: self.#registry,
      types: self.#types,
      icons: self.#icons,
      app: self.#app,
      requestRender: () => self.#requestRender(),
      setNodePositionEphemeral: (nodeId, x, y) => self.#setNodePositionEphemeral(nodeId, x, y),
      get graph(): Graph { return self.#displayGraph },
      get commandBus(): CommandBus { return self.#displayBus },
      registerWidget: (name, controller) => self.registerWidget(name, controller),
      setIsValidConnection: (fn) => self.setIsValidConnection(fn),
      on: (event, handler) => self.on(event, handler),
      onTick: (cb) => self.onTick(cb),
      startLoop: (opts) => self.startLoop(opts),
      stopLoop: () => self.stopLoop(),
      step: (dtMs) => self.step(dtMs),
      setWidgetValue: (nodeId, widgetId, value, opts) => self.setWidgetValue(nodeId, widgetId, value, opts),
      setNodePins: (nodeId, pins) => self.setNodePins(nodeId, pins),
      setNodeWidgets: (nodeId, widgets) => self.setNodeWidgets(nodeId, widgets),
      setEdgeAnimated: (edgeId, animated) => self.setEdgeAnimated(edgeId, animated),
      expandTemplateInstance: (nodeId) => self.expandTemplateInstance(nodeId),
      graphSnapshot: (opts) => self.graphSnapshot(opts),
    }
  }

  /** Open the insert palette. `screen` is a canvas-relative point (defaults to last pointer
   *  position, then canvas centre). No-op if the registry is empty. */
  openPalette(screen?: { x: number; y: number }): void {
    if (this.#registry.size === 0 && this.#builtins.size === 0 && this.#templateRegistry.size === 0) return
    if (!this.#palette) {
      this.#palette = new InsertPalette(this.#host, this.#theme.paletteStyle, {
        search: (q) => this.#searchSchemas(q),
        insert: (type, at) => this.#insertFromPalette(type, at),
        pinColor: (type) => resolvePinFill(type, this.#theme.tokens, this.#types),
      })
    }
    const at = screen
      ?? this.#lastPointerScreen
      ?? { x: this.#app.screen.width / 2, y: this.#app.screen.height / 2 }
    this.#palette.open(at)
  }
  closePalette(): void { this.#pendingEdgeSplice = null; this.#palette?.close() }
  get isPaletteOpen(): boolean { return this.#palette?.isOpen ?? false }

  /** Query EXISTING graph nodes by title substring / type / category — the same semantics the
   *  MCP `find_nodes` tool exposes (shared module). The insert palette searches TYPES to spawn;
   *  this finds what is already on the canvas. */
  findNodes(q: FindNodesQuery): FoundNode[] {
    return findNodesIn({ registry: this.#registry, nodes: this.graphNodes() }, q)
  }

  /** Select a node and center the viewport on it (keeps the current zoom). Returns false for
   *  an unknown id. */
  focusNode(id: NodeId): boolean {
    const node = this.graph.getNode(id)
    if (!node) return false
    this.setSelection([id])
    const size = node.size ?? { x: this.#theme.tokens.geometry.node.minWidth, y: 40 }
    const cx = node.position.x + size.x / 2
    const cy = node.position.y + size.y / 2
    const z = this.#viewport.state.zoom
    this.setViewport({
      x: this.#host.clientWidth / 2 - cx * z,
      y: this.#host.clientHeight / 2 - cy * z,
      zoom: z,
    })
    return true
  }

  /** Open the Ctrl+F search box over existing graph nodes (H1). Picking a result selects the
   *  node and centers the viewport on it. */
  openSearch(): void {
    this.#search ??= new SearchPalette({
      overlayRoot: this.overlayRoot,
      find: (q) => this.findNodes(q),
      onPick: (id) => { this.focusNode(id as NodeId) },
    })
    this.#search.open()
  }
  closeSearch(): void { this.#search?.close() }
  get isSearchOpen(): boolean { return this.#search?.isOpen ?? false }

  /** Palette search across both the host registry and the built-in schemas. Host types win on a
   *  type collision; results stay sorted by descending fuzzy score. */
  #searchSchemas(query: string): ReturnType<NodeRegistry['search']> {
    const host = this.#registry.search(query).sort((a, b) => b.score - a.score)
    const seen = new Set(host.map((r) => r.schema.type))
    // Built-in core nodes (Reroute) rank ABOVE host matches so they're easy to find. Template
    // interface boundaries ($templateInput/$templateOutput) only make sense while editing a template
    // definition — hide them at the root document (dive depth 0).
    const insideTemplate = this.diveDepth > 0
    const builtins = this.#builtins.search(query)
      .filter((r) => !seen.has(r.schema.type))
      .filter((r) => insideTemplate || (r.schema.type !== TEMPLATE_INPUT_TYPE && r.schema.type !== TEMPLATE_OUTPUT_TYPE))
      .sort((a, b) => b.score - a.score)
    // Registered template definitions — reusable subgraphs the user has created; rank with host types.
    // While dived, HIDE any definition that would recurse if inserted here: the current definition
    // itself and every ancestor up the branch (each transitively contains the current one). This both
    // prevents recursion and declutters — you simply can't pick a template that would loop.
    const templates = this.#templateRegistry.search(query)
      .filter((r) => !seen.has(r.schema.type))
      .filter((r) => !this.#wouldRecurse(r.schema.type as TemplateDefId))
      .sort((a, b) => b.score - a.score)
    let merged = [...builtins, ...templates, ...host]
    // When opened from an edge's "Add Node", show only nodes that can be spliced into that wire.
    const splice = this.#pendingEdgeSplice
    if (splice) merged = merged.filter((r) => spliceCompatible(r.schema, splice.srcType, splice.dstType))
    return merged
  }

  /** The registry that owns a type (host registry takes precedence over built-ins). */
  #registryFor(type: string): NodeRegistry | null {
    if (this.#registry.has(type)) return this.#registry
    if (this.#builtins.has(type)) return this.#builtins
    return null
  }

  /** Instantiate a registered schema at a world position and add it through the command bus
   *  (undoable). Selects the new node. Returns it, or null if the type isn't registered. */
  insertNode(type: string, worldPos: { x: number; y: number }, opts: { center?: boolean } = {}): Node | null {
    // A registered template definition inserts as a fresh instance (not a registry schema).
    if (this.#definitions.has(type as TemplateDefId)) return this.#insertTemplateInstance(type as TemplateDefId, worldPos, opts)
    const reg = this.#registryFor(type)
    if (!reg) return null
    const schema = reg.get(type)!
    const node = reg.instantiate(type, worldPos)
    const render: RenderNodeOptions = {}
    if (schema.category !== undefined) render.category = schema.category
    if (schema.title !== undefined) render.title = schema.title
    // Always resolve size up front: virtualized off-screen nodes are never materialised into a view
    // (LOD draws them straight from `node.size`), and a missing size falls back to `headerHeight` only
    // — they render as squished strips at zoom-out. Centering also needs it, so the same call covers
    // both paths.
    this.#ensureSize(node, render)
    if (opts.center) {
      node.position = { x: worldPos.x - node.size!.x / 2, y: worldPos.y - node.size!.y / 2 }
    }
    this.#renderOpts.set(node.id, render)
    this.commandBus.apply(new AddNode(node))
    // Inserted while a macro is open → the new node joins that macro (otherwise you couldn't build
    // a macro's contents). Add it to the open macro's member list and reparent it into the overlay.
    const open = this.#deepestExpandedMacro()
    if (open) {
      const macro = this.graph.getNode(open)
      if (macro) {
        this.commandBus.apply(new SetNodeState(open, { members: [...macroMembers(macro as Node), node.id] }))
        this.#applyMacroVisibility()
      }
    }
    this.selection.replaceWith([node.id])
    return node
  }

  #insertFromPalette(type: string, screen: { x: number; y: number }): void {
    const world = screenToWorld(screen, this.#viewport.state)
    if (type === COMMENT_PALETTE_TYPE) {
      // Comments are frames, not nodes — anchor the new frame's top-left at the cursor.
      this.#pendingEdgeSplice = null
      this.addComment({ position: snapToGrid(world, this.#snapSize), size: { x: 240, y: 180 }, text: 'New comment' })
      return
    }
    const splice = this.#pendingEdgeSplice
    this.#pendingEdgeSplice = null
    const node = splice
      ? this.insertNode(type, world, { center: true })
      : this.insertNode(type, snapToGrid(world, this.#snapSize))
    if (node && splice) {
      const edge = this.graph.getEdge(splice.edgeId)
      if (edge) {
        // The node was already added by insertNode; splice rewires the original edge through it.
        this.#spliceIntoEdge(edge as Edge, node, { nodeAlreadyAdded: true })
      }
    }
  }

  /** Insert an inline reroute dot at `worldPos`, splitting `edgeId` so the wire passes through it.
   *  Undoable as one transaction. Returns the new reroute's id, or null if the edge is gone. */
  insertRerouteOnEdge(edgeId: EdgeId, worldPos: { x: number; y: number }): NodeId | null {
    const edge = this.graph.getEdge(edgeId)
    if (!edge) return null
    const srcNode = this.graph.getNode(edge.from.node)
    const srcPin = srcNode?.pins.find((p) => String(p.id) === String(edge.from.pin))
    const type = String(srcPin?.type ?? 'any')
    const r = this.#theme.tokens.geometry.reroute.radius
    // Centre the disc on the click point (createReroute positions by top-left corner).
    const reroute = createReroute({ x: worldPos.x - r, y: worldPos.y - r }, { type })
    if (!this.#spliceIntoEdge(edge as Edge, reroute, { nodeAlreadyAdded: false })) return null
    this.selection.replaceWith([reroute.id])
    return reroute.id
  }

  /** Delete a single edge. Removes only that edge; any inline reroute it leaves with no remaining
   *  connections is removed too (inline reroutes can't exist standalone), but reroutes that still
   *  relay something survive — the chain isn't chopped. Undoable as one transaction. */
  deleteEdge(edgeId: EdgeId): boolean {
    if (!this.graph.getEdge(edgeId)) return false
    const edges = Array.from(this.graph.edges()) as Edge[]
    const plan = danglingRerouteRemovalPlan(
      edges, (id) => { const n = this.graph.getNode(id); return !!n && isReroute(n) }, edgeId,
    )
    this.commandBus.transaction(() => {
      // RemoveNode drops a reroute's own incident edges; explicitly disconnect the rest.
      for (const id of plan.edgeIds) {
        const e = this.graph.getEdge(id as EdgeId)
        if (e && !plan.rerouteIds.some((r) => r === e.from.node || r === e.to.node)) {
          this.commandBus.apply(new DisconnectEdge(id as EdgeId))
        }
      }
      for (const id of plan.rerouteIds) this.commandBus.apply(new RemoveNode(id))
    })
    return true
  }

  /** Rewire `edge` (source → target) to run source → node → target. Picks the node's first
   *  type-compatible in/out pins. When `nodeAlreadyAdded` is false the node is added inside the
   *  same transaction. Returns false if the node lacks a usable in or out pin. */
  #spliceIntoEdge(edge: Edge, node: Node, opts: { nodeAlreadyAdded: boolean }): boolean {
    const srcNode = this.graph.getNode(edge.from.node)
    const dstNode = this.graph.getNode(edge.to.node)
    const srcPin = srcNode?.pins.find((p) => String(p.id) === String(edge.from.pin)) ?? null
    const dstPin = dstNode?.pins.find((p) => String(p.id) === String(edge.to.pin)) ?? null
    const inPin =
      (srcPin && node.pins.find((p) => p.direction === 'in' && canConnect(srcPin, p, false))) ||
      node.pins.find((p) => p.direction === 'in')
    const outPin =
      (dstPin && node.pins.find((p) => p.direction === 'out' && canConnect(p, dstPin, false))) ||
      node.pins.find((p) => p.direction === 'out')
    if (!inPin || !outPin) return false

    const srcType = String(srcPin?.type ?? 'any')
    const upstream: Edge = { id: createEdgeId(), from: { ...edge.from }, to: { node: node.id, pin: inPin.id } }
    const downstream: Edge = { id: createEdgeId(), from: { node: node.id, pin: outPin.id }, to: { ...edge.to } }
    this.#edgeOpts.set(upstream.id, { sourceType: srcType })
    this.#edgeOpts.set(downstream.id, { sourceType: String(outPin.type === 'any' ? srcType : outPin.type) })

    this.commandBus.transaction(() => {
      this.commandBus.apply(new DisconnectEdge(edge.id))
      if (!opts.nodeAlreadyAdded) this.commandBus.apply(new AddNode(node))
      this.commandBus.apply(new ConnectPins(upstream))
      this.commandBus.apply(new ConnectPins(downstream))
    })
    return true
  }

  /** Edge whose midpoint handle is within `tolerance` world units of `world`, or null. The handle
   *  dot — not the whole wire — is the interaction target, so right-click only triggers on the dot.
   *  O(edges); only called on right-click. */
  #pickEdgeAt(world: { x: number; y: number }, tolerance: number): EdgeId | null {
    let best: EdgeId | null = null
    let bestDist = tolerance
    const edgeTokens = this.#theme.tokens.geometry.edge
    for (const edge of this.graph.edges()) {
      const fromNode = this.graph.getNode(edge.from.node)
      const toNode = this.graph.getNode(edge.to.node)
      if (!fromNode || !toNode) continue
      const from = this.#pinWorldPosition(fromNode as Node, String(edge.from.pin))
      const to = this.#pinWorldPosition(toNode as Node, String(edge.to.pin))
      if (!from || !to) continue
      const mid = bezierMidpoint(computeEdgePath(from, to, edgeTokens))
      const d = Math.hypot(world.x - mid.x, world.y - mid.y)
      if (d < bestDist) { bestDist = d; best = edge.id }
    }
    return best
  }

  /** Highlight the edge midpoint dot under the cursor with a ring + pointer cursor. No-op churn
   *  when the hovered edge hasn't changed. */
  #updateEdgeMidpointHover(world: { x: number; y: number }): void {
    const tol = this.#theme.tokens.geometry.edge.midpointRadius + 5
    const id = this.#pickEdgeAt(world, tol)
    if (id === this.#hoveredEdgeMid) return
    this.#hoveredEdgeMid = id
    this.#edgeHoverGfx.clear()
    const canvas = this.#app.canvas as HTMLCanvasElement
    if (!id) { canvas.style.cursor = ''; this.#requestRender(); return }
    const edge = this.graph.getEdge(id)
    const fromNode = edge && this.graph.getNode(edge.from.node)
    const toNode = edge && this.graph.getNode(edge.to.node)
    if (edge && fromNode && toNode) {
      const from = this.#pinWorldPosition(fromNode as Node, String(edge.from.pin))
      const to = this.#pinWorldPosition(toNode as Node, String(edge.to.pin))
      if (from && to) {
        const mid = bezierMidpoint(computeEdgePath(from, to, this.#theme.tokens.geometry.edge))
        const rr = this.#theme.tokens.geometry.edge.midpointRadius + 3
        this.#edgeHoverGfx.circle(mid.x, mid.y, rr)
          .stroke({ color: 0xffffff, width: 1.5 / this.#viewport.state.zoom, alpha: 0.9 })
      }
    }
    canvas.style.cursor = 'pointer'
    this.#requestRender()
  }

  /** Serialize the current graph (nodes + edges + render opts + viewport) into the canonical
   *  `xenolith.v1` envelope. The returned object is JSON-safe. */
  toJSON(): XenolithGraphV1 {
    // If we're dived into a definition, flush its live edits back into stored data first so they're
    // serialized too.
    this.#flushActiveDefinition()
    // Always serialize the ROOT document (not whatever's displayed while dived into a template), and
    // include the template definitions. Edge opts merge the persistent map (covers template edges no
    // longer live in the display) with the live records (authoritative for displayed edges).
    const edgeOpts = new Map<EdgeId, RenderEdgeOptions>(this.#edgeOpts)
    for (const [id, r] of this.#edgeRecords) edgeOpts.set(id, r.opts)
    // G5 — per-node custom serialize override. Schemas can opt into a `serialize(node)` callback
    // when their state holds anything the default JSON shape can't round-trip (Maps, class
    // instances, RAF handles). We materialise the node WITH the custom state BEFORE handing it
    // to the generic serializer, so the override is transparent to the rest of the pipeline.
    const rawNodes = Array.from(this.#rootGraph.nodes())
    const serializedNodes = rawNodes.map((n) => {
      const ser = this.#registry.get(n.type)?.serialize
      if (!ser) return n
      try {
        const customState = ser(n as Node)
        return { ...n, state: customState }
      } catch {
        return n                                             // fall back to default if user fn throws
      }
    })
    return serializeXenolithGraph({
      nodes:      serializedNodes,
      edges:      Array.from(this.#rootGraph.edges()),
      comments:   Array.from(this.#rootGraph.comments()),
      renderOpts: this.#renderOpts as ReadonlyMap<NodeId, RenderNodeOptions>,
      edgeOpts,
      viewport:   this.#viewport.state,
      ...(this.#categoryPalette ? { categories: this.#categoryPalette } : {}),
      ...(this.#definitions.size > 0 ? { templates: [...this.#definitions.values()] } : {}),
    })
  }

  /** The current graph serialized to an `xenolith.v1` JSON Blob (for download / save). */
  exportJSON(): Blob {
    return new Blob([JSON.stringify(this.toJSON(), null, 2)], { type: 'application/json' })
  }

  /** Open a WebSocket connection to a running `@xenolithengine/graph-mcp-server` so an external MCP client
   *  (Claude Desktop / Cursor / any) can drive this editor. The server forwards each tool call
   *  here over the socket; handlers route to `insertNode`/`addEdge`/`fitView`/etc. (already
   *  undoable via the command bus). Returns a disconnect function. See `mcp.ts` for the protocol. */
  #mcp: McpClient | null = null
  #mcpAudit: import('./mcp.js').AuditLog | null = null
  #mcpProposals: import('./mcp.js').ProposalQueue | null = null
  #proposalsPanel: import('./proposals-panel.js').ProposalsPanel | null = null
  async connectMCP(
    url: string,
    opts: { onStatus?: (s: 'connecting' | 'open' | 'closed' | 'error') => void; clientId?: string; mode?: 'auto' | 'propose' } = {},
  ): Promise<() => void> {
    const { McpClient, AuditLog, ProposalQueue } = await import('./mcp.js')
    const { ProposalsPanel } = await import('./proposals-panel.js')
    this.#mcp?.disconnect()
    // One ring per EDITITOR, shared across reconnects — hosts read it via `editor.mcpAudit`
    // (and MCP clients via the get_audit_log tool / audit://recent resource).
    this.#mcpAudit ??= new AuditLog()
    if (opts.mode === 'propose') {
      this.#mcpProposals ??= new ProposalQueue()
      // The panel is the queue's default face: badge surfaces while entries wait, review UI on
      // click. Hosts wanting their own UI simply never open it — the queue stays public.
      this.#proposalsPanel ??= new ProposalsPanel({ overlayRoot: this.overlayRoot, queue: this.#mcpProposals })
    }
    const client = new McpClient(
      this as unknown as McpEditorSurface,
      {
        ...(opts.onStatus !== undefined ? { onStatus: opts.onStatus } : {}),
        ...(opts.clientId !== undefined ? { clientId: opts.clientId } : {}),
        ...(opts.mode !== undefined ? { mode: opts.mode } : {}),
        ...(this.#mcpProposals !== null ? { proposals: this.#mcpProposals } : {}),
        audit: this.#mcpAudit!,
      },
    )
    await client.connect(url)
    this.#mcp = client
    return () => { client.disconnect(); this.#mcp = null }
  }

  /** The agent-mutation audit ring (C-Bet1a) — populated while an MCP session is connected.
   *  One instance per editor, shared across reconnects. Entries contain graph data; the
   *  clientId field is transport-provided, NOT authenticated. */
  get mcpAudit(): import('./mcp.js').AuditLog | null { return this.#mcpAudit ?? null }

  /** The agent-proposal review queue (C-Bet1b) — non-null once an MCP session connected with
   *  mode 'propose'. Hosts render it, approve() lands the batch as ONE undoable transaction,
   *  reject() discards. See ADR 0007 for the re-resolution semantics. */
  get mcpProposals(): import('./mcp.js').ProposalQueue | null { return this.#mcpProposals ?? null }

  /** Open the built-in proposal review panel (F1). False when no propose-mode session ever
   *  connected — there is nothing to review. Hosts with their own UI never call this. */
  showProposals(): boolean {
    if (!this.#proposalsPanel) return false
    this.#proposalsPanel.open()
    return true
  }

  hideProposals(): void { this.#proposalsPanel?.close() }

  isProposalsVisible(): boolean { return this.#proposalsPanel?.isOpen() ?? false }

  /** Replace the category → colour map and re-render every node so the new palette is visible
   *  immediately. Loading a graph already sets this from the document's `categories` field; this
   *  setter is for runtime changes (theme tooling, MCP `set_category_palette`, …). Pass an empty
   *  object or `undefined` to fall back to the theme's defaults.
   *
   *  Accepts a loose shape per entry — anything that resolves to a colour gets normalised to a
   *  `{ color }` spec, AI clients almost always pass raw "#RRGGBB" strings rather than the
   *  `{color}` / `{gradient}` discriminated union the renderer wants downstream. */
  setCategoryPalette(palette: Record<string, unknown> | undefined): void {
    const normalised = normalisePalette(palette)
    this.#categoryPalette = normalised && Object.keys(normalised).length > 0 ? normalised : undefined
    // Bake cache keys include the category colour, so old entries would render with stale fills.
    for (const tex of this.#bakeCache.values()) tex.destroy(true)
    this.#bakeCache.clear()
    // Re-render every materialised node so the new palette is visible without a pan/zoom nudge.
    for (const [id, oldView] of [...this.#views]) {
      const node = this.graph.getNode(id)
      if (!node) continue
      const wasCollapsed = oldView.isCollapsed()
      const baseOpts = this.#renderOpts.get(id) ?? {}
      const newView = this.#renderNode(node, { ...baseOpts, collapsed: wasCollapsed })
      this.#nodesLayer.removeChild(oldView.container)
      oldView.container.destroy({ children: true })
      this.#views.set(id, newView)
      this.#nodesLayer.addChild(newView.container)
      this.#wireNodeInteraction(id, newView)
      newView.container.position.set(node.position.x, node.position.y)
    }
    this.#requestRender()
  }

  /** Snapshot a single node's current view (with widget values, statuses, the lot) to a Blob.
   *  Renders the live container — NOT the bake-cache "blank" texture — so AI clients calling MCP
   *  `node_screenshot` see exactly what the user sees, not a default-state stand-in. */
  async exportNodeImage(nodeId: NodeId, opts: { format?: 'png' | 'jpeg'; quality?: number; scale?: number; padding?: number; background?: string | null } = {}): Promise<Blob> {
    return this.#export.nodeImage(nodeId, opts)
  }

  /** Render the whole graph to an image Blob. The clear colour defaults to the theme's canvas
   *  surface so exports look like the editor and never come out transparent (PNG) or empty — pass
   *  `background: null` for a transparent PNG, or a colour string to override.
   *
   *  Renders EVERY node/edge at full detail regardless of the live viewport state: culling,
   *  virtualization, LOD batches and the pan/zoom freeze all leave `#world` holding only a slice of
   *  the graph (off-screen nodes have no view, low zoom swaps in flat/sprite batches, the freeze
   *  hides live nodes behind baked sprites). Rendering `#world` as-is in any of those states yields a
   *  blank or wrong-detail export, so the render runs inside the export controller's
   *  with-full-graph-visible juggling, which
   *  materializes every node/edge and un-hides the LOD/freeze layers for the duration of the render,
   *  then restores the culled live state.
   *
   *  Caveat: DOM-mounted custom widgets (registered via `registerWidget` with an HTML controller) live
   *  in an HTML overlay outside the WebGL scene graph, so they cannot appear in this render path —
   *  only canvas/custom-draw widgets (drawn into the PIXI scene) are captured. */
  async exportImage(opts: { format?: 'png' | 'jpeg'; quality?: number; padding?: number; scale?: number; background?: string | null } = {}): Promise<Blob> {
    return this.#export.image(opts)
  }

  /** Replace the editor's contents with the contents of an `xenolith.v1` payload. Wipes the
   *  existing graph, selection, and viewport before reloading. Throws on malformed input — the
   *  editor is left in its previous state in that case. */
  /** Apply a change-array back onto the graph (E5 / ADR 0006) — the write side of the
   *  commit-time controlled protocol. Runs inside ONE transaction: one undo step, and (by
   *  design) one `graph:changed` echo. Echo-idempotent: adding an existing id, removing a
   *  missing id, and position writes equal to current are skipped — piping the editor's own
   *  emission straight back converges instead of looping.
   *
   *  @example editor.applyChanges({ nodes: [{ type: 'position', id, position }], edges: [], unsupported: [] }) */
  applyChanges(changes: GraphChanges): void {
    applyChangesToBus({ bus: this.commandBus, graph: () => this.#displayGraph }, changes)
  }

  /** Snapshot the graph in the reducer-compatible shape (`reduceGraphChanges` input). */
  getGraphMirror(): GraphMirror {
    return snapshotGraph(this.graph.nodes(), this.graph.edges())
  }

  /** Import a React Flow (xyflow) JSON export — `toObject()` output — replacing the current
   *  graph. Pin refs, dropped fields and structural mismatches are fully accounted in the
   *  returned {@link ImportReport}: nothing is lost silently. Pins are synthesized from the
   *  handles edges use (typed via `inferType` or matching `schemas`); see `import-reactflow.ts`
   *  for the exact mapping. Pure counterpart: `importFromReactFlow(json, opts)` if you want the
   *  document without loading it. */
  importReactFlow(json: unknown, opts?: ImportReactFlowOptions): ImportReport {
    const { doc, report } = importFromReactFlow(json, opts)
    this.loadJSON(doc)
    return report
  }

  loadJSON(data: unknown): void {
    const preLoadMirror = this.getGraphMirror() // for the E5 graph:changed replace burst
    // Pass the editor's registry into the parser so compact node JSON (no per-instance pins/widgets)
    // resolves shapes from registered schemas. Any `schemas[]` inline in the graph gets auto-
    // registered first (idempotent — already-registered types are kept as-is). Together these two
    // enable a self-describing JSON shape: one schema declaration → minimal node entries → palette
    // + render stay in sync from a single source.
    const parsed = parseXenolithGraph(data, { registry: this.#registry })
    this.#clearAll()
    this.#categoryPalette = parsed.categories // graph-owned category colours (undefined for old graphs)
    // Restore template definitions + their members'/boundary nodes' render+edge opts (parseTemplates
    // merged those into parsed.renderOpts/edgeOpts). Definition nodes aren't added to the live graph —
    // they materialise only when diving into an instance — so seed the opts maps here directly.
    if (parsed.templates) for (const def of parsed.templates) { this.#definitions.set(def.id, def); this.#registerTemplateSchema(def.id) }
    for (const [id, ro] of parsed.renderOpts) this.#renderOpts.set(id as NodeId, ro)
    for (const [id, eo] of parsed.edgeOpts) this.#edgeOpts.set(id as EdgeId, eo)
    // Past the virtualization threshold, materialising a view per node here is exactly what blows
    // up GPU memory on huge graphs. So add nodes as DATA only and let one #cullToViewport() pass
    // materialise just the visible ones. Below the threshold, take the normal 1:1 path (addNode).
    const willVirtualize = shouldVirtualize(parsed.nodes.length, this.#theme.virtualizeThreshold ?? 300)
    // Add EVERYTHING as data first (no views yet) so declarative collapsed macros can derive their
    // pins + rewire boundary edges on pure model state before anything is rendered.
    for (const node of parsed.nodes) {
      const schema = this.#registry.get(node.type)
      // A4 — NodeSchema.migrate. Before any other rehydration: if the on-disk node's version is
      // below the schema's current version, run the migration hook so downstream code sees the
      // up-to-date shape. The helper merges the patched payload back over the existing node and
      // bumps `node.version` to the schema's current. Defensive try/catch — a broken migrate
      // shouldn't lose the graph.
      try {
        const { node: patched } = migrateNodePayload(schema, node)
        Object.assign(node, patched)
      } catch { /* keep raw node on user-fn error */ }
      // G5 — let the registered schema rehydrate state from its custom JSON shape. Mirror of the
      // serialize override in toJSON. Falls back to the JSON state as-is when no fn is registered.
      const de = schema?.deserialize
      if (de) {
        try {
          const live = de(node.state as Record<string, unknown>, node)
          ;(node as { state: Record<string, unknown> }).state = live
        } catch { /* keep raw state on user-fn error */ }
      }
      this.#addNodeData(node, parsed.renderOpts.get(String(node.id)) ?? {})
    }
    for (const edge of parsed.edges) this.#addEdgeData(edge, parsed.edgeOpts.get(String(edge.id)) ?? {})
    for (const comment of parsed.comments) this.graph.internals()._addComment(comment)
    // `#addNodeData` bypasses the command bus, so the macro-parent index hasn't been invalidated
    // by event hooks — do it explicitly before `#materializeLoadedMacros` runs (it reads parents
    // to nest macros deepest-first).
    this.#invalidateMacroIndex()
    // A macro is stored DECLARATIVELY: a Macro node with state.members + collapsed, its members and
    // their real edges present as ordinary data. Materialise the collapse (derive proxy pins, rewire)
    // deepest-nested first, so an inner macro is a real collapsed node before an outer one collapses.
    this.#materializeLoadedMacros()
    // #materializeLoadedMacros mutates edges via graph.internals()._addEdge/_removeEdge (bypassing the command
    // bus / event hooks), so #edgesByNode still holds the pre-collapse edge ids for macro members
    // and doesn't know about the new proxy-pin edges. Rebuild the index once before views are
    // created — otherwise #connectedPinIdsFor(macro) returns empty during the initial render pass
    // (Xen hides this because data-pin paint doesn't depend on connection state; Daylight, which
    // paints a bullseye for connected data pins, made the bug visible).
    this.#rebuildEdgeIndex()
    if (parsed.viewport) this.#viewport.setState(parsed.viewport)
    // Build views: virtualized → cull near viewport; otherwise materialise everything 1:1.
    if (willVirtualize) this.#cullToViewport()
    else {
      for (const n of this.graph.nodes()) this.#ensureView(n as Node)
      for (const e of this.graph.edges()) if (!this.#edgeRecords.has(e.id)) this.#materializeEdge(e as Edge, this.#edgeOpts.get(e.id) ?? {})
    }
    this.#comments.sync()
    this.#applyMacroVisibility()
    // loadJSON bypasses the command bus, so the command:applied hook that normally mounts DOM
    // widgets after a mutation doesn't run for the initial set — every custom-widget node would
    // paint with bare pins until the first drag/collapse forced a re-render. Force one pass now
    // so DOM controllers mount during the same frame as the rest of the node visual.
    this.#domWidgets.sync()
    // Refresh the minimap — loadJSON adds nodes as data (#addNodeData), which doesn't schedule a
    // minimap sync the way addNode does, so do it explicitly (otherwise the minimap keeps its 1×1
    // default bounds and renders empty).
    this.#scheduleMinimapSync()
    // loadJSON bypasses the command bus, so run the reroute type propagation explicitly.
    this.#propagateRerouteTypes()
    // A fresh load is not undoable — drop any prior history so the old graph's commands can't be
    // replayed onto the new one, and tell chrome (controls) the undo/redo stacks are empty.
    this.commandBus.clearHistory()
    this.#events.emit('graph:loaded', { nodeCount: parsed.nodes.length, edgeCount: parsed.edges.length })
    this.#events.emit('history:changed', { canUndo: false, canRedo: false })
    // E5: the virtualized load path adds nodes/edges as DATA (no commands) — emit the synthetic
    // replace burst so external mirrors converge onto the new document in one array.
    this.#events.emit('graph:changed', { changes: documentReplacedChanges(preLoadMirror, this.getGraphMirror()) })
  }

  /** Re-attach a deserialized edge using its preserved id and pin-id endpoints — bypasses the
   *  fresh-edge-id path of public `connect()`. */
  #loadEdge(edge: Edge, opts: RenderEdgeOptions): void {
    this.graph.internals()._addEdge(edge)
    if (!this.#materializeEdge(edge, opts)) this.graph.internals()._removeEdge(edge.id)
  }

  /** Tear down everything DISPLAY-scoped — views, edge graphics, spatial index, comment/macro views,
   *  GPU caches, LOD, hover state. Leaves the graph MODEL and document-level maps (#renderOpts,
   *  #edgeOpts, #definitions, #categoryPalette) intact. Used both by #clearAll (document wipe) and by
   *  dive in/out (swap which graph is shown without touching the model). Does NOT touch selection. */
  #teardownDisplay(): void {
    this.#nodeStatus.clear()
    this.#statusGfx?.clear()
    for (const { graphics } of this.#edgeRecords.values()) graphics.destroy()
    this.#edgeRecords.clear()
    for (const view of this.#views.values()) view.container.destroy({ children: true })
    this.#views.clear()
    this.#hoveredId = null
    this.#marqueeHovered.clear()
    for (const rt of this.#perNodeBackdropRT.values()) rt.destroy(true)
    this.#perNodeBackdropRT.clear()
    this.#lastOverlapPlan = new Map()
    // Reset LOD: a fresh display starts at full detail with the live layers visible. Drop the LOD
    // batch and the baked textures (the new graph may have a different type-set).
    this.#lodLevel = 'full'
    this.#lodLayer.removeChildren().forEach((c) => c.destroy())
    this.#lodLayer.visible = false
    this.#nodesLayer.visible = true
    this.#edgesLayer.visible = true
    for (const tex of this.#bakeCache.values()) tex.destroy(true)
    this.#bakeCache.clear()
    this.#spatialGrid.clear()
    this.#spatialMaxW = 0
    this.#spatialMaxH = 0
    this.#edgesByNode.clear()
    this.#comments.dropViews()
    for (const f of this.#macroFrames.values()) f.destroy()
    this.#macroFrames.clear()
    this.#hiddenMembers.clear()
  }

  /** Build views/edges/comments for whatever graph is currently displayed (#displayGraph). Mirrors
   *  the non-virtualized tail of loadJSON, but reads the display graph so it serves dive in/out too. */
  #rebuildDisplay(): void {
    this.#rebuildSpatialGrid()
    // #teardownDisplay wiped #edgesByNode; without this rebuild, every node materialised below
    // would call connectedPinIdsFor() against an empty index → every exec pin paints disconnected
    // (transparent fill) AND every visibility:'whenDisconnected' widget shows when it shouldn't.
    // First visible regression of templates — see docs/bug-exec-pins-look-disconnected-after-rebuild.md.
    this.#rebuildEdgeIndex()
    for (const n of this.graph.nodes()) this.#ensureView(n as Node)
    for (const e of this.graph.edges()) if (!this.#edgeRecords.has(e.id)) this.#materializeEdge(e as Edge, this.#edgeOpts.get(e.id) ?? {})
    this.#comments.sync()
    this.#applyMacroVisibility()
    this.#propagateRerouteTypes()
    this.#scheduleMinimapSync()
    this.#requestRender()
  }

  #clearAll(): void {
    this.#invalidateMacroIndex()
    this.#categoryPalette = undefined
    this.#definitions.clear()
    this.#templateRegistry.clear()
    this.#diveStack = []
    this.#currentDefId = null
    this.#expandingMacros.clear()
    this.#updateBreadcrumb()
    this.#teardownDisplay()
    this.#edgeOpts.clear()
    this.#renderOpts.clear()
    for (const id of Array.from(this.#rootGraph.nodes()).map((n) => n.id)) this.#rootGraph.internals()._removeNode(id)
    for (const id of Array.from(this.#rootGraph.edges()).map((e) => e.id)) this.#rootGraph.internals()._removeEdge(id)
    this.#displayGraph = this.#rootGraph
    this.#displayBus = this.#rootBus
    this.selection.clear()
    this.#clipboard = null
    for (const id of [...this.#rootGraph.comments()].map((c) => c.id)) this.#rootGraph.internals()._removeComment(id)
  }

  /** Undo the most recent committed command (drag-drop MoveNode, ConnectPins from pin-drag, etc).
   *  Returns true if anything was undone. View sync happens automatically via the
   *  `command:undone` listener. */
  undo(): boolean { return this.commandBus.undo() }
  /** Redo the most recently undone command. Returns true if anything was redone. */
  redo(): boolean { return this.commandBus.redo() }
  /** Whether there is anything to undo / redo — lets chrome initialise its button state without
   *  waiting for the first `history:changed` event. */
  canUndo(): boolean { return this.commandBus.canUndo() }
  canRedo(): boolean { return this.commandBus.canRedo() }

  /** Select every node AND every comment in the graph. */
  selectAll(): void {
    // Top-level only: a collapsed macro is selected as the single wrapper node, NOT its hidden members
    // (otherwise copy/paste would clone the guts as loose nodes and the group falls apart).
    this.selection.replaceWith(Array.from(this.graph.nodes()).filter((n) => !this.#hiddenMembers.has(n.id)).map((n) => n.id))
    this.#comments.selectAll()
    this.#requestRender()
  }

  /** Delete every selected node along with its incident edges. Each removal goes through
   *  `RemoveNode` so the whole operation is undoable as a single transaction. */
  deleteSelected(): void {
    const ids = this.selection.ids().slice()
    if (ids.length === 0) return
    const removing = new Set(ids)
    this.commandBus.transaction(() => {
      // Reroutes are pure relays — deleting one should heal the wire it carried rather than sever
      // it. Bridge each reroute's upstream feed to its downstream targets before removing it.
      const edges = Array.from(this.graph.edges()) as Edge[]
      for (const id of ids) {
        const node = this.graph.getNode(id)
        if (!node || !isReroute(node)) continue
        for (const bridge of computeRerouteBridges(edges, id, removing)) {
          const edge: Edge = { id: createEdgeId(), from: bridge.from, to: bridge.to }
          // Carry the downstream wire's render opts (colour/type) onto the healed edge.
          const downstream = edges.find((e) => e.from.node === id && e.to.node === bridge.to.node)
          const opts = (downstream && this.#edgeOpts.get(downstream.id)) ?? {}
          this.#edgeOpts.set(edge.id, { ...opts })
          this.commandBus.apply(new ConnectPins(edge))
        }
      }
      for (const id of ids) this.commandBus.apply(new RemoveNode(id))
    })
  }

  /** Capture the current selection into the in-memory clipboard. Pins and edges between selected
   *  nodes are preserved; edges that cross out of the selection are dropped. */
  copySelection(): boolean {
    const snapshot = this.#snapshotSelection()
    if (!snapshot) return false
    this.#clipboard = snapshot
    return true
  }

  /** Paste the in-memory clipboard's nodes/edges into the graph with fresh IDs.
   *
   *  - `target = { x, y }` — world point where the clipboard's centroid should land
   *    (paste-at-cursor); use `editor.lastPointerWorld()` from the keyboard handler.
   *  - `target = { dx, dy }` — fixed offset from the original positions (legacy behaviour).
   *  - default — offset (+24, +24).
   *
   *  Newly added nodes replace the current selection. Returns the new node IDs. */
  paste(target?: { x: number; y: number } | { dx: number; dy: number }): NodeId[] {
    if (!this.#clipboard) return []
    return this.#cloneSnapshot(this.#clipboard, target)
  }

  /** Cmd+D — clone the current selection in place with an offset, replace selection with the
   *  clones. Independent of the clipboard. */
  duplicateSelected(offset: { dx: number; dy: number } = { dx: 24, dy: 24 }): NodeId[] {
    const snapshot = this.#snapshotSelection()
    if (!snapshot) return []
    return this.#cloneSnapshot(snapshot, offset)
  }

  /** Last known cursor position in world coordinates, or null if pointer hasn't moved over the
   *  canvas yet. Exposed so external keyboard handlers can drive paste-at-cursor. */
  lastPointerWorld(): { x: number; y: number } | null {
    return this.#lastPointerWorld ? { ...this.#lastPointerWorld } : null
  }

  #snapshotSelection(): ClipboardSnapshot | null {
    const ids = new Set(this.selection.ids())
    const comments: Comment[] = []
    const allNodes = [...this.graph.nodes()] as Node[]
    // Selected comments copy WITH their contents: every node geometrically inside each frame.
    // Naïve `for comment { nodesInsideComment(c, allNodes) }` was O(C × N) — on a Ctrl+A of a
    // duplicated graph C and N both grow per copy, melting `copySelection` into O(N²) (~1.7s at
    // 37k nodes). Walk nodes ONCE, check against the selected-comment rects only when the node
    // isn't already in `ids` (Ctrl+A short-circuits everything).
    const selComments: Comment[] = []
    for (const cid of this.#comments.selectedIds()) {
      const c = this.graph.getComment(cid)
      if (!c) continue
      comments.push(c as Comment)
      selComments.push(c as Comment)
    }
    if (selComments.length > 0) {
      for (const n of allNodes) {
        if (ids.has(n.id)) continue
        const cx = n.position.x + (n.size ? n.size.x / 2 : 0)
        const cy = n.position.y + (n.size ? n.size.y / 2 : 0)
        for (const c of selComments) {
          if (cx >= c.position.x && cx <= c.position.x + c.size.x &&
              cy >= c.position.y && cy <= c.position.y + c.size.y) { ids.add(n.id); break }
        }
      }
    }
    // A selected macro copies WITH its members (and nested macros' members) so the group can be
    // recreated — otherwise the clone would be an empty wrapper referencing missing nodes.
    for (const id of [...ids]) {
      const n = this.graph.getNode(id)
      if (n && isMacro(n)) {
        const stack = [...macroMembers(n as Node)]
        while (stack.length) {
          const m = stack.pop()!
          if (ids.has(m)) continue
          ids.add(m)
          const mn = this.graph.getNode(m)
          if (mn && isMacro(mn)) stack.push(...macroMembers(mn as Node))
        }
      }
    }
    if (ids.size === 0 && comments.length === 0) return null
    const nodes: Node[] = []
    const renderOpts = new Map<NodeId, RenderNodeOptions>()
    for (const n of this.graph.nodes()) {
      if (!ids.has(n.id)) continue
      nodes.push(n as Node)
      const r = this.#renderOpts.get(n.id)
      if (r) renderOpts.set(n.id, { ...r })
    }
    const rawEdges: Edge[] = []
    const edgeOpts = new Map<EdgeId, RenderEdgeOptions>()
    for (const e of this.graph.edges()) {
      if (!ids.has(e.from.node) || !ids.has(e.to.node)) continue
      rawEdges.push(e as Edge)
      const o = this.#edgeOpts.get(e.id)
      if (o) edgeOpts.set(e.id, { ...o })
    }
    // Drop orphan inline reroutes so the clipboard never carries a dangling dot (an inline reroute
    // with a severed feed/outgoing edge). See pruneOrphanInlineReroutes.
    const { nodes: prunedNodes, edges } = pruneOrphanInlineReroutes(nodes, rawEdges)
    return { nodes: prunedNodes, edges, comments, renderOpts, edgeOpts }
  }

  /** In-process clone of a snapshot. Re-IDs every node/pin/edge, rewires edges to the new pin
   *  IDs, applies as a single transaction (one microtask-batched view sync at the end). */
  #cloneSnapshot(
    snap: ClipboardSnapshot,
    target?: { x: number; y: number } | { dx: number; dy: number },
  ): NodeId[] {
    if (snap.nodes.length === 0 && snap.comments.length === 0) return []
    let translate: { dx: number; dy: number }
    if (target && 'dx' in target) {
      translate = { dx: target.dx, dy: target.dy }
    } else if (target && 'x' in target) {
      // Centroid → target point. Fall back to comment positions when copying a bare frame.
      const pts = snap.nodes.length > 0
        ? snap.nodes.map((n) => n.position)
        : snap.comments.map((c) => c.position)
      let cx = 0, cy = 0
      for (const p of pts) { cx += p.x; cy += p.y }
      cx /= pts.length
      cy /= pts.length
      translate = { dx: target.x - cx, dy: target.y - cy }
    } else {
      translate = { dx: 24, dy: 24 }
    }

    const nodeIdMap = new Map<NodeId, NodeId>()
    const pinIdMap  = new Map<PinId, PinId>()
    const newNodes: Node[] = []
    for (const oldNode of snap.nodes) {
      const newNodeId = createNodeId()
      nodeIdMap.set(oldNode.id, newNodeId)
      const newPins: Pin[] = oldNode.pins.map((p) => {
        const newPinId = createPinId()
        pinIdMap.set(p.id as PinId, newPinId)
        return { ...p, id: newPinId }
      })
      const clone: Node = {
        ...oldNode,
        id: newNodeId,
        position: { x: oldNode.position.x + translate.dx, y: oldNode.position.y + translate.dy },
        pins: newPins,
        state: { ...oldNode.state },
      }
      if (oldNode.size) clone.size = { ...oldNode.size }
      newNodes.push(clone)
      const render = snap.renderOpts.get(oldNode.id)
      if (render) this.#renderOpts.set(newNodeId, { ...render })
    }
    const newEdges: Edge[] = []
    for (const oldEdge of snap.edges) {
      const fromNode = nodeIdMap.get(oldEdge.from.node)
      const toNode   = nodeIdMap.get(oldEdge.to.node)
      const fromPin  = pinIdMap.get(oldEdge.from.pin as PinId)
      const toPin    = pinIdMap.get(oldEdge.to.pin   as PinId)
      if (!fromNode || !toNode || !fromPin || !toPin) continue
      const newEdgeId = createEdgeId()
      newEdges.push({
        id: newEdgeId,
        from: { node: fromNode, pin: fromPin },
        to:   { node: toNode,   pin: toPin   },
      })
      const opts = snap.edgeOpts.get(oldEdge.id)
      if (opts) this.#edgeOpts.set(newEdgeId, { ...opts })
    }
    // Remap macro internals to the cloned ids so a pasted/duplicated macro stays a valid collapsed
    // group (members hidden) instead of dissolving into loose nodes referencing the originals.
    //
    // proxyMap entries are also DROPPED when the externalNode wasn't copied — otherwise, expanding
    // the pasted macro later would read those entries and wire the cloned members to the ORIGINAL
    // external nodes (the boundary edge to the external wasn't part of the clipboard, so `findEdge`
    // returns null and `#setMacroCollapsed` just creates a fresh edge from the stale externalNode).
    for (const clone of newNodes) {
      if (!isMacro(clone)) continue
      const members = (clone.state['members'] as NodeId[] | undefined) ?? []
      clone.state['members'] = members.map((m) => nodeIdMap.get(m) ?? m)
      const pm = clone.state['proxyMap'] as MacroProxyRecord[] | undefined
      if (pm) {
        clone.state['proxyMap'] = pm
          .filter((r) => nodeIdMap.has(r.externalNode))
          .map((r) => ({
            ...r,
            macroPin: pinIdMap.get(r.macroPin) ?? r.macroPin,
            memberNode: nodeIdMap.get(r.memberNode) ?? r.memberNode,
            memberPin: pinIdMap.get(r.memberPin) ?? r.memberPin,
            externalNode: nodeIdMap.get(r.externalNode) ?? r.externalNode,
            externalPin: pinIdMap.get(r.externalPin) ?? r.externalPin,
          }))
      }
    }
    const newComments: Comment[] = snap.comments.map((c) => {
      const clone: Comment = {
        ...c,
        id: createCommentId(),
        position: { x: c.position.x + translate.dx, y: c.position.y + translate.dy },
        size: { ...c.size },
      }
      return clone
    })
    this.commandBus.transaction(() => {
      for (const comment of newComments) this.commandBus.apply(new AddComment(comment))
      for (const node of newNodes) this.commandBus.apply(new AddNode(node))
      for (const edge of newEdges) this.commandBus.apply(new ConnectPins(edge))
    })
    this.selection.replaceWith(newNodes.map((n) => n.id))
    if (newComments.length > 0) this.#comments.selectExclusive(newComments[newComments.length - 1]!.id)
    return newNodes.map((n) => n.id)
  }

  pan(dx: number, dy: number): void { this.#viewport.pan(dx, dy) }

  /** Whether the graph responds to pointer interaction (node drag, selection/marquee, connecting).
   *  When `false` (locked) only viewport pan/zoom stay live and DOM widgets keep working — drag
   *  anywhere to pan without grabbing nodes. Drives the Controls lock toggle. */
  /** Replace the custom connection guard at runtime (or clear with `null`). */
  setIsValidConnection(fn: ((c: ConnectionRequest) => boolean) | null): void { this.#isValidConnection = fn ?? undefined }

  /** Subscribe to a per-frame tick (for a host evaluator/simulation). `cb` gets the frame delta in ms.
   *  Fires every frame between `startLoop()`/`stopLoop()`, and once per `step()`. Returns an
   *  unsubscribe fn. The editor isn't a runtime — this is just a clock the host can drive logic from. */
  onTick(cb: (dtMs: number) => void): () => void {
    this.#tickListeners.add(cb)
    return () => { this.#tickListeners.delete(cb) }
  }

  /** Start the per-frame loop: `onTick` subscribers fire on every animation frame with the real frame
   *  delta. No-op visual cost on its own — rendering still happens on demand when a tick mutates the graph. */
  /** Begin firing `onTick`. Pass `{fps}` to throttle (e.g. `startLoop({fps: 30})` for 30 ticks/s
   *  regardless of the actual frame rate). LiteGraph parity — useful for audio-rate / generative
   *  / simulation nodes where you don't want every browser frame. Omit / pass nothing for the
   *  default "every animation frame" behaviour. */
  startLoop(opts: { fps?: number } = {}): void {
    this.#tickInterval = opts.fps && opts.fps > 0 ? 1000 / opts.fps : 0
    this.#tickAccum = 0
    this.#looping = true
  }
  /** Stop the per-frame loop. `step()` still works while stopped. */
  stopLoop(): void { this.#looping = false }
  get looping(): boolean { return this.#looping }

  /** Fire one tick manually with a fixed delta (default 1/60 s) — deterministic stepping, independent
   *  of the loop. For a host that wants reproducible single-step execution. */
  step(dtMs = 1000 / 60): void { this.#emitTick(dtMs) }

  #emitTick(dtMs: number): void {
    for (const cb of this.#tickListeners) cb(dtMs)
  }

  /** Read-only flatten of a `$templateInstance` into its plain primitive subgraph (fresh ids) for a
   *  host evaluator: `{ nodes, edges, boundary }` where boundary maps each instance pin to the
   *  internal pin(s) it bridges. Recurses through nested instances; returns null if the node isn't an
   *  instance, its definition is unknown, or the template is recursive. The document is NOT mutated. */
  expandTemplateInstance(nodeId: NodeId): FlattenedTemplate | null {
    const node = this.graph.getNode(nodeId)
    if (!node || !isTemplateInstance(node)) return null
    return flattenTemplateInstance(
      node as Node,
      (id) => this.#definitions.get(id),
      { node: createNodeId, pin: createPinId, edge: createEdgeId },
    )
  }

  /** A plain structural snapshot of the displayed graph for a host interpreter — `{ nodes, edges }`
   *  with no PIXI/view data. With `{ expandMacros: true }` collapsed macros are flattened to their
   *  primitives (proxy-pin edges remapped to member pins) so the executor sees one flat graph and the
   *  grouping stays purely visual. Read-only; does not mutate the document. */
  graphSnapshot(opts?: { expandMacros?: boolean; expandTemplates?: boolean }): GraphSnapshot {
    const rawNodes = [...this.graph.nodes()] as Node[]
    const rawEdges = [...this.graph.edges()] as Edge[]
    let { nodes, edges } = opts?.expandMacros
      ? flattenMacroProxies(rawNodes, rawEdges)
      : { nodes: rawNodes, edges: rawEdges }
    if (opts?.expandTemplates) {
      ({ nodes, edges } = flattenAllTemplateInstances(
        nodes, edges,
        (id: TemplateDefId) => this.#definitions.get(id),
        { node: createNodeId, pin: createPinId, edge: createEdgeId },
      ))
    }
    return {
      nodes: nodes.map((n) => ({
        id: String(n.id),
        type: n.type,
        state: { ...n.state },
        pins: n.pins.map((p) => ({
          id: String(p.id), kind: p.kind, direction: p.direction, type: String(p.type),
          ...(p.default !== undefined ? { default: p.default } : {}),
          ...(p.multiple ? { multiple: true } : {}),
        })),
      })),
      edges: edges.map((e) => ({
        from: { node: String(e.from.node), pin: String(e.from.pin) },
        to: { node: String(e.to.node), pin: String(e.to.pin) },
      })),
    }
  }

  /** Toggle an edge's animated wire flow. Public, non-undoable tweak (animation is a transient view
   *  state). Works for virtualized edges with no live record too. */
  setEdgeAnimated(edgeId: EdgeId, animated: boolean): void {
    if (!this.graph.hasEdge(edgeId)) return
    const opts = { ...(this.#edgeOpts.get(edgeId) ?? {}), animated }
    this.#edgeOpts.set(edgeId, opts)
    if (animated) this.#animatedEdges.add(edgeId); else this.#animatedEdges.delete(edgeId)
    const rec = this.#edgeRecords.get(edgeId)
    if (rec) { rec.opts = opts; rec.lastFromX = rec.lastFromY = rec.lastToX = rec.lastToY = undefined; this.#redrawEdge(edgeId) }
    this.#requestRender()
  }

  /** Replace a node's pins at runtime (variadic pins — Sequence/MakeArray "+", Branch true/false).
   *  Undoable; edges to dropped pins are pruned; the node view refits to the new pin list. */
  setNodePins(nodeId: NodeId, pins: Pin[]): void {
    if (!this.graph.getNode(nodeId)) return
    this.commandBus.apply(new SetNodePins(nodeId, pins))
    // Pins changed (count/labels) → drop the stale size so the rebuilt view refits to the new pins.
    delete (this.graph.getNode(nodeId) as { size?: unknown }).size
    this.#rerenderNode(nodeId)
    this.#requestRender()
  }

  /** Replace a node's widget list wholesale — the dual of `setNodePins`, used by runtime plugins
   *  to synthesise widgets in response to schema changes (e.g. when a Schema node wires into a
   *  Struct, the plugin uses `setNodePins` + `setNodeWidgets` to derive both a pin and a
   *  pinKey-bound default-value widget per field). Undoable. Preserves `node.state[w.key]` — a
   *  re-add under the same key restores its prior value. */
  setNodeWidgets(nodeId: NodeId, widgets: WidgetSpec[] | undefined): void {
    if (!this.graph.getNode(nodeId)) return
    this.commandBus.apply(new SetNodeWidgets(nodeId, widgets))
    // Widget set changed (count/heights) → drop the stale size so the view refits + DOM widgets sync.
    delete (this.graph.getNode(nodeId) as { size?: unknown }).size
    this.#rerenderNode(nodeId)
    this.#domWidgets.sync()
    this.#requestRender()
  }

  /** Show a coloured status ring on a node (`running` pulses, `ok`/`error` are solid, `idle` clears).
   *  For surfacing graph-execution progress from the host — the editor isn't a runtime. */
  setNodeStatus(nodeId: NodeId, status: NodeStatus): void {
    if (status === 'idle') this.#nodeStatus.delete(nodeId)
    else this.#nodeStatus.set(nodeId, status)
    this.#requestRender()
  }

  /** Remove every node and edge and drop the undo/redo history — a fast, allocation-light reset (no
   *  per-node commands, no selection glow). The right way to empty a large graph. */
  clear(): void {
    const before = this.getGraphMirror()
    this.#clearAll()
    this.commandBus.clearHistory()
    this.#scheduleMinimapSync()
    this.#requestRender()
    this.#events.emit('graph:loaded', { nodeCount: 0, edgeCount: 0 })
    this.#events.emit('history:changed', { canUndo: false, canRedo: false })
    // E5: document wipes bypass the bus — emit the synthetic replace burst so mirrors converge.
    this.#events.emit('graph:changed', { changes: documentReplacedChanges(before, { nodes: [], edges: [] }) })
  }

  /** Clear every node status ring. */
  clearNodeStatuses(): void {
    if (this.#nodeStatus.size === 0) return
    this.#nodeStatus.clear()
    this.#requestRender()
  }

  #drawStatuses(): void {
    const g = this.#statusGfx
    if (!g) return
    g.clear()
    if (this.#nodeStatus.size === 0) return
    const accent = this.#theme.tokens.color.widget.fill
    const colorFor = (s: NodeStatus): string => (s === 'running' ? accent : s === 'ok' ? '#39d98a' : s === 'error' ? '#ff5b6e' : '')
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 140)
    let animating = false
    for (const [id, status] of this.#nodeStatus) {
      const view = this.#views.get(id)
      const node = this.graph.getNode(id)
      const color = colorFor(status)
      if (!view || !node || !color) continue
      // Skip nodes whose view is hidden (collapsed-macro members, expanded-macro placeholder).
      // Without this the status ring keeps painting at the last known container position,
      // leaving an orphan rectangle on the canvas — see step-debugger demo ghost bug.
      if (!view.container.visible) continue
      const size = node.size ?? { x: this.#theme.tokens.geometry.node.minWidth, y: 40 }
      const pad = 3
      const alpha = status === 'running' ? pulse : 0.95
      const width = status === 'running' ? 3 : 2.5
      // Concentric with the node body: ring radius = node corner radius + pad, so the rounded
      // corners stay parallel and the node's corners never poke outside the ring.
      const radius = this.#theme.tokens.geometry.node.radius + pad
      g.roundRect(view.container.x - pad, view.container.y - pad, size.x + pad * 2, size.y + pad * 2, radius)
        .stroke({ color, width, alpha })
      if (status === 'running') animating = true
    }
    if (animating) this.#requestRender()  // keep the pulse alive
  }

  /** Built-in type check + the optional user `isValidConnection` guard, against the two pins. */
  #connectionAllowed(sourceNode: Node, sourcePin: Pin, targetNode: Node, targetPin: Pin): boolean {
    if (!canConnect(sourcePin, targetPin, sourceNode.id === targetNode.id, {
      sourceEdges: this.#countEdgesAtPin(sourceNode.id, String(sourcePin.id)),
      targetEdges: this.#countEdgesAtPin(targetNode.id, String(targetPin.id)),
      types: this.#types,
    })) return false
    if (this.#isValidConnection) {
      const out = sourcePin.direction === 'out'
      const oN = out ? sourceNode : targetNode, oP = out ? sourcePin : targetPin
      const iN = out ? targetNode : sourceNode, iP = out ? targetPin : sourcePin
      if (!this.#isValidConnection({ source: oN.id, sourcePin: oP.id as PinId, target: iN.id, targetPin: iP.id as PinId })) return false
    }
    return true
  }

  get interactive(): boolean { return this.#interactive }
  setInteractive(interactive: boolean): void {
    this.#interactive = interactive
    // DOM widgets are real DOM above the canvas — the WebGL gate can't stop them; the layer
    // toggles their pointer events so a locked graph freezes framework widgets too.
    this.#domWidgets.setInteractivity(interactive)
  }

  /** G12 — Live Mode (LiteGraph parity). Freezes all interaction (`setInteractive(false)`) and
   *  hides editor-managed chrome (breadcrumb). Per-node rendering, plugin runtimes and animated
   *  edges keep ticking — the graph still LIVES, you just can't edit it. The overlay root gets
   *  `data-xeno-live="true"` so hosts can hide their own panels via CSS. Fires `livemode:changed`. */
  setLiveMode(live: boolean): void {
    if (this.#liveMode === live) return
    this.#liveMode = live
    this.setInteractive(!live)
    this.overlayRoot.setAttribute('data-xeno-live', live ? 'true' : 'false')
    this.#updateBreadcrumb()                                 // breadcrumb auto-hides in live mode
    this.#events.emit('livemode:changed', { live })
  }
  get liveMode(): boolean { return this.#liveMode }
  #liveMode = false
  zoomAt(focal: { x: number; y: number }, factor: number): void {
    this.#viewport.zoomAt(focal, factor, this.#zoomBounds)
  }
  resetView(): void { this.#viewport.reset() }

  /**
   * Frame the whole graph: compute the world-space AABB of every node and set the viewport so it
   * sits centred inside the canvas with `padding` px of margin. No-op on an empty graph. `maxZoom`
   * defaults to 1 so small graphs aren't blown up; `minZoom` defaults to the editor's zoom floor.
   */
  /** Arrange the whole graph with the layered DAG layout (rank by longest-path-from-source,
   *  ranks become columns in 'LR' or rows in 'TB'). The same layout the MCP `auto_layout` tool
   *  uses — hosts and agents get identical results. Collapsed macros are the layout unit;
   *  their hidden members translate along. `fit` (default true) frames the result. */
  autoLayout(opts: { direction?: 'LR' | 'TB'; spacing?: number; fit?: boolean } = {}): { moved: number; direction: 'LR' | 'TB' } {
    const direction = opts.direction ?? 'LR'
    const positions = layeredLayout(this, direction, opts.spacing ?? 80)
    for (const [id, p] of positions) this.moveNode(id, p)
    if (opts.fit !== false) this.fitView({ padding: 64 })
    return { moved: positions.size, direction }
  }

  fitView(opts: { padding?: number; maxZoom?: number; minZoom?: number } = {}): void {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let count = 0
    for (const node of this.graph.nodes()) {
      const b = nodeBounds(node, this.#theme.tokens)
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height)
      count++
    }
    if (count === 0) return
    this.#viewport.setState(
      fitView(
        { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        { width: Math.max(1, this.#app.screen.width), height: Math.max(1, this.#app.screen.height) },
        { padding: opts.padding ?? 64, maxZoom: opts.maxZoom ?? 1, minZoom: opts.minZoom ?? this.#zoomBounds[0] },
      ),
    )
  }

  get viewport(): ViewportState { return this.#viewport.state }
  /** How many nodes currently have a live PIXI view. With virtualization (#59) on a large graph this
   *  stays O(visible) — far below `graph.nodeCount` — which is what keeps GPU memory bounded. */
  /** @internal — renderer internals; hidden from the public `.d.ts` at v1.0. */
  get renderedNodeCount(): number { return this.#views.size }
  /** Set the viewport (pan/zoom) directly. */
  setViewport(state: ViewportState): void { this.#viewport.setState(state) }
  /** Convert a point in host/screen pixels (relative to the canvas top-left) to world coordinates —
   *  e.g. to spawn a node where the user dropped something. */
  screenToWorld(point: { x: number; y: number }): { x: number; y: number } { return screenToWorld(point, this.#viewport.state) }
  /** Convert a world-space point to host/screen pixels — e.g. to anchor a DOM overlay to a node. */
  worldToScreen(point: { x: number; y: number }): { x: number; y: number } { return worldToScreen(point, this.#viewport.state) }
  /**
   * The raw PIXI `Application` driving the editor.
   *
   * @internal — UNSTABLE. Exposes the PIXI v8 surface as a public dependency, which would lock
   * Xenolith to PIXI's major-version cadence after v1.0. Use specific public escape hatches
   * instead (`overlayRoot`, `exportImage`, `setTheme`). If you need something this getter is
   * currently your only path to, open an issue.
   */
  get app(): Application { return this.#app }
  get theme(): XenolithTheme { return this.#theme }
  get tokens(): XenTokens { return this.#theme.tokens }

  /**
   * Swap the active theme at runtime. Re-renders every node and recreates the grid; edges and
   * the ghost-edge (if any) pick up the new style on the next ticker frame. Selection, hover,
   * collapsed state, and node positions are preserved.
   *
   * Accepts either a full `XenolithTheme` or a `DeepPartial<XenTokens>` to tweak the active
   * theme's tokens while keeping its render hooks.
   */
  setTheme(input: XenolithTheme | DeepPartial<XenTokens>): void {
    const next: XenolithTheme = (typeof input === 'object' && 'id' in input && 'tokens' in input)
      ? input as XenolithTheme
      : { ...this.#theme, tokens: mergeTheme(this.#theme.tokens, input as DeepPartial<XenTokens>) }
    if (next === this.#theme) return
    this.#theme = next

    // Fire-and-forget font load for the new theme. We don't await — `setTheme` is sync UX and
    // font swap-in happens via `display: swap` on the FontFace; PIXI text will pick up the new
    // family on its next measure pass.
    if (next.fonts?.length) {
      const fontOpts = this.#fontUrls ? { selfHost: this.#fontUrls } : {}
      void loadFonts(next.fonts, fontOpts)
    }

    // Drop baked glow textures — geometry tokens (radii, sizes via padding) may have changed,
    // and any cached strokes from the previous theme would render with stale dimensions.
    clearGlowTextureCache()
    clearGradientCache()
    for (const tex of this.#bakeCache.values()) tex.destroy(true)
    this.#bakeCache.clear()

    // Invalidate per-edge endpoint cache so the ticker repaints every wire with the new theme's
    // drawEdge (colour / tension / etc) on the next frame — without this the skip-on-unchanged
    // optimisation would keep showing the previous theme's wires until something moves.
    for (const rec of this.#edgeRecords.values()) {
      delete rec.lastFromX
      delete rec.lastFromY
      delete rec.lastToX
      delete rec.lastToY
    }

    // Allocate/free backdrop RT to match the new theme's needs — Xen-style flat themes get the
    // extra render pass turned off entirely.
    if (next.needsBackdrop && !this.#backdropRT) {
      this.#backdropRT = this.#createBackdropRT()
    } else if (!next.needsBackdrop && this.#backdropRT) {
      this.#backdropRT.destroy(true)
      this.#backdropRT = null
    }

    // Canvas background follows the new theme.
    this.#app.renderer.background.color = next.tokens.color.surface.canvas

    // Re-create grid (themes may swap it for an entirely different visual).
    if (this.#gridLayer) {
      this.#gridLayer.parent?.removeChild(this.#gridLayer)
      this.#gridLayer.destroy({ children: true })
      this.#gridLayer = this.#createGrid()
      this.#world.addChildAt(this.#gridLayer, 0)
      this.#updateGrid()
    }

    // Invalidate cached node.size — it was measured against the PREVIOUS theme's geometry
    // (headerHeight, pin/widget row heights, header toPinsGap). Themes with a taller header or
    // bigger pin halos (Daylight: 20px halos vs Xen's 11px pin row) would keep the old body height
    // and their pin rows would render OUTSIDE the body silhouette. #ensureSize below re-measures.
    for (const n of this.graph.nodes()) delete (n as { size?: unknown }).size

    // Re-render every node through the new theme. We rebuild each NodeView from the source-of-
    // truth Node and discard the old container; collapsed state, position, and selection are
    // restored from the Graph + Selection (which are theme-agnostic).
    for (const [id, oldView] of [...this.#views]) {
      const node = this.graph.getNode(id)
      if (!node) continue
      this.#ensureSize(node as Node, this.#renderOpts.get(id) ?? {})
      const wasCollapsed = oldView.isCollapsed()
      const baseOpts = this.#renderOpts.get(id) ?? {}
      const newView = this.#renderNode(node, { ...baseOpts, collapsed: wasCollapsed })
      this.#nodesLayer.removeChild(oldView.container)
      oldView.container.destroy({ children: true })
      this.#views.set(id, newView)
      this.#nodesLayer.addChild(newView.container)
      this.#wireNodeInteraction(id, newView)
    }
    // Comments + macro frames are theme-rendered too (geometry.comment, typography.comment, accent) —
    // rebuild with the new tokens, otherwise they keep the previous theme's look in the new theme.
    this.#comments.dropViews()
    for (const f of this.#macroFrames.values()) f.destroy()
    this.#macroFrames.clear()
    this.#comments.sync()
    this.#applyMacroVisibility() // re-hide collapsed members + rebuild expanded frames in the new theme
    this.#updateVisualStates()
    // Refresh DOM widget hosts' --xeno-* CSS vars (and their controllers) for the new theme.
    this.#domWidgets.sync()
    // Edges re-paint themselves through the ticker via #drawEdge — no explicit pass needed.
    this.#palette?.setStyle(next.paletteStyle)
    this.#edgeMenu?.setStyle(next.paletteStyle)
    this.#widgetOverlay?.setStyle(next.paletteStyle)
    this.#minimap?.setStyle(next.tokens)
    this.#applyThemeVars()
    this.#styleOverlay()
    this.#requestRender()
  }

  destroy(): void {
    this.#looping = false
    this.#tickListeners.clear()
    this.#pluginHost.dispose()
    window.removeEventListener('keydown', this.#onKeyDown)
    window.removeEventListener('resize', this.#onResize)
    this.#hostResizeObserver?.disconnect()
    ;(this.#app.canvas as HTMLCanvasElement | undefined)?.removeEventListener('dblclick', this.#onDoubleClick)
    ;(this.#app.canvas as HTMLCanvasElement | undefined)?.removeEventListener('contextmenu', this.#onContextMenu)
    ;(this.#app.canvas as HTMLCanvasElement | undefined)?.removeEventListener('pointerdown', this.#onRightDown)
    ;(this.#app.canvas as HTMLCanvasElement | undefined)?.removeEventListener('pointerup',   this.#onRightUp)
    ;(this.#app.canvas as HTMLCanvasElement | undefined)?.removeEventListener('dragover',    this.#onDragOver)
    ;(this.#app.canvas as HTMLCanvasElement | undefined)?.removeEventListener('drop',        this.#onDrop)
    this.#palette?.destroy()
    this.#search?.dispose()
    this.#interaction?.detach()
    if (this.#freezeTimer) clearTimeout(this.#freezeTimer)
    this.#domWidgets.destroy()
    this.#controls?.destroy()
    this.#minimap?.destroy()
    this.#overlayRoot?.remove()
    this.#overlayRoot = null
    this.#freezeRT?.destroy(true)
    this.#backdropRT?.destroy(true)
    this.#destroyed = true
    this.#app.destroy(true, { children: true })
  }

  /** True once {@link destroy} ran. Documented in STABLE-API — restored 2026-09-28 (E4):
   *  the accessor had drifted out of the code while the contract kept listing it. */
  get isDestroyed(): boolean { return this.#destroyed }

  /** G3 a11y slice 1 — the canvas host becomes a focusable application with a live region.
   *  Screen readers still cannot traverse the WebGL scene; what they get is: keyboard
   *  navigation of nodes (arrows / Enter / Esc, see #onKeyDown), focus visibility, and a
   *  polite announcement of what the selection became. */
  #setupA11y(): void {
    this.#host.setAttribute('role', 'application')
    this.#host.setAttribute('aria-label', 'Node graph editor')
    this.#host.tabIndex = 0
    // Focus ring only when the HOST itself gains focus (keyboard Tab), not when an inner
    // input (palette, search, widgets) focuses — those carry their own focus styles.
    this.#host.addEventListener('focusin', (e) => {
      if (e.target === this.#host) this.#host.style.outline = '2px solid var(--xeno-accent, #d8b45a)'
    })
    this.#host.addEventListener('focusout', () => { this.#host.style.outline = '' })
    const live = document.createElement('div')
    live.setAttribute('aria-live', 'polite')
    live.setAttribute('aria-atomic', 'true')
    live.style.cssText = 'position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap;'
    this.overlayRoot.appendChild(live)
    this.#srLive = live
  }

  #announceSelection(ids: readonly NodeId[]): void {
    if (!this.#srLive) return
    if (ids.length === 0) { this.#srLive.textContent = 'Selection cleared'; return }
    if (ids.length === 1) {
      const hit = this.findNodes({}).find((n) => n.id === String(ids[0]))
      this.#srLive.textContent = `Selected ${hit?.title ?? hit?.type ?? 'node'}`
      return
    }
    this.#srLive.textContent = `${ids.length} nodes selected`
  }

  /** Arrow keys move selection to the nearest node whose center lies strictly in that
   *  direction (see keyboard-nav.ts). No selection → start from the viewport center. */
  #keyboardNavigate(dir: 'left' | 'right' | 'up' | 'down'): void {
    const rects: NavNodeRect[] = []
    for (const n of this.graphNodes()) {
      const size = n.size ?? { x: this.#theme.tokens.geometry.node.minWidth, y: 40 }
      rects.push({ id: String(n.id), x: n.position.x, y: n.position.y, w: size.x, h: size.y })
    }
    if (rects.length === 0) return
    const selected = [...this.selection.ids()]
    let origin: { x: number; y: number }
    if (selected.length === 1) {
      const n = this.graph.getNode(selected[0]!)
      if (!n) return
      const size = n.size ?? { x: this.#theme.tokens.geometry.node.minWidth, y: 40 }
      origin = { x: n.position.x + size.x / 2, y: n.position.y + size.y / 2 }
    } else {
      const c = this.screenToWorld({
        x: this.#host.clientWidth / 2,
        y: this.#host.clientHeight / 2,
      })
      origin = c
    }
    const hit = nearestNodeInDirection(rects, origin, dir)
    if (!hit) return
    this.setSelection([hit as NodeId])
    // Bring the target into view only when it is off-screen — the canvas shouldn't lurch on
    // every arrow press while navigating a visible cluster.
    const target = rects.find((r) => r.id === hit)!
    const screen = this.worldToScreen({ x: target.x + target.w / 2, y: target.y + target.h / 2 })
    const margin = 80
    if (
      screen.x < margin || screen.y < margin
      || screen.x > this.#host.clientWidth - margin || screen.y > this.#host.clientHeight - margin
    ) {
      this.focusNode(hit as NodeId)
    }
  }

  readonly #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#pointer.isPinDrag()) {
      this.#cancelPinDrag()
      return
    }

    // Escape closes the sidebar even when focus sits in one of its inputs — carve this out
    // BEFORE the input guard below, which would otherwise swallow the key (standard editor
    // UX: Esc always exits the top-most overlay).
    if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey && this.isSidebarOpen()) {
      e.preventDefault()
      this.closeSidebar()
      return
    }

    // Don't intercept when a text field has focus.
    const target = e.target as { tagName?: string; isContentEditable?: boolean } | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return
    }

    // User-registered commands run FIRST so a host that binds `Cmd+Shift+C` for "Copy with
    // comment" can override (or co-exist with) anything Xenolith does. If the registry's match
    // executes, swallow the event so we don't also fire a built-in shortcut on the same chord.
    const matched = this.#commands.lookupByHotkey(e)
    if (matched) {
      e.preventDefault()
      matched.execute()
      return
    }

    const mod = e.metaKey || e.ctrlKey

    if (!mod && e.key === '`') {
      e.preventDefault()
      this.toggleStats()
      return
    }
    if (!mod && e.key === 'Tab') {
      e.preventDefault()
      if (this.isPaletteOpen) this.closePalette()
      else this.openPalette()
      return
    }
    if (mod && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault()
      if (this.isSearchOpen) this.closeSearch()
      else this.openSearch()
      return
    }
    if (!mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      this.#keyboardNavigate(e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'up' : 'down')
      return
    }
    if (!mod && e.key === 'Enter') {
      const selected = [...this.selection.ids()]
      if (selected.length === 1) {
        e.preventDefault()
        this.openSidebar(selected[0]!)
        return
      }
    }
    if (!mod && e.key === 'Escape' && this.selection.size > 0) {
      e.preventDefault()
      this.setSelection([])
      return
    }
    if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
      if (this.#comments.selectionSize() > 0) {
        e.preventDefault()
        const ids = this.#comments.selectedIds()
        this.#comments.clearSelection()
        this.commandBus.transaction(() => { for (const id of ids) this.removeComment(id) })
        // Fall through to also delete any selected nodes; bail only if there are none.
      }
      if (this.selection.size === 0) return
      e.preventDefault()
      this.deleteSelected()
      return
    }
    if (mod && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault()
      this.undo()
      return
    }
    if (mod && ((e.key === 'z' || e.key === 'Z') && e.shiftKey || e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      this.redo()
      return
    }
    if (mod && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault()
      this.selectAll()
      return
    }
    if (mod && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      this.duplicateSelected()
      return
    }
    if (mod && (e.key === 'g' || e.key === 'G')) {
      // Cmd/Ctrl+G — Collapse the selection into an in-place macro. With Shift — convert it into a
      // reusable Template instance instead (one shared definition, dive-in to edit).
      if (this.selection.size === 0) return
      e.preventDefault()
      if (e.shiftKey) this.createTemplateFromSelection()
      else this.createMacroFromSelection()
      return
    }
    if (mod && (e.key === 'c' || e.key === 'C')) {
      // A bare comment selection (no nodes) is still copyable — it carries its contents.
      if (this.selection.size === 0 && this.#comments.selectionSize() === 0) return
      e.preventDefault()
      this.copySelection()
      return
    }
    if (mod && (e.key === 'v' || e.key === 'V')) {
      if (!this.#clipboard) return
      e.preventDefault()
      const at = this.#lastPointerWorld
      this.paste(at ?? undefined)
      return
    }
  }

  #updateVisualStates(): void {
    for (const [id, view] of this.#views) {
      let next: 'default' | 'hover' | 'selected'
      if (this.selection.contains(id)) next = 'selected'
      else if (this.#marqueeHovered.has(id) || id === this.#hoveredId) next = 'hover'
      else next = 'default'
      view.setVisualState(next)
    }
  }

  /** World-space position for a node, using its Container's current Container.position during a
   *  drag (the graph itself hasn't been mutated until pointerup), or its graph position otherwise. */
  #livePosition(nodeId: NodeId): { x: number; y: number } | null {
    const view = this.#views.get(nodeId)
    if (view) return { x: view.container.position.x, y: view.container.position.y }
    const node = this.graph.getNode(nodeId)
    return node ? { ...node.position } : null
  }

  /** The node's CURRENT rendered (view) position — equals `node.position` at rest, but during a drag
   *  it's the live cursor-follow position (ahead of the not-yet-committed `node.position`). Null if the
   *  node has no live view (virtualized off-screen). Handy for anchoring DOM overlays to a node.
   *
   *  @internal — renderer internals; hidden from the public `.d.ts` at v1.0. */
  renderedNodePosition(nodeId: NodeId): { x: number; y: number } | null {
    return this.#livePosition(nodeId)
  }

  /** Is this node's view currently DRAWN on the canvas? Returns:
   *   - `true`  — view exists AND its container is visible (a viewer would see it),
   *   - `false` — view exists but is hidden (typically a macro member when its macro is collapsed),
   *   - `null`  — no view at all (off-screen under virtualisation, or never materialised).
   *  Designed for e2e introspection: tests can assert "macro members must NOT be visible after
   *  paste" without poking at private state. Cheap (Map lookup + bool read).
   *
   *  @internal — renderer internals; hidden from the public `.d.ts` at v1.0. */
  isNodeRendered(nodeId: NodeId): boolean | null {
    const view = this.#views.get(nodeId)
    if (!view) return null
    return view.container.visible === true
  }

  #pinLayoutFor(node: Node, pinIndex: number): PinLayout {
    const g = this.#theme.tokens.geometry
    const layout = computeNodeLayout(node, {
      node:   g.node,
      pin:    { diameter: g.pin.diameter, rowSpacing: g.pin.rowSpacing, rowHeight: g.pin.rowHeight },
      header: { toPinsGap: g.header.toPinsGap },
      widget: { rowHeight: g.widget.rowHeight, gap: g.widget.gap, controlMinWidth: g.widget.controlMinWidth },
    }, (k) => this.#isPinConnected(node.id, k))
    const pin = node.pins[pinIndex]
    if (!pin) throw new Error(`pinLayoutFor: no pin at index ${pinIndex}`)
    const layoutPin = layout.pins.find((p) => p.id === pin.id)
    if (!layoutPin) throw new Error(`pinLayoutFor: pin not in layout`)
    return layoutPin
  }

  /** Recompute and paint a single edge using each endpoint's live (drag/collapse-aware) position.
   *  When a node is collapsed (or animating), the pin is at a different local position — we ask
   *  the NodeView directly. Otherwise we fall back to computeNodeLayout. */
  #redrawEdge(edgeId: EdgeId): void {
    const rec = this.#edgeRecords.get(edgeId)
    if (!rec) return
    const fromNode = this.graph.getNode(rec.edge.from.node)
    const toNode = this.graph.getNode(rec.edge.to.node)
    if (!fromNode || !toNode) return
    const fromPos = this.#pinWorldPosition(fromNode, rec.edge.from.pin)
    const toPos = this.#pinWorldPosition(toNode, rec.edge.to.pin)
    if (!fromPos || !toPos) return
    // Skip the expensive bezier-sample + Graphics clear/stroke when endpoints haven't moved.
    // Catches both idle frames (zero edge work on a static graph) and the non-dragging edges
    // during a multi-node drag. Triggers naturally on collapse animation because
    // pinLocalPosition shifts each animation frame. Animated edges never skip — they must redraw
    // each frame for the flowing dash.
    if (
      !rec.opts.animated &&
      rec.lastFromX === fromPos.x && rec.lastFromY === fromPos.y &&
      rec.lastToX   === toPos.x   && rec.lastToY   === toPos.y
    ) return
    if (rec.opts.animated) rec.opts.dashPhase = this.#dashPhase
    this.#drawEdge(rec.graphics, fromPos, toPos, rec.opts)
    this.#updateEdgeLabel(rec, fromPos, toPos)
    rec.lastFromX = fromPos.x
    rec.lastFromY = fromPos.y
    rec.lastToX   = toPos.x
    rec.lastToY   = toPos.y
  }

  /** Create / update / drop an edge's midpoint label Text from `rec.opts.label`. The label rides the
   *  world layer so it pans and zooms with the wire. */
  #updateEdgeLabel(rec: EdgeRecord, from: PinLayout, to: PinLayout): void {
    const text = rec.opts.label
    if (!text) {
      if (rec.label) { rec.label.parent?.removeChild(rec.label); rec.label.destroy(); rec.label = undefined }
      return
    }
    const tokens = this.#theme.tokens
    if (!rec.label) {
      rec.label = new Text({
        text,
        style: {
          fontFamily: tokens.typography.fontFamily,
          fontSize: 12,
          fill: tokens.color.text.primary,
          stroke: { color: tokens.color.surface.canvas, width: 4 },
          align: 'center',
        },
      })
      rec.label.eventMode = 'none'
      rec.label.anchor.set(0.5)
      this.#edgesLayer.addChild(rec.label)
    } else if (rec.label.text !== text) {
      rec.label.text = text
    }
    const mid = bezierMidpoint(computeEdgePath(from, to, tokens.geometry.edge))
    rec.label.position.set(mid.x, mid.y)
  }

  #pinWorldPosition(node: Node, pinId: string): PinLayout | null {
    const view = this.#views.get(node.id)
    const livePos = this.#livePosition(node.id) ?? node.position
    if (view) {
      const local = view.pinLocalPosition(pinId)
      if (local) {
        const pin = node.pins.find((p) => p.id === pinId)
        if (!pin) return null
        return {
          id: pin.id as PinLayout['id'],
          x: livePos.x + local.x,
          y: livePos.y + local.y,
          side: pin.direction === 'in' ? 'left' : 'right',
        }
      }
    }
    const idx = node.pins.findIndex((p) => p.id === pinId)
    if (idx < 0) return null
    return this.#pinLayoutFor({ ...node, position: livePos }, idx)
  }

  /** Return the EdgeId of the most-recently-added edge incident to this pin, or null. The Map's
   *  insertion order gives us "newest first" by iterating in reverse. */
  #findIncidentEdgeId(nodeId: NodeId, pinId: string): EdgeId | null {
    const records = [...this.#edgeRecords.values()].reverse()
    for (const rec of records) {
      if ((rec.edge.from.node === nodeId && String(rec.edge.from.pin) === pinId) ||
          (rec.edge.to.node   === nodeId && String(rec.edge.to.pin)   === pinId)) {
        return rec.edge.id
      }
    }
    return null
  }

  /** Remove an edge's Graphics from the scene and drop its bookkeeping. The command-bus
   *  invocation (DisconnectEdge) is the caller's job. */
  #disposeEdgeGraphics(edgeId: EdgeId): void {
    const rec = this.#edgeRecords.get(edgeId)
    if (!rec) return
    rec.graphics.parent?.removeChild(rec.graphics)
    rec.graphics.destroy()
    if (rec.label) { rec.label.parent?.removeChild(rec.label); rec.label.destroy() }
    this.#animatedEdges.delete(edgeId)
    this.#edgeRecords.delete(edgeId)
  }

  /** Materialise an edge's Graphics from the model. Used by `connect()`, `#loadEdge()`, and the
   *  command-driven sync path. Resolves pin layouts and writes an EdgeRecord into `#edgeRecords`.
   *  Returns false if either endpoint is missing (stale edge in the model). */
  #materializeEdge(edge: Edge, opts: RenderEdgeOptions): boolean {
    const fromNode = this.graph.getNode(edge.from.node)
    const toNode   = this.graph.getNode(edge.to.node)
    if (!fromNode || !toNode) return false
    // Resolve via the live NodeView so non-layout pin geometry (reroute knots, collapsed pills)
    // attaches correctly; falls back to computeNodeLayout when a view isn't mounted yet.
    const fromPin = this.#pinWorldPosition(fromNode, String(edge.from.pin))
    const toPin   = this.#pinWorldPosition(toNode,   String(edge.to.pin))
    if (!fromPin || !toPin) return false
    // Default the wire colour to the source pin's type when the host didn't specify one, so a
    // typed wire is never drawn grey just because opts omitted sourceType.
    let resolved = opts
    if (resolved.sourceType === undefined) {
      const sp = (fromNode as Node).pins.find((p) => String(p.id) === String(edge.from.pin))
      if (sp) resolved = { ...resolved, sourceType: String(sp.type) }
    }
    const gfx = this.#renderEdge(fromPin, toPin, resolved)
    this.#edgesLayer.addChild(gfx)
    this.#edgeRecords.set(edge.id, { edge, graphics: gfx, opts: resolved })
    this.#edgeOpts.set(edge.id, resolved)
    if (resolved.animated) this.#animatedEdges.add(edge.id)
    return true
  }

  /** Options applied to every edge that does not set the same field itself. A later call merges.
   *  Existing wires repaint immediately. Persisted per-edge overrides (via `setEdgeOptions`) win. */
  setDefaultEdgeOptions(opts: Partial<RenderEdgeOptions>): void {
    this.#defaultEdgeOptions = { ...this.#defaultEdgeOptions, ...opts }
    for (const rec of this.#edgeRecords.values()) {
      rec.lastFromX = rec.lastFromY = rec.lastToX = rec.lastToY = undefined
      this.#redrawEdge(rec.edge.id)
    }
    this.#requestRender()
  }

  /** Effective render options for an edge: defaults underneath anything stored on that edge.
   *  Undefined when the edge is not in the graph. */
  getEdgeOptions(edgeId: EdgeId): RenderEdgeOptions | undefined {
    if (!this.graph.getEdge(edgeId)) return undefined
    return mergeEdgeOptions(this.#defaultEdgeOptions, this.#edgeOpts.get(edgeId) ?? {})
  }

  /** Update an edge's render options (label / arrowhead marker / animated flow / wire colour).
   *  Merges over the existing options, repaints, and persists through serialization. */
  setEdgeOptions(edgeId: EdgeId, opts: Partial<RenderEdgeOptions>): void {
    if (!this.graph.getEdge(edgeId)) return
    // Data-first: the opts map is the source of truth (it feeds toJSON and later re-materialise),
    // so ALWAYS merge here — even when the edge has no rendered record yet. Bus-routed connects
    // (the canonical path since E2) materialise in the scheduled microtask sync, and culled/
    // virtualized edges have no record either; the old `if (!rec) return` silently DROPPED opts
    // for both (observed as embed-gaps e2e: setEdgeOptions right after connect lost pathStyle).
    const merged: RenderEdgeOptions = { ...(this.#edgeOpts.get(edgeId) ?? {}), ...opts }
    this.#edgeOpts.set(edgeId, merged)
    const rec = this.#edgeRecords.get(edgeId)
    if (!rec) { this.#requestRender(); return }
    rec.opts = { ...merged }
    if (rec.opts.animated) this.#animatedEdges.add(edgeId)
    else this.#animatedEdges.delete(edgeId)
    // Force a repaint even if endpoints are unchanged (label/marker/colour may have changed).
    rec.lastFromX = rec.lastFromY = rec.lastToX = rec.lastToY = undefined
    this.#redrawEdge(edgeId)
    this.#requestRender()
  }

  #syncPending = false

  /** Queue a single `#syncFromGraph()` for the next microtask. Idempotent — many calls in one
   *  synchronous tick (e.g. a transaction firing N command:applied events) collapse into one
   *  reconcile, turning paste/duplicate from O(N²) into O(N). */
  #scheduleSync(): void {
    if (this.#syncPending) return
    this.#syncPending = true
    queueMicrotask(() => {
      this.#syncPending = false
      this.#syncFromGraph()
    })
  }

  /** Reconcile views with the graph model. Called after every command apply/undo/redo so that
   *  user-driven mutations (Delete, Cmd+Z, Cmd+D, paste) immediately reflect on the canvas. */
  #syncFromGraph(): void {
    // Node positions/membership may have changed (drag commit, delete, paste) — refresh the spatial
    // grid + edge index once so culling queries stay correct. O(N) but only on edits, never per frame.
    this.#rebuildSpatialGrid()
    this.#rebuildEdgeIndex()
    // Virtualization: past the threshold, only nodes near the viewport get a live view. A node is
    // wanted if it's in the inner (create) band, or already live and still in the outer (keep) band
    // — the hysteresis that avoids churn. Off-screen nodes drop their view but stay as graph data.
    const virtualize = this.#virtualizeActive()
    const bands = virtualize ? this.#virtualizeBands() : null
    const seenNodes = new Set<NodeId>()
    for (const node of this.graph.nodes()) {
      seenNodes.add(node.id)
      const live = this.#views.has(node.id)
      let want = true
      if (bands) {
        const b = nodeBounds(node as Node, this.#theme.tokens)
        want = live ? rectIntersects(b, bands.outer) : rectIntersects(b, bands.inner)
      }
      if (!want) {
        if (live) this.#destroyViewOffscreen(node.id) // left the band — view goes, data stays
        continue
      }
      this.#ensureView(node as Node) // creates if missing, refreshes position otherwise
    }
    let droppedFromSelection = false
    for (const [id, view] of Array.from(this.#views)) {
      if (seenNodes.has(id)) continue
      view.container.destroy({ children: true })
      this.#views.delete(id)
      if (this.selection.contains(id)) droppedFromSelection = true
      this.#marqueeHovered.delete(id)
      if (this.#hoveredId === id) this.#hoveredId = null
      // A removed node must not keep a status ring — otherwise a deleted "running" node stays lit.
      this.#nodeStatus.delete(id)
    }
    if (droppedFromSelection) {
      this.selection.replaceWith(this.selection.ids().filter((id) => seenNodes.has(id)))
    }

    if (this.#virtualizeActive()) {
      // Edges are virtualized too: only those incident to a live node get Graphics (full level);
      // in sprite/flat the LOD batch draws them, so no per-edge records.
      if (this.#lodLevel === 'full') this.#cullEdges()
    } else {
      // Small graph — materialise every edge (the original 1:1 path).
      const seenEdges = new Set<EdgeId>()
      for (const edge of this.graph.edges()) {
        seenEdges.add(edge.id)
        if (this.#edgeRecords.has(edge.id)) continue
        this.#materializeEdge(edge as Edge, this.#edgeOpts.get(edge.id) ?? {})
      }
      for (const id of Array.from(this.#edgeRecords.keys())) {
        if (!seenEdges.has(id)) this.#disposeEdgeGraphics(id)
      }
    }

    this.#propagateRerouteTypes()
    // Newly materialised views must reflect current selection immediately (e.g. a node inserted +
    // selected in the same tick) — the selection change fired before its view existed, and
    // render-on-demand won't repaint on its own.
    this.#updateVisualStates()
    this.#comments.sync() // keep comment frames in sync on every mutation (incl. undo/redo)
    this.#applyMacroVisibility() // hide members of collapsed macros (incl. undo/redo)
    this.#domWidgets.sync()
    this.#scheduleMinimapSync()
    // If a graph edit lands while zoomed out, refresh whatever batch the current LOD level draws.
    if (this.#lodLevel !== 'full') {
      this.#lodLayer.removeChildren().forEach((c) => c.destroy())
      this.#lodLayer.addChild(this.#buildLODEdges())
      if (this.#lodLevel === 'flat') this.#lodLayer.addChild(this.#buildLODNodes())
    }
    this.#requestRender()
  }

  /** Rebuild a single node's view in place (e.g. after its pin types changed). Preserves position,
   *  collapse state and selection. */
  /** Pin ids on `nodeId` that currently have at least one edge attached. Drives the exec-pin paint
   *  via {@link RenderNodeOptions.connectedPinIds}. Cheap — reads the per-node edge index. */
  #connectedPinIdsFor(nodeId: NodeId): Set<string> {
    const out = new Set<string>()
    for (const eid of this.#edgesByNode.get(nodeId) ?? []) {
      const e = this.graph.getEdge(eid as EdgeId)
      if (!e) continue
      if (e.from.node === nodeId) out.add(String(e.from.pin))
      if (e.to.node === nodeId)   out.add(String(e.to.pin))
    }
    return out
  }

  #rerenderNode(id: NodeId): void {
    const node = this.graph.getNode(id)
    const oldView = this.#views.get(id)
    if (!node || !oldView) return
    const opts = { ...(this.#renderOpts.get(id) ?? {}), collapsed: oldView.isCollapsed() }
    const newView = this.#renderNode(node as Node, opts)
    this.#nodesLayer.removeChild(oldView.container)
    oldView.container.destroy({ children: true })
    this.#views.set(id, newView)
    this.#nodesLayer.addChild(newView.container)
    this.#wireNodeInteraction(id, newView)
  }

  /** Propagate wire types through reroutes: a reroute adopts the type of whatever feeds its input,
   *  on both pins, so its dot/box colour, its output pin, and its outgoing wires all match the
   *  incoming wire (no colour mismatch / confusion). Cascades through reroute chains. Cheap no-op
   *  when nothing changed (e.g. freshly imported graphs already carry resolved types). */
  #propagateRerouteTypes(): void {
    // Index topology once; types are read live from the pins as the fixpoint iterates.
    const incoming = new Map<NodeId, Edge>()
    const outgoing = new Map<NodeId, Edge[]>()
    for (const e of this.graph.edges()) {
      incoming.set(e.to.node, e as Edge)
      const arr = outgoing.get(e.from.node); if (arr) arr.push(e as Edge); else outgoing.set(e.from.node, [e as Edge])
    }
    const reroutes: Node[] = []
    const boundaries: Node[] = []
    for (const n of this.graph.nodes()) {
      if (isReroute(n) || n.type === REROUTE_NODE_TYPE) reroutes.push(n as Node)
      else if (isTemplateBoundary(n)) boundaries.push(n as Node)
    }
    if (reroutes.length === 0 && boundaries.length === 0) return

    let changed = true
    let guard = 0
    while (changed && guard++ < 16) {
      changed = false
      // Template boundary nodes are wildcard relays too: a `$templateInput` adopts the type of the
      // member IN-pin it feeds (downstream), a `$templateOutput` the type of the member OUT-pin that
      // feeds it (upstream). So the interface type is driven by the definition's own wiring; the
      // instance picks it up via templateInterface on dive-out. (See [generic-templates] for the
      // deferred per-instance variant.)
      for (const node of boundaries) {
        if (node.type === TEMPLATE_INPUT_TYPE) {
          const outPin = node.pins.find((p) => p.direction === 'out')
          if (!outPin) continue
          let type = 'any'
          for (const e of outgoing.get(node.id) ?? []) {
            const tn = this.graph.getNode(e.to.node)
            const tp = tn?.pins.find((p) => String(p.id) === String(e.to.pin))
            if (tp && String(tp.type) !== 'any') { type = String(tp.type); break }
          }
          if (String(outPin.type) === type) continue
          outPin.type = type
          changed = true
          this.#rerenderNode(node.id)
          for (const e of outgoing.get(node.id) ?? []) {
            const opts = { ...(this.#edgeOpts.get(e.id) ?? {}), sourceType: type }
            this.#edgeOpts.set(e.id, opts)
            const rec = this.#edgeRecords.get(e.id); if (rec) rec.opts = opts
            this.#redrawEdge(e.id)
          }
        } else {
          const inPin = node.pins.find((p) => p.direction === 'in')
          if (!inPin) continue
          let type = 'any'
          const feed = incoming.get(node.id)
          if (feed) {
            const sn = this.graph.getNode(feed.from.node)
            const sp = sn?.pins.find((p) => String(p.id) === String(feed.from.pin))
            if (sp) type = String(sp.type)
          }
          if (String(inPin.type) === type) continue
          inPin.type = type
          changed = true
          this.#rerenderNode(node.id)
        }
      }
      for (const node of reroutes) {
        const inPin = node.pins.find((p) => p.direction === 'in')
        const outPin = node.pins.find((p) => p.direction === 'out')
        if (!inPin || !outPin) continue
        const feed = incoming.get(node.id)
        let type = 'any'
        if (feed) {
          const sn = this.graph.getNode(feed.from.node)
          const sp = sn?.pins.find((p) => String(p.id) === String(feed.from.pin))
          if (sp) type = String(sp.type)
        }
        if (String(inPin.type) === type && String(outPin.type) === type) continue
        inPin.type = type
        outPin.type = type
        changed = true
        this.#rerenderNode(node.id)
        for (const e of outgoing.get(node.id) ?? []) {
          const opts = { ...(this.#edgeOpts.get(e.id) ?? {}), sourceType: type }
          this.#edgeOpts.set(e.id, opts)
          const rec = this.#edgeRecords.get(e.id)
          if (rec) rec.opts = opts
          this.#redrawEdge(e.id)
        }
      }
    }
    if (guard > 1) this.#requestRender()
  }

  #countEdgesAtPin(nodeId: NodeId, pinId: string): number {
    let n = 0
    for (const edge of this.graph.edges()) {
      if ((edge.from.node === nodeId && String(edge.from.pin) === pinId) ||
          (edge.to.node   === nodeId && String(edge.to.pin)   === pinId)) {
        n++
      }
    }
    return n
  }

  /** Find every edge that touches any node in `nodeIds`. */
  #edgesAttachedTo(nodeIds: ReadonlySet<NodeId>): Set<EdgeId> {
    const out = new Set<EdgeId>()
    for (const [edgeId, rec] of this.#edgeRecords) {
      if (nodeIds.has(rec.edge.from.node) || nodeIds.has(rec.edge.to.node)) out.add(edgeId)
    }
    return out
  }

  #wireStageInteraction(): void { this.#pointer.wireStageInteraction() }
  #wireNodeInteraction(id: NodeId, view: NodeView): void { this.#pointer.wireNodeInteraction(id, view) }
  #ensureWidgetOverlay(): WidgetOverlay { return this.#pointer.ensureWidgetOverlay() }
  #cancelInFlightInteraction(): void { this.#pointer.cancelInFlightInteraction() }
  #cancelPinDrag(): void { this.#pointer.cancelPinDrag() }
}

// Keep an unused PIXI re-export bound so TS doesn't tree-shake the symbol away.
void (PixiEventEmitter as unknown)
