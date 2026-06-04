import type { XenolithTheme } from '@xenolithengine/graph-render-pixi'
import { holographicTokens } from './tokens.js'
import { createHolographicBackdrop } from './backdrop.js'
import { renderNodeHolographic } from './render-node.js'
import { renderRerouteHolographic, renderRerouteNodeBoxHolographic } from './render-reroute.js'
import { drawEdgeHolographic } from './draw-edge.js'

/**
 * Holographic / Iridescent theme — Apple Vision OS / Y2K aesthetic. Translucent glass panels
 * with rainbow iridescent borders, per-node parallax hue shift, rainbow-gradient wires on a
 * matte-black noise backdrop.
 *
 * Built from scratch — does NOT wrap the base Xen renderer. Custom `renderNode` builds the
 * geometry directly; `drawEdge` paints rainbow segments by sampling the bezier. The only pieces
 * shared with Xen are layout maths (`computeNodeLayout`) and the widget renderer (`renderWidgets`)
 * — both theme-agnostic primitives in `@xenolithengine/graph-render-pixi`.
 */
export const holographicTheme: XenolithTheme = {
  id: 'holographic',
  fonts: [{ family: 'Inter', weights: [400, 600, 700] }],
  tokens: holographicTokens,
  // Per-node Sprite for the iridescent frame + 3 fill passes adds non-trivial draw weight; the
  // Apple Vision OS feel asks for big visible glass plates, not 1000 micro-nodes. Lower the
  // virtualization threshold so off-viewport nodes drop their views earlier than the 300 default.
  virtualizeThreshold: 120,
  paletteStyle: {
    backdropFilter:        'blur(28px) saturate(180%)',
    panelBackground:       'rgba(20, 20, 32, 0.55)',
    panelBorder:           'rgba(255, 255, 255, 0.18)',
    panelShadow:           '0 16px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
    panelRadius:           '14px',
    textColor:             '#f5f5fa',
    mutedColor:            'rgba(245, 245, 250, 0.65)',
    accent:                '#c8a8ff',
    rowSelectedBackground: 'rgba(200, 168, 255, 0.18)',
    inputBackground:       'rgba(20, 20, 32, 0.7)',
    inputBorder:           'rgba(255, 255, 255, 0.16)',
  },
  renderNode: (node, opts) => renderNodeHolographic(node, holographicTokens, opts),
  renderReroute: (node, opts) => renderRerouteHolographic(node, holographicTokens, opts),
  renderRerouteNode: (node, opts) => renderRerouteNodeBoxHolographic(node, holographicTokens, opts),
  drawEdge:   (g, from, to, opts) => drawEdgeHolographic(g, from, to, holographicTokens, opts),
  createGrid: () => createHolographicBackdrop(),
}

export { holographicTokens } from './tokens.js'
export const VERSION = '0.7.0-beta.2'
