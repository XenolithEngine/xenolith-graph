import { REROUTE_TYPE } from '@xenolithengine/graph-core'
import type { NodeSchema, PinSchema, WidgetSpec } from '@xenolithengine/graph-core'
import type { XenolithGraphV1, XenolithNodeV1, XenolithPinV1, XenolithEdgeV1 } from '@xenolithengine/graph-editor'

/**
 * Map a ComfyUI node's positional `widgets_values` to typed widgets. Without the server's
 * `object_info`, the workflow JSON only carries the *values* (not widget names/types), so we infer
 * the control from the value's runtime type: number→number, boolean→toggle, string→text (multiline
 * when long / has newlines). Values seed `node.state[wN]`. Full fidelity (names, combos, min/max)
 * arrives when object_info is supplied — a later upgrade.
 */
/** ComfyUI widgets_values are POSITIONAL — without object_info we can't recover the param names.
 *  Under the widget canon every widget binds to an IN-pin via its `key`, so we mint one synthetic
 *  IN-pin per importable widget. The pin's label is the same `param N` the widget shows; the
 *  caller can wire into it just like a regular input. Outputs: widgets (with `key` matching the
 *  pin's label), state seeded with each value, and the synthetic pins to merge into `node.pins`. */
function widgetsFromValues(values: unknown): { widgets: WidgetSpec[]; state: Record<string, unknown>; widgetPins: PinSchema[] } {
  const widgets: WidgetSpec[] = []
  const state: Record<string, unknown> = {}
  const widgetPins: PinSchema[] = []
  if (!Array.isArray(values)) return { widgets, state, widgetPins }
  values.forEach((v, i) => {
    const key = `param ${i + 1}`
    // Widget `key` = pin `label`; the canon's auto-bind matches them so the widget rides in the
    // pin's row (hidden when the user wires a value in). The synthetic IN-pin uses the same id
    // namespace as the rest of the node's pins (`c<id>:w<i>`).
    if (typeof v === 'number') {
      widgets.push({ id: key, type: 'number', label: '', key })
      widgetPins.push({ kind: 'data', direction: 'in', type: 'float', label: key, multiple: false })
    } else if (typeof v === 'boolean') {
      widgets.push({ id: key, type: 'toggle', label: '', key })
      widgetPins.push({ kind: 'data', direction: 'in', type: 'bool', label: key, multiple: false })
    } else if (typeof v === 'string') {
      widgets.push({ id: key, type: 'text', label: '', key })
      widgetPins.push({ kind: 'data', direction: 'in', type: 'string', label: key, multiple: false })
    } else return // arrays / objects (e.g. seed-control pairs) — skip
    state[key] = v
  })
  return { widgets, state, widgetPins }
}

// ---- object_info-driven import (H2) --------------------------------------------------------------
//
// The server's /object_info carries what the workflow JSON lacks: widget NAMES, combo option
// lists, and min/max/step for numerics. Shape per type: { input: { required: { name: [spec…] } },
// output: […] }. A spec's FIRST element is the type: a string ('INT'/'FLOAT'/'BOOLEAN'/'STRING'
// are widgets; socket names like MODEL are not) or an ARRAY of options (a combo). The second
// element is the config — an object {min,max,step,multiline} or a legacy array [min,max,step].
// widgets_values serialize in the DECLARATION order of widget-typed inputs, so the k-th declared
// widget consumes values[k]; declared-but-absent values fall back to honest defaults.

export interface ComfyObjectInfo {
  input?: { required?: Record<string, readonly unknown[]>; optional?: Record<string, readonly unknown[]> }
  output?: unknown[]
  name?: string
  category?: string
}

export interface ComfyImportReport {
  /** Nodes whose type had an object_info entry (named-widget path). */
  nodesWithObjectInfo: number
  /** Widgets mapped from a DECLARED input (named, possibly with combo options / min-max). */
  widgetsNamed: number
  /** Widgets mapped by the positional value-shape heuristic (`param N`). */
  widgetsInferred: number
  /** values[k] entries consumed by neither path (arrays/objects like seed-control pairs). */
  widgetsSkipped: number
}

