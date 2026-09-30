// The examples gallery manifest — ONE entry per example, with per-framework implementations.
// Each example page (/examples/<id>) shows ONE live canvas (vanilla, else React, else Vue,
// else the Svelte/Solid vanilla engine, else an Angular placeholder — see [id].astro; one PIXI
// app per page). The framework chips switch the "Show code" tabs. A chip that isn't the live
// canvas is source only; DemoFrame says so. Missing impls are "n/a".
// `apps/site/scripts/check-example-snippets.mjs` checks that every path here exists, every
// snippet file is listed, and every .svelte file compiles.

export type Framework = 'vanilla' | 'react' | 'vue' | 'svelte' | 'solid' | 'angular'

// Order matters in the framework switcher chip row: vanilla first because plain JS is the universal
// baseline (no React/Vue/anything required), then framework-specific implementations.
export const FRAMEWORKS: { key: Framework; label: string }[] = [
  { key: 'vanilla', label: 'JS' },
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'svelte', label: 'Svelte' },
  { key: 'solid', label: 'Solid' },
  { key: 'angular', label: 'Angular' },
]

/** One framework's implementation of an example: the source files shown under "Show code".
 *  (The live component is resolved by `${framework}:${id}` in the island registry.) */
export interface ExampleImpl {
  files: string[]
}

export interface ExampleDef {
  id: string
  title: string
  blurb: string
  category: string
  /** Which frameworks implement this example, and each one's source files. */
  impls: Partial<Record<Framework, ExampleImpl>>
}

// Category order in the gallery grid.
export const CATEGORY_ORDER = ['Showcases', 'Nodes', 'Widgets', 'Interaction', 'Styling', 'Viewport', 'Layout', 'Performance'] as const

