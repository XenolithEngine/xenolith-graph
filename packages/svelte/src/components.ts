/**
 * In-editor component surface (requires Svelte 5 + the consumer's svelte compiler — imported via
 * the `@xenolithengine/graph-svelte/components` subpath; the runtime entry `.` stays Svelte-4
 * compatible). Panels portal into `editor.chrome.overlayRoot` and read the editor from
 * {@link ./context.js | createXenolithEditorContext}; `svelteWidget` bridges a Svelte component
 * into a custom node widget.
 */
export { default as XenolithPanel } from './components/XenolithPanel.svelte'
export { default as XenolithButton } from './components/XenolithButton.svelte'
export { default as XenolithControls } from './components/XenolithControls.svelte'
export { default as XenolithMiniMap } from './components/XenolithMiniMap.svelte'
export { default as XenolithProposalQueue } from './components/XenolithProposalQueue.svelte'
export { svelteWidget, type WidgetProps } from './widget.js'