interface DeclaredWidget {
  name: string
  spec: WidgetSpec
  pin: PinSchema
  /** Value when neither widgets_values nor a combo default can supply one. */
  fallback: unknown
}

const numberConfig = (cfg: unknown): { min?: number; max?: number; step?: number } => {
  // exactOptionalPropertyTypes: an optional prop must never be ASSIGNED undefined — build the
  // result by presence, in both the legacy array [min,max,step] and the object config form.
  const out: { min?: number; max?: number; step?: number } = {}
  if (Array.isArray(cfg) && cfg.every((x) => typeof x === 'number')) {
    const [min, max, step] = cfg as Array<number | undefined>
    if (typeof min === 'number') out.min = min
    if (typeof max === 'number') out.max = max
    if (typeof step === 'number') out.step = step
    return out
  }
  if (isObj(cfg)) {
    for (const k of ['min', 'max', 'step'] as const) {
      if (typeof cfg[k] === 'number') out[k] = cfg[k] as number
    }
  }
  return out
}

/** One declared input → widget spec + synthetic pin + fallback value; null when the input is a
 *  SOCKET (not a widget) — those are covered by the node's inputs[] slots. */
function declaredWidgetOf(name: string, spec: readonly unknown[]): DeclaredWidget | null {
  const type = spec[0]
  const cfg = spec[1]
  if (Array.isArray(type)) {
    const values = type.map(String)
    return {
      name, fallback: values[0],
      spec: { id: name, type: 'combo', label: '', key: name, values },
      pin: { kind: 'data', direction: 'in', type: 'string', label: name, multiple: false },
    }
  }
  if (typeof type !== 'string') return null
  if (type === 'INT' || type === 'FLOAT' || type === 'NUMBER') {
    const { min, max, step } = numberConfig(cfg)
    return {
      name, fallback: min ?? 0,
      spec: { id: name, type: 'number', label: '', key: name, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), ...(step !== undefined ? { step } : {}) },
      pin: { kind: 'data', direction: 'in', type: 'float', label: name, multiple: false },
    }
  }
  if (type === 'BOOLEAN') return { name, fallback: false, spec: { id: name, type: 'toggle', label: '', key: name }, pin: { kind: 'data', direction: 'in', type: 'bool', label: name, multiple: false } }
  if (type === 'STRING') {
    const multiline = isObj(cfg) && cfg['multiline'] === true
    return {
      name, fallback: '',
      spec: { id: name, type: 'text', label: '', key: name, ...(multiline ? { multiline: true } : {}) },
      pin: { kind: 'data', direction: 'in', type: 'string', label: name, multiple: false },
    }
  }
  return null // socket type (MODEL, LATENT, …)
}

function widgetsFromObjectInfo(values: unknown, info: ComfyObjectInfo): { widgets: WidgetSpec[]; state: Record<string, unknown>; widgetPins: PinSchema[]; skipped: number } {
  const declared: DeclaredWidget[] = []
  for (const section of [info.input?.required, info.input?.optional]) {
    if (!section) continue
    for (const [name, spec] of Object.entries(section)) {
      if (!Array.isArray(spec)) continue
      const w = declaredWidgetOf(name, spec)
      if (w) declared.push(w)
    }
  }
  const vals = Array.isArray(values) ? values : []
  const widgets: WidgetSpec[] = []
  const state: Record<string, unknown> = {}
  const widgetPins: PinSchema[] = []
  declared.forEach((d, i) => {
    widgets.push(d.spec)
    widgetPins.push(d.pin)
    const v = vals[i]
    state[d.name] = v !== undefined ? v : d.fallback
  })
  return { widgets, state, widgetPins, skipped: Math.max(0, vals.length - declared.length) }
}

/** ComfyUI/litegraph reroute node type names that map onto our core reroute knot. */
const COMFY_REROUTE_TYPES = new Set(['Reroute', 'RerouteNode', 'Reroute (rgthree)'])

/** Heuristic category for a ComfyUI node type. ComfyUI doesn't ship category metadata in the
 *  workflow JSON (it's on the server's `object_info`), but the type names follow strong patterns
 *  — `KSampler*` is sampling, `CLIPText*` is conditioning, `VAE*` is vae, etc. We map onto a
 *  small palette that the import seeds via the graph's `categories` field so the imported
 *  workflow renders with semantic colours instead of all-grey "utility". */