export const EXAMPLES: ExampleDef[] = [
  { id: 'mcp-live', title: 'MCP live (AI builds the graph)', category: 'Showcases',
    blurb: 'Start @xenolithengine/graph-mcp-server locally, click Connect, then ask Claude Desktop / Cursor to build a graph. The AI calls list_node_types → add_node → connect_pins → auto_layout. "I describe it, the editor builds it."',
    impls: {
      react:   { files: ['demos/MCPDemo.tsx'] },
      vue:     { files: ['vue/MCPDemo.vue', 'vue/MCPPanel.vue'] },
      svelte:  { files: ['svelte/MCPDemo.svelte'] },
      solid:   { files: ['solid/MCPDemo.tsx'] },
      angular: { files: ['angular/MCPDemo.component.ts'] },
    } },
  { id: 'step-debugger', title: 'Visual stepping debugger', category: 'Showcases',
    blurb: 'Run a graph one node at a time. Yellow ring = paused; green = executed; red = breakpoint. The inspector shows live inputs/outputs and per-node timing. Debug your AI workflow on the canvas — like Chrome DevTools, but for nodes.',
    impls: {
      react:   { files: ['demos/StepDebuggerDemo.tsx'] },
      vue:     { files: ['vue/StepDebuggerDemo.vue', 'vue/DebuggerPanel.vue', 'shared/step-debugger.ts'] },
      svelte:  { files: ['svelte/StepDebuggerDemo.svelte', 'shared/step-debugger.ts'] },
      solid:   { files: ['solid/StepDebuggerDemo.tsx', 'shared/step-debugger.ts'] },
      angular: { files: ['angular/StepDebuggerDemo.component.ts', 'shared/step-debugger.ts'] },
    } },
  { id: 'time-travel', title: 'Time-travel scrubber', category: 'Showcases',
    blurb: 'Rewind a graph run. Drag the timeline through every step and watch the highlights replay — green = done, yellow = the step under inspection. The inspector shows that step’s inputs and outputs.',
    impls: {
      react:   { files: ['demos/TimeTravelDemo.tsx'] },
      vue:     { files: ['vue/TimeTravelDemo.vue', 'vue/ScrubPanel.vue', 'shared/time-travel.ts'] },
      svelte:  { files: ['svelte/TimeTravelDemo.svelte', 'shared/time-travel.ts'] },
      solid:   { files: ['solid/TimeTravelDemo.tsx', 'shared/time-travel.ts'] },
      angular: { files: ['angular/TimeTravelDemo.component.ts', 'shared/time-travel.ts'] },
    } },
  { id: 'graph-diff', title: 'Graph diff (PR review)', category: 'Showcases',
    blurb: 'Two versions of a graph side by side, with structural diff highlights — green = added, red = removed, yellow = modified. Drop-in PR-review for node graphs.',
    impls: {
      react:   { files: ['demos/GraphDiffDemo.tsx'] },
      vue:     { files: ['vue/GraphDiffDemo.vue', 'shared/graph-diff-demo.ts'] },
      svelte:  { files: ['svelte/GraphDiffDemo.svelte', 'shared/graph-diff-demo.ts'] },
      solid:   { files: ['solid/GraphDiffDemo.tsx', 'shared/graph-diff-demo.ts'] },
      angular: { files: ['angular/GraphDiffDemo.component.ts', 'angular/GraphDiffPane.component.ts', 'shared/graph-diff-demo.ts'] },
    } },
  { id: 'heatmap', title: 'Per-node cost heatmap', category: 'Showcases',
    blurb: 'A RAG pipeline with per-node latency badges — cool blue → hot red. Press Pulse to see metrics breathe. Drop-in observability overlay; no OSS competitor ships it.',
    impls: {
      react:   { files: ['demos/HeatmapDemo.tsx'] },
      vue:     { files: ['vue/HeatmapDemo.vue', 'vue/HeatmapPanel.vue', 'shared/heatmap.ts'] },
      svelte:  { files: ['svelte/HeatmapDemo.svelte', 'shared/heatmap.ts'] },
      solid:   { files: ['solid/HeatmapDemo.tsx', 'shared/heatmap.ts'] },
      angular: { files: ['angular/HeatmapDemo.component.ts', 'shared/heatmap.ts'] },
    } },
  { id: 'llm-builder', title: 'LLM workflow builder', category: 'Showcases',
    blurb: 'Input → Prompt → Model → Output. Press Run; the chain walks in topological order, the active node glows, the completion streams into the Output. A prettier LangFlow, on Xenolith.',
    impls: {
      react:   { files: ['shared/llm-builder.json', 'demos/LLMBuilderDemo.tsx', 'shared/llm-builder.ts'] },
      vue:     { files: ['shared/llm-builder.json', 'vue/LLMBuilderDemo.vue', 'vue/PromptEditor.vue', 'vue/OutputView.vue', 'vue/RunPanel.vue', 'shared/llm-builder.ts'] },
      svelte:  { files: ['shared/llm-builder.json', 'svelte/LLMBuilderDemo.svelte', 'svelte/PromptEditor.svelte', 'svelte/OutputView.svelte', 'shared/llm-builder.ts'] },
      solid:   { files: ['shared/llm-builder.json', 'solid/LLMBuilderDemo.tsx', 'shared/llm-builder.ts'] },
      angular: { files: ['shared/llm-builder.json', 'angular/LLMBuilderDemo.component.ts', 'shared/llm-builder.ts'] },
    } },
  { id: 'audio-synth', title: 'Audio synth (Web Audio)', category: 'Showcases',
    blurb: 'A real synth built on the graph — Oscillator → Filter → Gain → Output. Knobs are node widgets; Play wires live AudioNodes and lights the active chain. It makes sound.',
    impls: {
      react:   { files: ['shared/audio-synth.json', 'demos/AudioSynthDemo.tsx', 'shared/audio-synth.ts'] },
      vue:     { files: ['shared/audio-synth.json', 'vue/AudioSynthDemo.vue', 'vue/AudioPanel.vue', 'shared/audio-synth.ts'] },
      svelte:  { files: ['shared/audio-synth.json', 'svelte/AudioSynthDemo.svelte', 'shared/audio-synth.ts'] },
      solid:   { files: ['shared/audio-synth.json', 'solid/AudioSynthDemo.tsx', 'shared/audio-synth.ts'] },
      angular: { files: ['shared/audio-synth.json', 'angular/AudioSynthDemo.component.ts', 'shared/audio-synth.ts'] },
    } },
  { id: 'save-restore', title: 'Save & restore', category: 'Showcases',
    blurb: 'The whole graph is JSON. Download / upload a .json file, and autosave to localStorage on every edit (driven by useGraphJSON). Reload the page — it comes back.',
    impls: {
      react:   { files: ['demos/SaveRestoreDemo.tsx', 'shared/save-restore.ts'] },
      vue:     { files: ['vue/SaveRestoreDemo.vue', 'vue/SavePanel.vue', 'shared/save-restore.ts'] },
      svelte:  { files: ['svelte/SaveRestoreDemo.svelte', 'shared/save-restore.ts'] },
      solid:   { files: ['solid/SaveRestoreDemo.tsx', 'shared/save-restore.ts'] },
      angular: { files: ['angular/SaveRestoreDemo.component.ts', 'shared/save-restore.ts'] },
    } },
  { id: 'image-pipeline', title: 'Image pipeline (WebGL)', category: 'Showcases',
    blurb: 'A real image-filter pipeline — Source → Exposure → Saturation → Hue → Blur → Vignette → Result. Each node is a live GLSL fragment pass. Drag a slider and the result re-renders; drop your own image; download the PNG.',
    impls: {
      react:   { files: ['demos/ImagePipelineDemo.tsx', 'shared/image-pipeline.ts'] },
      vue:     { files: ['vue/ImagePipelineDemo.vue', 'vue/ImageInput.vue', 'vue/ImageOutput.vue', 'vue/PipelinePanel.vue', 'shared/image-pipeline.ts'] },
      svelte:  { files: ['svelte/ImagePipelineDemo.svelte', 'svelte/ImageInput.svelte', 'svelte/ImageOutput.svelte', 'shared/image-pipeline.ts'] },
      solid:   { files: ['solid/ImagePipelineDemo.tsx', 'shared/image-pipeline.ts'] },
      angular: { files: ['angular/ImagePipelineDemo.component.ts', 'shared/image-pipeline.ts'] },
    } },
  { id: 'mount', title: 'Mount an editor', category: 'Nodes',
    blurb: 'The honest minimum: register a node type, add one, frame it. Xen is the default theme — no setup.',
    impls: {
      react:   { files: ['shared/mount.json', 'demos/MountDemo.tsx', 'shared/mount.ts'] },
      vue:     { files: ['vue/MountDemo.vue', 'shared/mount.ts'] },
      svelte:  { files: ['svelte/MountDemo.svelte', 'shared/mount.ts'] },
      solid:   { files: ['solid/MountDemo.tsx', 'shared/mount.ts'] },
      angular: { files: ['angular/MountDemo.component.ts', 'shared/mount.ts'] },
    } },
  { id: 'load', title: 'Load a graph', category: 'Nodes',
    blurb: 'Load a real saved xenolith.v1 graph and reframe it. Built-in controls + a reload panel.',
    impls: {
      react:   { files: ['demos/LoadDemo.tsx', 'shared/scene.ts'] },
      vue:     { files: ['vue/LoadDemo.vue', 'shared/scene.ts', 'shared/demo-graph.ts'] },
      svelte:  { files: ['svelte/LoadDemo.svelte', 'shared/scene.ts', 'shared/demo-graph.ts'] },
      solid:   { files: ['solid/LoadDemo.tsx', 'shared/scene.ts', 'shared/demo-graph.ts'] },
      angular: { files: ['angular/LoadDemo.component.ts', 'shared/scene.ts', 'shared/demo-graph.ts'] },
    } },
  { id: 'builtin-widgets', title: 'Built-in widgets', category: 'Widgets',
    blurb: 'Every built-in widget — slider, number, toggle, combo, color, text — on one node, in WebGL.',
    impls: {
      react:   { files: ['shared/builtin-widgets.json', 'demos/BuiltinWidgetsDemo.tsx', 'shared/builtin-widgets.ts'] },
      vue:     { files: ['shared/builtin-widgets.json', 'vue/BuiltinWidgetsDemo.vue', 'shared/builtin-widgets.ts'] },
      svelte:  { files: ['shared/builtin-widgets.json', 'svelte/BuiltinWidgetsDemo.svelte', 'shared/builtin-widgets.ts'] },
      solid:   { files: ['shared/builtin-widgets.json', 'solid/BuiltinWidgetsDemo.tsx', 'shared/builtin-widgets.ts'] },
      angular: { files: ['shared/builtin-widgets.json', 'angular/BuiltinWidgetsDemo.component.ts', 'shared/builtin-widgets.ts'] },
    } },
  { id: 'canvas-widget', title: 'Custom canvas widget', category: 'Widgets',
    blurb: 'The simplest custom widget: a click/drag level bar, drawn in WebGL — no DOM. The value flows back to your app via the standard widget callback.',
    impls: {
      react:   { files: ['shared/canvas-widget.json', 'demos/CanvasWidgetDemo.tsx', 'shared/canvas-widget.ts'] },
      vue:     { files: ['shared/canvas-widget.json', 'vue/CanvasWidgetDemo.vue', 'shared/canvas-widget.ts'] },
      svelte:  { files: ['shared/canvas-widget.json', 'svelte/CanvasWidgetDemo.svelte', 'shared/canvas-widget.ts'] },
      solid:   { files: ['shared/canvas-widget.json', 'solid/CanvasWidgetDemo.tsx', 'shared/canvas-widget.ts'] },
      angular: { files: ['shared/canvas-widget.json', 'angular/CanvasWidgetDemo.component.ts', 'shared/canvas-widget.ts'] },
    } },
  { id: 'custom-widgets', title: 'Bring your own UI', category: 'Widgets',
    blurb: 'Four widgets that are real framework components (async-select, file drop, CodeMirror, sparkline), themed via --xeno-*.',
    impls: {
      react: { files: [
        'demos/CustomWidgetsDemo.tsx',
        'widgets/AsyncSelect.tsx', 'widgets/FileDrop.tsx', 'widgets/CodeEditor.tsx', 'widgets/Sparkline.tsx',
      ] },
      vue: { files: [
        'vue/CustomWidgetsDemo.vue',
        'vue/AsyncSelect.vue', 'vue/FileDrop.vue', 'vue/CodeEditor.vue', 'vue/Sparkline.vue',
      ] },
      svelte: { files: [
        'svelte/CustomWidgetsDemo.svelte',
        'svelte/AsyncSelect.svelte', 'svelte/FileDrop.svelte', 'svelte/CodeEditor.svelte', 'svelte/Sparkline.svelte',
      ] },
    } },
  { id: 'events', title: 'Events → your state', category: 'Interaction',
    blurb: 'Typed event callbacks wired to app state: a live log, selection inspector, widget values.',
    impls: {
      react:   { files: ['demos/EventsDemo.tsx'] },
      vue:     { files: ['vue/EventsDemo.vue', 'vue/EventsPanel.vue'] },
      svelte:  { files: ['svelte/EventsDemo.svelte'] },
      solid:   { files: ['solid/EventsDemo.tsx'] },
      angular: { files: ['angular/EventsDemo.component.ts'] },
    } },
  { id: 'mobile-touch', title: 'Mobile / tablet (touch demo)', category: 'Interaction',
    blurb: 'Touch-first demo for testing pinch, two-finger pan, long-press context menu, and the drawer-mode palette on narrow viewports. Includes a fullscreen toggle. Open this URL on an iOS device or in the iOS Simulator — see docs/TESTING-ON-IOS-SIMULATOR.md.',
    impls: { vanilla: { files: ['vanilla/mobile-touch.ts'] } } },
  { id: 'conditional-widgets', title: 'Conditional widgets', category: 'Widgets',
    blurb: 'Declarative `displayOptions.show(state)` — n8n-style. One HTTP Request node hides `body` until the method needs one, and `token` until auth is `bearer`. Pure schema: no `setNodeWidgets` plumbing in the host. The node re-layouts and edges stay attached as widgets appear and disappear.',
    impls: {
      vanilla: { files: ['vanilla/conditional-widgets.ts', 'shared/conditional-widgets.ts'] },
      react:   { files: ['demos/ConditionalWidgetsDemo.tsx', 'shared/conditional-widgets.ts'] },
      vue:     { files: ['vue/ConditionalWidgetsDemo.vue', 'shared/conditional-widgets.ts'] },
      svelte:  { files: ['svelte/ConditionalWidgetsDemo.svelte', 'shared/conditional-widgets.ts'] },
      solid:   { files: ['solid/ConditionalWidgetsDemo.tsx', 'shared/conditional-widgets.ts'] },
      angular: { files: ['angular/ConditionalWidgetsDemo.component.ts', 'shared/conditional-widgets.ts'] },
    } },
  { id: 'properties-sidebar', title: 'Properties sidebar', category: 'Interaction',
    blurb: 'A "fat" node with 8 widgets opts into the docked properties panel via the per-widget `showInSidebar: true` flag. Edit live — the same widget renders inline AND in the panel; no separate sidebar component to author. Themed via --xeno-*. Open programmatically: `editor.openSidebar(nodeId)`.',
    impls: {
      vanilla: { files: ['vanilla/properties-sidebar.ts', 'shared/properties-sidebar.ts'] },
      react:   { files: ['demos/PropertiesSidebarDemo.tsx', 'shared/properties-sidebar.ts'] },
      vue:     { files: ['vue/PropertiesSidebarDemo.vue', 'vue/SidebarTogglePanel.vue', 'shared/properties-sidebar.ts'] },
      svelte:  { files: ['svelte/PropertiesSidebarDemo.svelte', 'shared/properties-sidebar.ts'] },
      solid:   { files: ['solid/PropertiesSidebarDemo.tsx', 'shared/properties-sidebar.ts'] },
      angular: { files: ['angular/PropertiesSidebarDemo.component.ts', 'shared/properties-sidebar.ts'] },
    } },
  { id: 'two-way', title: 'Two-way data binding', category: 'Interaction',
    blurb: 'Both binding levels in one: selection edits the selected node’s widgets; the serialized graph binds the whole document back to the editor.',
    impls: {
      react:   { files: ['demos/TwoWayBindingDemo.tsx'] },
      vue:     { files: ['vue/TwoWayBindingDemo.vue', 'vue/TwoWayPanels.vue'] },
      svelte:  { files: ['svelte/TwoWayBindingDemo.svelte'] },
      solid:   { files: ['solid/TwoWayBindingDemo.tsx'] },
      angular: { files: ['angular/TwoWayBindingDemo.component.ts'] },
    } },
  { id: 'diagram', title: 'Diagram edges', category: 'Showcases',
    blurb: 'Edges as a diagramming primitive — text nodes wired with directional arrowhead markers, edge labels (pass / fail / retry), and an animated flowing dash on the main path. Toggle the flow.',
    impls: {
      react:   { files: ['shared/diagram.json', 'demos/DiagramDemo.tsx', 'shared/diagram.ts'] },
      vue:     { files: ['shared/diagram.json', 'vue/DiagramDemo.vue', 'vue/DiagramPanel.vue', 'shared/diagram.ts'] },
      svelte:  { files: ['shared/diagram.json', 'svelte/DiagramDemo.svelte', 'shared/diagram.ts'] },
      solid:   { files: ['shared/diagram.json', 'solid/DiagramDemo.tsx', 'shared/diagram.ts'] },
      angular: { files: ['shared/diagram.json', 'angular/DiagramDemo.component.ts', 'shared/diagram.ts'] },
    } },
  { id: 'type-conversions', title: 'Type conversions', category: 'Interaction',
    blurb: 'Typed pins of different types refuse to connect — unless you register a conversion. NumberSource (out: number) won’t wire into TextSink (in: text) until `types.registerConversion("number", "text", String)` is called. Toggle the cast live; the existing edge drops when it disappears.',
    impls: {
      vanilla: { files: ['vanilla/type-conversions.ts', 'shared/type-conversions.ts'] },
      react:   { files: ['demos/TypeConversionsDemo.tsx', 'shared/type-conversions.ts'] },
      vue:     { files: ['vue/TypeConversionsDemo.vue', 'shared/type-conversions.ts'] },
      svelte:  { files: ['svelte/TypeConversionsDemo.svelte', 'shared/type-conversions.ts'] },
      solid:   { files: ['solid/TypeConversionsDemo.tsx', 'shared/type-conversions.ts'] },
      angular: { files: ['angular/TypeConversionsDemo.component.ts', 'shared/type-conversions.ts'] },
    } },
  { id: 'breadcrumb-dive', title: 'Subgraph breadcrumb', category: 'Interaction',
    blurb: 'Nested template instances (Pipeline → Stage → primitives). Dive in by double-click OR programmatically; the breadcrumb in the top-left tracks the path (Root › Pipeline › Stage) and pops any segment. Auto-themed via --xeno-*. Opt-out with `editor.setBreadcrumbVisible(false)`.',
    impls: {
      vanilla: { files: ['vanilla/breadcrumb-dive.ts', 'shared/breadcrumb-dive.ts'] },
      react:   { files: ['demos/BreadcrumbDiveDemo.tsx', 'shared/breadcrumb-dive.ts'] },
      vue:     { files: ['vue/BreadcrumbDiveDemo.vue', 'shared/breadcrumb-dive.ts'] },
      svelte:  { files: ['svelte/BreadcrumbDiveDemo.svelte', 'shared/breadcrumb-dive.ts'] },
      solid:   { files: ['solid/BreadcrumbDiveDemo.tsx', 'shared/breadcrumb-dive.ts'] },
      angular: { files: ['angular/BreadcrumbDiveDemo.component.ts', 'shared/breadcrumb-dive.ts'] },
    } },
  { id: 'palette-sidebar', title: 'Palette sidebar (drag to spawn)', category: 'Interaction',
    blurb: '16 schemas across 5 categories (data / math / transform / logic / io) listed in a docked palette on the left. Drag any tile onto the canvas — the editor inserts the node at the drop point via its built-in `node:drop` handler. Configure with `editor.setPaletteSidebar({ side, filter })`.',
    impls: {
      vanilla: { files: ['vanilla/palette-sidebar.ts', 'shared/palette-sidebar.ts'] },
      react:   { files: ['demos/PaletteSidebarDemo.tsx', 'shared/palette-sidebar.ts'] },
      vue:     { files: ['vue/PaletteSidebarDemo.vue', 'shared/palette-sidebar.ts'] },
      svelte:  { files: ['svelte/PaletteSidebarDemo.svelte', 'shared/palette-sidebar.ts'] },
      solid:   { files: ['solid/PaletteSidebarDemo.tsx', 'shared/palette-sidebar.ts'] },
      angular: { files: ['angular/PaletteSidebarDemo.component.ts', 'shared/palette-sidebar.ts'] },
    } },
  { id: 'connection-validation', title: 'Connection validation', category: 'Interaction',
    blurb: 'Typed Blueprint pins refuse mismatched wires automatically (a string won’t plug into a number). A custom guard adds cycle prevention on top. Every attempt is logged live.',
    impls: {
      react:   { files: ['shared/connection-validation.json', 'demos/ConnectionValidationDemo.tsx', 'shared/connection-validation.ts'] },
      vue:     { files: ['shared/connection-validation.json', 'vue/ConnectionValidationDemo.vue', 'vue/RulesPanel.vue', 'shared/connection-validation.ts'] },
      svelte:  { files: ['shared/connection-validation.json', 'svelte/ConnectionValidationDemo.svelte', 'shared/connection-validation.ts'] },
      solid:   { files: ['shared/connection-validation.json', 'solid/ConnectionValidationDemo.tsx', 'shared/connection-validation.ts'] },
      angular: { files: ['shared/connection-validation.json', 'angular/ConnectionValidationDemo.component.ts', 'shared/connection-validation.ts'] },
    } },
  { id: 'export-image', title: 'Export to image', category: 'Interaction',
    blurb: 'Export the whole graph — not just the viewport — to a Blob at any scale. Download PNG, retina 2×, or JPG straight from a panel.',
    impls: {
      react:   { files: ['demos/ExportImageDemo.tsx', 'shared/export-image.ts'] },
      vue:     { files: ['vue/ExportImageDemo.vue', 'vue/ExportPanel.vue', 'shared/export-image.ts'] },
      svelte:  { files: ['svelte/ExportImageDemo.svelte', 'shared/export-image.ts'] },
      solid:   { files: ['solid/ExportImageDemo.tsx', 'shared/export-image.ts'] },
      angular: { files: ['angular/ExportImageDemo.component.ts', 'shared/export-image.ts'] },
    } },
  { id: 'preview-nodes', title: 'Per-node canvas drawing', category: 'Widgets',
    blurb: 'Sparkline + ColorPreview nodes — each paints its own body via a CanvasWidgetController (the equivalent of LiteGraph onDrawForeground). The sparkline rolls a live plot of the upstream slider; the swatch fills from `node.state.tint`. Anything you can draw on a `<canvas>` can be a node body.',
    impls: {
      vanilla: { files: ['vanilla/preview-nodes.ts', 'shared/preview-nodes.ts'] },
      react:   { files: ['demos/PreviewNodesDemo.tsx', 'shared/preview-nodes.ts'] },
      vue:     { files: ['vue/PreviewNodesDemo.vue', 'shared/preview-nodes.ts'] },
      svelte:  { files: ['svelte/PreviewNodesDemo.svelte', 'shared/preview-nodes.ts'] },
      solid:   { files: ['solid/PreviewNodesDemo.tsx', 'shared/preview-nodes.ts'] },
      angular: { files: ['angular/PreviewNodesDemo.component.ts', 'shared/preview-nodes.ts'] },
    } },
  { id: 'edge-paths', title: 'Edge path styles', category: 'Styling',
    blurb: 'Per-edge `pathStyle`: bezier (default Xen S-curve), smoothstep (rounded orthogonal), step (90° elbows), linear (straight). Set on construction or live via `editor.setEdgeOptions(id, { pathStyle })`. Same wire colour / animated dash / arrowhead contract regardless of shape.',
    impls: {
      vanilla: { files: ['vanilla/edge-paths.ts', 'shared/edge-paths.ts'] },
      react:   { files: ['demos/EdgePathsDemo.tsx', 'shared/edge-paths.ts'] },
      vue:     { files: ['vue/EdgePathsDemo.vue', 'shared/edge-paths.ts'] },
      svelte:  { files: ['svelte/EdgePathsDemo.svelte', 'shared/edge-paths.ts'] },
      solid:   { files: ['solid/EdgePathsDemo.tsx', 'shared/edge-paths.ts'] },
      angular: { files: ['angular/EdgePathsDemo.component.ts', 'shared/edge-paths.ts'] },
    } },
  { id: 'theming', title: 'Theming', category: 'Styling',
    blurb: 'Theme is a reactive prop — flip Xen ⇄ Liquid Glass at runtime; panels/widgets restyle via --xeno-*. Angular applies the first theme at mount and later flips with editor.setTheme.',
    impls: {
      react:   { files: ['demos/ThemingDemo.tsx'] },
      vue:     { files: ['vue/ThemingDemo.vue'] },
      svelte:  { files: ['svelte/ThemingDemo.svelte'] },
      solid:   { files: ['solid/ThemingDemo.tsx'] },
      angular: { files: ['angular/ThemingDemo.component.ts'] },
    } },
  { id: 'nested-layout', title: 'Nested auto-layout (ELK)', category: 'Layout',
    blurb: 'Three levels of nested macros — Encoder/Decoder containing Attention/FFN containing leaf ops. ELK respects the hierarchy (children stay inside their parent frame); dagre ignores parent and pancakes everything. Toggle to see the difference.',
    impls: {
      vanilla: { files: ['vanilla/nested-layout.ts', 'shared/nested-layout.ts'] },
      react:   { files: ['demos/NestedLayoutDemo.tsx', 'shared/nested-layout.ts'] },
      vue:     { files: ['vue/NestedLayoutDemo.vue', 'shared/nested-layout.ts'] },
      svelte:  { files: ['svelte/NestedLayoutDemo.svelte', 'shared/nested-layout.ts'] },
      solid:   { files: ['solid/NestedLayoutDemo.tsx', 'shared/nested-layout.ts'] },
      angular: { files: ['angular/NestedLayoutDemo.component.ts', 'shared/nested-layout.ts'] },
    } },
  { id: 'auto-layout', title: 'Auto-layout (dagre)', category: 'Layout',
    blurb: 'A messy 14-node DAG snaps into a clean layered layout. Toggle LR/TB; Cmd+Z restores the mess in a single undo step.',
    impls: {
      vanilla: { files: ['vanilla/auto-layout.ts', 'shared/auto-layout.ts'] },
      react:   { files: ['demos/AutoLayoutDemo.tsx', 'shared/auto-layout.ts'] },
      vue:     { files: ['vue/AutoLayoutDemo.vue', 'shared/auto-layout.ts'] },
      svelte:  { files: ['svelte/AutoLayoutDemo.svelte', 'shared/auto-layout.ts'] },
      solid:   { files: ['solid/AutoLayoutDemo.tsx', 'shared/auto-layout.ts'] },
      angular: { files: ['angular/AutoLayoutDemo.component.ts', 'shared/auto-layout.ts'] },
    } },
  { id: 'viewport', title: 'Viewport & minimap', category: 'Viewport',
    blurb: 'Built-in controls (zoom/fit/reset/undo/redo/save/lock), toggleable minimap, live node, edge, and zoom readout.',
    impls: {
      react:   { files: ['demos/ViewportDemo.tsx'] },
      vue:     { files: ['vue/ViewportDemo.vue', 'vue/ViewportChrome.vue'] },
      svelte:  { files: ['svelte/ViewportDemo.svelte'] },
      solid:   { files: ['solid/ViewportDemo.tsx'] },
      angular: { files: ['angular/ViewportDemo.component.ts'] },
    } },
  { id: 'stress-test', title: 'Stress test (1000s of nodes)', category: 'Showcases',
    blurb: 'Generate hundreds → thousands of WebGL nodes wired into a chain. Live FPS + node-count overlay top-right; the panel counter is driven by the reactive `useNodes()` hook. Zoom floor dropped to 5% so 10k+ nodes fit on one screen.',
    impls: {
      react:   { files: ['demos/StressTestDemo.tsx', 'shared/stress-test.ts'] },
      vue:     { files: ['vue/StressTestDemo.vue', 'vue/StressPanel.vue', 'shared/stress-test.ts'] },
      svelte:  { files: ['svelte/StressTestDemo.svelte', 'shared/stress-test.ts'] },
      solid:   { files: ['solid/StressTestDemo.tsx', 'shared/stress-test.ts'] },
      angular: { files: ['angular/StressTestDemo.component.ts', 'shared/stress-test.ts'] },
    } },
]

export function getExample(id: string): ExampleDef | undefined {
  return EXAMPLES.find((e) => e.id === id)
}
