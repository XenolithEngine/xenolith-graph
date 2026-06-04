import { XenolithGraphElement } from './element.js'

export { XenolithGraphElement } from './element.js'
export { readAttributes, FORWARDED_EVENTS } from './attrs.js'

/** Register the custom element (default tag `xenolith-graph`). Idempotent — safe to call multiple
 *  times and across modules.
 *
 *  Call this EXPLICITLY after import:
 *
 *      import { register } from '@xenolithengine/graph-wc'
 *      register()                       // default tag <xenolith-graph>
 *      register('my-graph')             // custom tag
 *
 *  Pre-v0.7 BETA: `import '@xenolithengine/graph-wc'` auto-registered. That was a side-effect import which
 *  (a) makes the package non-tree-shakeable, (b) collides on tag-name conflicts before the host
 *  has a chance to choose. Now explicit. Migration: add a one-liner `register()` after import. */
export function register(tag = 'xenolith-graph'): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tag)) customElements.define(tag, XenolithGraphElement)
}