type ComfyCategory = 'sampler' | 'conditioning' | 'vae' | 'latent' | 'image' | 'loader' | 'controlnet' | 'mask' | 'utility'
function comfyCategoryOf(type: string): ComfyCategory {
  // Domain matchers — `test` runs against the whole type name so 3rd-party prefixes
  // (Searge*, RGT*, WAS*, Custom*) still classify by the meaningful word inside.
  if (/Sampler|Scheduler/.test(type))                                        return 'sampler'
  if (/CLIP|Conditioning|TextInput|TextEncode|Prompt|FluxGuidance|FluxKontext/.test(type)) return 'conditioning'
  if (/VAE/.test(type))                                                      return 'vae'
  if (/Latent|EmptyImage/.test(type))                                        return 'latent'
  if (/Preview|SaveImage|LoadImage|Image.?to.?Image|Inpaint|ImageScale|ImageBlur|ImageBatch|Upscale/i.test(type)) return 'image'
  if (/Loader|Checkpoint|Lora|UNETLoader|DualCLIPLoader|TripleCLIPLoader/.test(type))    return 'loader'
  if (/ControlNet/.test(type))                                               return 'controlnet'
  if (/Mask/.test(type))                                                     return 'mask'
  return 'utility'
}

/** Category accent palette merged into the imported graph's `categories` field. Each colour is
 *  picked to feel at home in both Xen and Liquid Glass — saturated but not neon. */
const COMFY_CATEGORY_PALETTE: Record<ComfyCategory, { accent: string }> = {
  sampler:      { accent: '#E27A4A' },
  conditioning: { accent: '#C065D5' },
  vae:          { accent: '#5BC1A6' },
  latent:       { accent: '#3E95B9' },
  image:        { accent: '#D0A82E' },
  loader:       { accent: '#8090A8' },
  controlnet:   { accent: '#B85A5A' },
  mask:         { accent: '#9B7EDB' },
  utility:      { accent: '#9AA0A6' },
}

/**
 * ComfyUI / litegraph workflow JSON → xenolith.v1 graph (+ derived node schemas).
 *
 * Pure transform — no editor, no DOM. The demo feeds the graph to `editor.loadJSON()` and the
 * schemas to `editor.registry` so the insert palette can spawn more of the same node types.
 *
 * Every node's raw ComfyUI payload (type, widgets_values, properties, title) is preserved under
 * `state.__comfy` so a later export-back to ComfyUI can reconstruct the node faithfully — the key
 * enabler for clipboard interop.
 */

const COMFY_TYPE_MAP: Record<string, string> = {
  MODEL: 'object', LATENT: 'object', VAE: 'object', CLIP: 'object',
  CONDITIONING: 'object', IMAGE: 'object', MASK: 'object', CONTROL_NET: 'object',
  INT: 'float', FLOAT: 'float', NUMBER: 'float',
  STRING: 'string',
  '*': 'any',
}

export function comfyTypeToXen(comfyType: string): string {
  return COMFY_TYPE_MAP[comfyType] ?? (comfyType === '*' ? 'any' : 'object')
}

interface ComfySlot { name?: string; type?: string }
interface ComfyNode {
  id: number
  type: string
  title?: string
  pos?: [number, number] | Record<string, number>
  size?: [number, number] | Record<string, number>
  inputs?: ComfySlot[]
  outputs?: ComfySlot[]
  widgets_values?: unknown
  properties?: Record<string, unknown>
}
type ComfyLink = [number, number, number, number, number, (string | number)?]
interface ComfyWorkflow { nodes: ComfyNode[]; links?: ComfyLink[] }

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function vec2(v: unknown, fallback = { x: 0, y: 0 }): { x: number; y: number } {
  if (Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number') {
    return { x: v[0], y: v[1] }
  }
  if (isObj(v) && typeof v['0'] === 'number' && typeof v['1'] === 'number') {
    return { x: v['0'] as number, y: v['1'] as number }
  }
  return fallback
}

