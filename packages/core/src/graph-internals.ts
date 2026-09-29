import type { CommentId, EdgeId, NodeId } from './ids.js'
import type { Comment, Edge, Node, Pin } from './graph.js'
import type { WidgetSpec } from './widget.js'

/**
 * `Graph`'s command-bus mutation surface — the FRIEND interface (ADR 0008).
 *
 * `Graph` owns mutable storage (ADR 0005) but its underscore mutators carry internal markers
 * and are stripped from the shipped `.d.ts`; the in-repo editor's command bus reaches them
 * through `graph.internals()`, which returns this interface. Renaming or re-signaturing a
 * member here breaks the editor's build at compile time — the drift lock is the point.
 *
 * NOT for hosts: mutating through this surface bypasses the command bus — no undo steps, no
 * preventable events, no `graph:changed` commits. Hosts mutate through editor commands or
 * `editor.applyChanges`. Same story for the doc comments on the concrete members.
 */
export interface GraphInternals {
  /** Register a comment as-is (throws on duplicate id). */
  _addComment(comment: Comment): void
  /** Remove a comment, returning it (or undefined if unknown). */
  _removeComment(id: CommentId): Comment | undefined
  /** Patch mutable Comment fields in place (identity `id` is immutable). */
  _patchComment(
    id: CommentId,
    patch: Partial<Pick<Comment, 'position' | 'size' | 'text' | 'color'>>,
  ): Readonly<Comment> | undefined
  /** Register a node as-is (throws on duplicate id). */
  _addNode(node: Node): void
  /** Remove a node, returning it (or undefined if unknown). */
  _removeNode(id: NodeId): Node | undefined
  /** Register an edge as-is (throws on duplicate id). */
  _addEdge(edge: Edge): void
  /** Remove an edge, returning it (or undefined if unknown). */
  _removeEdge(id: EdgeId): Edge | undefined
  /** Patch a subset of mutable Node fields in place (`position`/`size`/`state`/`type`). */
  _patchNode(
    id: NodeId,
    patch: Partial<Pick<Node, 'position' | 'size' | 'state' | 'type'>>,
  ): Readonly<Node> | undefined
  /** Replace a node's pin list wholesale (incident-edge pruning is the caller's job). */
  _setNodePins(id: NodeId, pins: Pin[]): Readonly<Node> | undefined
  /** Replace a node's widget list wholesale (per-widget state values are NOT touched). */
  _setNodeWidgets(id: NodeId, widgets: WidgetSpec[] | undefined): Readonly<Node> | undefined
}
