import { z, type ZodTypeAny } from 'zod'

/** A declarative MCP tool. The server registers each one with the MCP SDK and routes the call to
 *  the connected editor via the WS bridge by name. Tools are intentionally thin — the editor owns
 *  validation and command semantics; the server just shapes the request and forwards it. */
export interface ToolDef<Schema extends ZodTypeAny> {
  /** Stable tool name. MCP clients invoke by this; the WS protocol forwards by this. */
  name: string
  /** Free-text description shown to the LLM. */
  description: string
  /** Input schema (zod). Becomes JSON-Schema for the MCP advertisement. */
  schema: Schema
}

export const TOOLS = {
  list_node_types: {
    name: 'list_node_types',
    description: 'List every node type registered in the editor with its pins (direction/label/type). ALWAYS call this before add_node and connect_pins so you can use the real type names and pin labels — otherwise pins will not match.',
    schema: z.object({}).strict(),
  },
  get_graph: {
    name: 'get_graph',
    description: 'Return the current graph as xenolith.v1 JSON (nodes, edges, comments). Read-only snapshot.',
    schema: z.object({}).strict(),
  },
  add_node: {
    name: 'add_node',
    description: 'Insert a node of the given type. Coordinates are OPTIONAL: if omitted the editor drops it just to the right of the existing graph (or at the origin if empty). Prefer adding all nodes without coordinates, then calling auto_layout once to tidy the whole picture — the LLM has no idea about node sizes/spacing, so manual coords almost always overlap.',
    schema: z.object({
      type: z.string().describe('Node type as listed by list_node_types (e.g. "Source", "Filter", "Output").'),
      x: z.number().optional().describe('Optional world-space X. Omit unless the user explicitly asked for a position.'),
      y: z.number().optional().describe('Optional world-space Y. Omit unless the user explicitly asked for a position.'),
      state: z.record(z.unknown()).optional().describe('Optional initial state map (widget values etc).'),
    }).strict(),
  },
  connect_pins: {
    name: 'connect_pins',
    description: 'Connect an output pin (from) to a compatible input pin (to). Pin types must match (float→float, object→object). The `pin` field accepts the pin LABEL ("Output", "In") as returned by list_node_types, OR a numeric index ("0", "1"), OR the literal "in"/"out" for simple single-pin nodes — pick whatever is easiest. Never invent uuids. On error the response lists the available pins so you can retry.',
    schema: z.object({
      from: z.object({ node: z.string(), pin: z.union([z.string(), z.number()]).describe('Pin label, index, or "out".') }),
      to:   z.object({ node: z.string(), pin: z.union([z.string(), z.number()]).describe('Pin label, index, or "in".') }),
    }).strict(),
  },
  fit_view: {
    name: 'fit_view',
    description: 'Frame the whole graph (or a specific node subset) in the viewport with padding. No return value.',
    schema: z.object({
      nodeIds: z.array(z.string()).optional().describe('Optional subset to frame; default = entire graph.'),
      padding: z.number().optional(),
    }).strict(),
  },
  set_widget_value: {
    name: 'set_widget_value',
    description: 'Set the value of a widget on a node (slider/number/toggle/combo/text/color/custom). Value type must match the widget type (number for slider/number, boolean for toggle, string for combo/text/color, arbitrary JSON for custom). Undoable.',
    schema: z.object({
      nodeId: z.string(),
      widget: z.string().describe('Widget id or key as listed in list_node_types pin/widget arrays.'),
      value: z.unknown(),
    }).strict(),
  },
  remove_node: {
    name: 'remove_node',
    description: 'Delete a node by id. Incident edges are removed automatically. Undoable.',
    schema: z.object({ nodeId: z.string() }).strict(),
  },
  disconnect_edge: {
    name: 'disconnect_edge',
    description: 'Remove an edge by id (as returned by connect_pins or get_graph).',
    schema: z.object({ edgeId: z.string() }).strict(),
  },
  create_macro: {
    name: 'create_macro',
    description: 'Wrap a set of nodes into a collapsed Macro (group). External edges touching the selection become proxy pins on the macro, so the macro behaves like a single node from the outside. Returns the macro id.',
    schema: z.object({
      nodeIds: z.array(z.string()).min(1),
      title: z.string().optional().describe('Display title; defaults to "Macro".'),
    }).strict(),
  },
  expand_macro: {
    name: 'expand_macro',
    description: 'Open a collapsed macro inline — members become visible again. Camera animates to fit the group automatically.',
    schema: z.object({ macroId: z.string() }).strict(),
  },
  collapse_macro: {
    name: 'collapse_macro',
    description: 'Re-collapse an expanded macro back into a single node with proxy pins.',
    schema: z.object({ macroId: z.string() }).strict(),
  },
  auto_layout: {
    name: 'auto_layout',
    description: 'Tidy the entire graph: re-position every node using a layered left-to-right layout based on edge topology (sources on the left, sinks on the right). Call this AFTER adding nodes/edges so the result looks like a hand-arranged graph instead of overlapping boxes. Safe to call multiple times.',
    schema: z.object({
      direction: z.enum(['LR', 'TB']).optional().describe('LR = left-to-right (default, good for pipelines), TB = top-to-bottom (good for tall trees).'),
      spacing: z.number().optional().describe('Pixels of padding between nodes (default 80).'),
    }).strict(),
  },
  set_category_palette: {
    name: 'set_category_palette',
    description: 'Recolour every node by category. Pass a map of category id → CSS colour. Categories come from node schemas — the values returned by list_node_types under `category` (e.g. "logic", "data", "macro", "utility", or whatever the host registered). Each entry can be (a) a plain "#RRGGBB" / rgba(...) / CSS-named colour for a solid pill, or (b) an object `{start, end}` for a two-stop gradient header. Pass an empty object to reset to the theme defaults.',
    schema: z.object({
      palette: z.record(z.unknown()).describe('Map of category → colour. Examples: {"logic":"#5b8def","data":"#fcb400"} for solid, or {"logic":{"start":"#5b8def","end":"#1e40af"}} for a gradient.'),
    }).strict(),
  },
  set_theme: {
    name: 'set_theme',
    description: 'Override a subset of theme tokens (colours, gradients, geometry) at runtime. Pass a partial token object — anything you do not specify keeps its current value. The shape mirrors the editor\'s theme tokens; the most common subset is `color.accent`, `color.surface.*`, `color.text.*`, `geometry.node.radius`. Use this to make AI-driven recolours visible without uploading a whole new theme.',
    schema: z.object({
      tokens: z.record(z.unknown()).describe('Partial theme tokens to merge. Example: {"color":{"accent":"#fcb400","surface":{"canvas":"#0e0e0e"}}}.'),
    }).strict(),
  },
  register_node_schema: {
    name: 'register_node_schema',
    description: 'Define a brand-new node type the user can then instantiate via add_node. The schema must include `type` (unique identifier), `title`, optional `category`, and a `pins` array (each pin has `kind`, `direction`, `type`, optional `label`). Optional `widgets` array describes inline controls — for `combo` widgets you MUST pass a `values` array; `slider`/`number` accept `min`/`max`/`step`. If list_node_types already shows a type with the name you want, prefer add_node on the existing type rather than registering a variant with a different name.',
    schema: z.object({
      type: z.string().describe('Stable unique id (e.g. "CSVRead", "InvoiceParser"). Must not clash with existing types.'),
      title: z.string().optional().describe('Display name shown in the node header (defaults to `type`).'),
      category: z.string().optional().describe('Category id — used PURELY as a colour tag for the pill (matches set_category_palette keys: "logic" / "data" / "macro" / "utility" / whatever is registered). Note: category "macro" is just a colour, NOT the special expandable Macro node type — these are unrelated.'),
      pins: z.array(z.object({
        kind: z.enum(['data', 'exec']).default('data'),
        direction: z.enum(['in', 'out']),
        type: z.string().describe('Pin data type — typically "any" / "number" / "string" / "image" / a custom domain type.'),
        label: z.string().optional(),
      })).min(1),
      widgets: z.array(z.object({
        id: z.string(),
        key: z.string().optional(),
        type: z.enum(['number', 'slider', 'toggle', 'combo', 'text', 'color', 'button']),
        label: z.string().optional(),
        // Per-widget extras — only the field relevant to the type is used. Required for combo
        // (`values`), recommended for slider/number (`min`/`max`/`step`).
        values: z.array(z.union([z.string(), z.object({ label: z.string(), value: z.string() })])).optional().describe('REQUIRED for combo: list of options. Strings ["gpt-4o", "gpt-4o-mini"] or labelled {label, value} entries.'),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
      })).optional(),
    }).strict(),
  },
  select_nodes: {
    name: 'select_nodes',
    description: 'Set the editor selection to exactly the listed node ids. Use to draw the user\'s attention to nodes the AI just changed, or to scope a follow-up operation visually.',
    schema: z.object({ nodeIds: z.array(z.string()).min(1) }).strict(),
  },
  clear_selection: {
    name: 'clear_selection',
    description: 'Deselect every node.',
    schema: z.object({}).strict(),
  },
  dive_into_template: {
    name: 'dive_into_template',
    description: 'Open a template-instance node to edit its inner subgraph. Pass the instance node id (as listed by get_graph). The breadcrumb in the editor updates so the user can see where they are.',
    schema: z.object({ instanceId: z.string() }).strict(),
  },
  dive_out: {
    name: 'dive_out',
    description: 'Pop out of the current subgraph back to its parent. Optional `toDepth` jumps multiple levels at once (0 = back to Root).',
    schema: z.object({ toDepth: z.number().int().min(0).optional() }).strict(),
  },
  find_nodes: {
    name: 'find_nodes',
    description: 'Search the current graph for nodes matching a predicate. Returns ids + types + labels. Combine fields with AND. Use this instead of pulling the whole graph when you only need a subset.',
    schema: z.object({
      type: z.string().optional().describe('Match by node type (exact).'),
      category: z.string().optional().describe('Match by category.'),
      titleContains: z.string().optional().describe('Substring match against the node title (case-insensitive).'),
    }).strict(),
  },
  describe_node: {
    name: 'describe_node',
    description: 'Return a detailed snapshot of one node: type, title, category, position, all pins (with live connections), and all widgets (with current values). Use before reasoning about a node — get_graph returns a thinner shape.',
    schema: z.object({ nodeId: z.string() }).strict(),
  },
  screenshot: {
    name: 'screenshot',
    description: 'Render the entire graph (NOT just the viewport — every node, padded) to a base64-encoded PNG/JPEG. Use to verify what the user is seeing after a series of edits. The response is large — only call when you need to "see" the result.',
    schema: z.object({
      format: z.enum(['png', 'jpeg']).optional().describe('Default png.'),
      scale: z.number().optional().describe('1 = native, 2 = retina (default).'),
      padding: z.number().optional().describe('World-space padding around the bounds (default 48).'),
    }).strict(),
  },
  node_screenshot: {
    name: 'node_screenshot',
    description: 'Render a single node\'s current view (with its widget values, status ring, the lot) to a base64-encoded image. Much smaller than full `screenshot`. Use when you want to inspect or show ONE node — e.g. "did my set_widget_value land?".',
    schema: z.object({
      nodeId: z.string(),
      format: z.enum(['png', 'jpeg']).optional(),
      scale: z.number().optional().describe('Default 2 (retina).'),
    }).strict(),
  },
  list_recipes: {
    name: 'list_recipes',
    description: 'Return the named subgraph templates the editor knows about. Each entry has `id`, `title`, `description`, `category`, and `requires` (the schema types the recipe assumes exist). Use this BEFORE instantiate_recipe so you know which recipes are available and what types you may need to register_node_schema first.',
    schema: z.object({}).strict(),
  },
  instantiate_recipe: {
    name: 'instantiate_recipe',
    description: 'Drop a named recipe into the current graph in one call. Creates every node + every edge, returns the map of recipe-local id → real node id (so you can describe_node / connect_pins to additional nodes after). If the recipe needs schemas that aren\'t registered, the call fails with a list of missing types — register them with register_node_schema and retry. Nodes are stacked at the origin; call auto_layout afterwards to tidy.',
    schema: z.object({
      id: z.string().describe('Recipe id from list_recipes (e.g. "linear-float", "branching-pipeline").'),
      x: z.number().optional().describe('Optional origin X (world space). Defaults to 0.'),
      y: z.number().optional().describe('Optional origin Y. Defaults to 0.'),
    }).strict(),
  },
} as const satisfies Record<string, ToolDef<ZodTypeAny>>

export type ToolName = keyof typeof TOOLS
export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[]