const nodeId  = (comfyId: number): string => `c${comfyId}`
const inPinId  = (comfyId: number, slot: number): string => `c${comfyId}:i${slot}`
const outPinId = (comfyId: number, slot: number): string => `c${comfyId}:o${slot}`

function pinSchemasOf(node: ComfyNode, widgets: WidgetSpec[], widgetPins: PinSchema[]): PinSchema[] {
  const pins: PinSchema[] = []
  ;(node.inputs ?? []).forEach((s) => {
    pins.push({ kind: 'data', direction: 'in', type: comfyTypeToXen(s.type ?? '*'), label: s.name ?? s.type ?? 'in', multiple: false })
  })
  ;(node.outputs ?? []).forEach((s) => {
    pins.push({ kind: 'data', direction: 'out', type: comfyTypeToXen(s.type ?? '*'), label: s.name ?? s.type ?? 'out', multiple: true })
  })
  // Mirror the per-widget IN-pins onto the schema so an insert from the palette gets the same
  // shape the imported instance has (pins + widgets agree).
  for (const s of widgetPins) pins.push(s)
  return pins
}

export interface ComfyImportResult {
  graph: XenolithGraphV1
  schemas: NodeSchema[]
  /** Widget-mapping provenance (H2): named vs inferred vs skipped — nothing vanishes silently. */
  report: ComfyImportReport
}

export interface ImportComfyOptions {
  /** The server's /object_info map (type → definition). Types present here get NAMED widgets
   *  (combos with options, numerics with min/max/step); the rest fall back to the positional
   *  `param N` heuristic. Fetch `http://<comfy>/object_info` and pass it through.
   *  Explicit `| undefined` so callers can spread a maybe-fetched map (exactOptionalPropertyTypes). */
  objectInfo?: Record<string, ComfyObjectInfo> | undefined
}

