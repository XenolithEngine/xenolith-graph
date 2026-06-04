import type { EditorEvents } from '@xenolithengine/editor'

/** Maps each public editor event to its idiomatic React callback prop name. */
export const EVENT_PROP = {
  'node:added': 'onNodeAdded',
  'node:removed': 'onNodeRemoved',
  'node:removing': 'onNodeRemoving',
  'node:moved': 'onNodeMoved',
  'node:click': 'onNodeClick',
  'node:clicking': 'onNodeClicking',
  'node:drop': 'onNodeDrop',
  'edge:connected': 'onEdgeConnected',
  'edge:disconnected': 'onEdgeDisconnected',
  'edge:connecting': 'onEdgeConnecting',
  'edge:disconnecting': 'onEdgeDisconnecting',
  'selection:changed': 'onSelectionChange',
  'viewport:changed': 'onViewportChange',
  'widget:changed': 'onWidgetChange',
  'widget:action': 'onWidgetAction',
  'graph:loaded': 'onGraphLoad',
  'history:changed': 'onHistoryChange',
  'dive:changed': 'onDiveChange',
  'sidebar:opened': 'onSidebarOpen',
  'sidebar:closed': 'onSidebarClose',
  'livemode:changed': 'onLiveModeChange',
  'node:contextmenu':   'onNodeContextMenu',
  'edge:contextmenu':   'onEdgeContextMenu',
  'canvas:contextmenu': 'onCanvasContextMenu',
} as const satisfies Record<keyof EditorEvents, string>

/** The React callback props derived from {@link EVENT_PROP} — one optional handler per event. */
export type EventCallbacks = {
  [E in keyof EditorEvents as (typeof EVENT_PROP)[E]]?: (payload: EditorEvents[E]) => void
}
