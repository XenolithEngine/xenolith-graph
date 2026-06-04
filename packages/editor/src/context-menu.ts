import type { EdgeId, NodeId } from '@xenolithengine/graph-core'
import type { EdgeMenuItem } from './edge-menu.js'

/** Context menu target — what the user right-clicked / long-pressed.
 *  - `kind: 'node'` → `nodeId` is set
 *  - `kind: 'edge'` → `edgeId` is set
 *  - `kind: 'canvas'` → `worldPosition` is set (world-space drop coords) */
export type ContextMenuTarget =
  | { kind: 'node'; nodeId: NodeId }
  | { kind: 'edge'; edgeId: EdgeId }
  | { kind: 'canvas'; worldPosition: { x: number; y: number } }

/** Plugin-supplied context-menu item. `when` filters per-target; defaults to "always". `placement`
 *  controls where the item sits relative to the built-in items (default 'end'). */
export interface ContextMenuItemSpec<T extends ContextMenuTarget = ContextMenuTarget> {
  label: string
  hint?: string
  when?: (target: T) => boolean
  onSelect: (target: T) => void
  placement?: 'start' | 'end'
}

/** Plugin registry for the editor's context menus. Items added here are merged with the built-in
 *  items (Rename / Delete / Group / Unpack / …) at the time the menu opens. Returned unsubscribe
 *  cleans up — plugin teardown should call it. */
export class ContextMenuRegistry {
  readonly #node:   ContextMenuItemSpec<{ kind: 'node';   nodeId: NodeId }>[] = []
  readonly #edge:   ContextMenuItemSpec<{ kind: 'edge';   edgeId: EdgeId }>[] = []
  readonly #canvas: ContextMenuItemSpec<{ kind: 'canvas'; worldPosition: { x: number; y: number } }>[] = []

  registerNodeItem(spec: ContextMenuItemSpec<{ kind: 'node'; nodeId: NodeId }>): () => void {
    this.#node.push(spec)
    return () => { const i = this.#node.indexOf(spec); if (i >= 0) this.#node.splice(i, 1) }
  }

  registerEdgeItem(spec: ContextMenuItemSpec<{ kind: 'edge'; edgeId: EdgeId }>): () => void {
    this.#edge.push(spec)
    return () => { const i = this.#edge.indexOf(spec); if (i >= 0) this.#edge.splice(i, 1) }
  }

  registerCanvasItem(spec: ContextMenuItemSpec<{ kind: 'canvas'; worldPosition: { x: number; y: number } }>): () => void {
    this.#canvas.push(spec)
    return () => { const i = this.#canvas.indexOf(spec); if (i >= 0) this.#canvas.splice(i, 1) }
  }

  /** Resolve plugin items for a target → EdgeMenuItem rows ready to feed the menu component.
   *  `placement === 'start'` items go before built-ins; `'end'` after. Order within each placement
   *  group is registration order. `when()` returning false drops the item. */
  itemsFor(target: ContextMenuTarget): { start: EdgeMenuItem[]; end: EdgeMenuItem[] } {
    const start: EdgeMenuItem[] = []
    const end:   EdgeMenuItem[] = []
    const collect = <T extends ContextMenuTarget>(
      specs: readonly ContextMenuItemSpec<T>[],
      narrowed: T,
    ): void => {
      for (const spec of specs) {
        if (spec.when && !spec.when(narrowed)) continue
        const bound = (): void => spec.onSelect(narrowed)
        const item: EdgeMenuItem = spec.hint !== undefined
          ? { label: spec.label, hint: spec.hint, onSelect: bound }
          : { label: spec.label, onSelect: bound }
        ;(spec.placement === 'start' ? start : end).push(item)
      }
    }
    if (target.kind === 'node') collect(this.#node, target)
    else if (target.kind === 'edge') collect(this.#edge, target)
    else collect(this.#canvas, target)
    return { start, end }
  }
}