export function importComfyWorkflow(input: unknown, opts: ImportComfyOptions = {}): ComfyImportResult {
  if (!isObj(input) || !Array.isArray(input['nodes'])) {
    throw new Error('importComfyWorkflow: not a ComfyUI workflow (missing nodes[])')
  }
  const wf = input as unknown as ComfyWorkflow
  const present = new Set(wf.nodes.map((n) => n.id))
  const report: ComfyImportReport = { nodesWithObjectInfo: 0, widgetsNamed: 0, widgetsInferred: 0, widgetsSkipped: 0 }
  // Cached per node REFERENCE — the node pass and the schema pass both ask, but provenance is
  // counted once per node.
  const widgetCache = new Map<ComfyNode, { widgets: WidgetSpec[]; state: Record<string, unknown>; widgetPins: PinSchema[] }>()
  const widgetsOf = (n: ComfyNode): { widgets: WidgetSpec[]; state: Record<string, unknown>; widgetPins: PinSchema[] } => {
    const cached = widgetCache.get(n)
    if (cached) return cached
    if (COMFY_REROUTE_TYPES.has(n.type)) return { widgets: [], state: {}, widgetPins: [] }
    const info = opts.objectInfo?.[n.type]
    let r: { widgets: WidgetSpec[]; state: Record<string, unknown>; widgetPins: PinSchema[] }
    if (info) {
      report.nodesWithObjectInfo++
      const named = widgetsFromObjectInfo(n.widgets_values, info)
      report.widgetsNamed += named.widgets.length
      report.widgetsSkipped += named.skipped
      r = named
    } else {
      r = widgetsFromValues(n.widgets_values)
      report.widgetsInferred += r.widgets.length
    }
    widgetCache.set(n, r)
    return r
  }

  const nodes: XenolithNodeV1[] = wf.nodes.map((n) => {
    const reroute = COMFY_REROUTE_TYPES.has(n.type)
    // A reroute resolves its wire colour from the output slot (the input is a bare '*'); colour
    // both knot pins identically so the dot reads as a single typed wire.
    const rerouteType = reroute
      ? comfyTypeToXen(n.outputs?.[0]?.type ?? n.inputs?.[0]?.type ?? '*')
      : ''

    const pins: XenolithPinV1[] = []
    ;(n.inputs ?? []).forEach((s, i) => {
      pins.push({ id: inPinId(n.id, i), kind: 'data', direction: 'in', type: reroute ? rerouteType : comfyTypeToXen(s.type ?? '*'), multiple: false, label: reroute ? '' : (s.name ?? s.type ?? `in${i}`) })
    })
    ;(n.outputs ?? []).forEach((s, i) => {
      pins.push({ id: outPinId(n.id, i), kind: 'data', direction: 'out', type: reroute ? rerouteType : comfyTypeToXen(s.type ?? '*'), multiple: true, label: reroute ? '' : (s.name ?? s.type ?? `out${i}`) })
    })
    // Inline reroutes carry no widgets; everything else maps its widgets_values to typed widgets
    // PLUS a synthetic IN-pin per widget (canon: every widget binds to a pin, hides on wire-in).
    const { widgets, state: widgetState, widgetPins } = widgetsOf(n)
    // Synth pin ids share the node's `c<id>:w<i>` namespace; auto-bind happens by label match.
    widgetPins.forEach((s, i) => {
      pins.push({ id: `${nodeId(n.id)}:w${i}`, kind: 'data', direction: 'in', type: s.type, multiple: false, label: s.label ?? '' })
    })
    const node: XenolithNodeV1 = {
      id: nodeId(n.id),
      type: reroute ? REROUTE_TYPE : n.type,
      position: vec2(n.pos),
      pins,
      render: { title: n.title ?? n.type, ...(reroute ? {} : { category: comfyCategoryOf(n.type) }) },
      state: {
        ...widgetState,
        __comfy: {
          type: n.type,
          ...(n.title !== undefined ? { title: n.title } : {}),
          widgets_values: n.widgets_values ?? null,
          properties: n.properties ?? {},
        },
      },
    }
    if (widgets.length > 0) node.widgets = widgets
    return node
  })

  // Resolve every pin's xen type so an edge can be coloured by its actual source pin rather than
  // the link's `type` field, which ComfyUI frequently leaves numeric/empty — most visibly on the
  // wires leaving a Reroute, which would otherwise render grey/white while the knot is coloured.
  const pinType = new Map<string, string>()
  for (const n of nodes) for (const p of n.pins ?? []) pinType.set(p.id, String(p.type))

  const edges: XenolithEdgeV1[] = []
  for (const link of wf.links ?? []) {
    const [lid, src, srcSlot, dst, dstSlot, type] = link
    if (!present.has(src) || !present.has(dst)) continue
    const fromPin = outPinId(src, srcSlot)
    const linkType = typeof type === 'string' ? comfyTypeToXen(type) : undefined
    edges.push({
      id: `cl${lid}`,
      from: { node: nodeId(src), pin: fromPin },
      to:   { node: nodeId(dst), pin: inPinId(dst, dstSlot) },
      opts: { sourceType: pinType.get(fromPin) ?? linkType ?? 'any' },
    })
  }

  // One schema per distinct type, from the first node that uses it.
  const schemas: NodeSchema[] = []
  const seen = new Set<string>()
  for (const n of wf.nodes) {
    if (COMFY_REROUTE_TYPES.has(n.type)) continue // reroute is a built-in knot, not a palette type
    if (seen.has(n.type)) continue
    seen.add(n.type)
    const { widgets, widgetPins } = widgetsOf(n)
    const sch: NodeSchema = { type: n.type, title: n.title ?? n.type, pins: pinSchemasOf(n, widgets, widgetPins), category: comfyCategoryOf(n.type) }
    if (widgets.length > 0) sch.widgets = widgets
    schemas.push(sch)
  }

  // Seed the graph's `categories` palette so headers render with semantic colours (sampler/vae/…)
  // instead of falling back to the theme's "utility" grey. The serialize schema accepts
  // `{ color }` per category — a solid accent works for both Xen and Liquid Glass.
  const categories: Record<string, { color: string }> = {}
  for (const n of wf.nodes) {
    if (COMFY_REROUTE_TYPES.has(n.type)) continue
    const cat = comfyCategoryOf(n.type)
    if (!categories[cat]) categories[cat] = { color: COMFY_CATEGORY_PALETTE[cat].accent }
  }
  return { graph: { version: 'xenolith.v1', nodes, edges, ...(Object.keys(categories).length > 0 ? { categories } : {}) }, schemas, report }
}
