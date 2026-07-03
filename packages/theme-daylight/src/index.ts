import type { XenolithTheme } from '@xenolithengine/graph-render-pixi'
import { daylightTokens } from './tokens.js'
import { renderNodeDaylight } from './render-node.js'

/**
 * Daylight — original light-mode design language. Soft grey canvas, drop-shadowed nodes,
 * protruding pin halos with wires that pass underneath, Helvetica typography. Pin
 * connected/disconnected state shows as filled disc vs ring.
 *
 * The custom `renderNode` (pin halos + category dot in header) lands in render-node.ts.
 * Until then this theme uses the default Xen node renderer — tokens already give it the
 * right colours but without the halo protrusion.
 */
export const daylightTheme: XenolithTheme = {
  id: 'daylight',
  // Helvetica Neue is installed by default on macOS/iOS; Inter is the CDN fallback the editor
  // already loads for Xen so the family resolution is two-step: Helvetica Neue → Inter → sans.
  fonts: [{ family: 'Inter', weights: [400, 500, 700] }],
  tokens: daylightTokens,
  needsBackdrop: false,
  freezeOnNavigate: false,
  commentHeaderStyle: 'tint',
  paletteStyle: {
    panelBackground:       'rgba(255, 255, 255, 0.92)',
    panelBorder:           'rgba(0, 0, 0, 0.08)',
    panelShadow:           '0 4px 14px rgba(174, 174, 174, 0.23)',
    panelRadius:           '12px',
    textColor:             '#181717',
    mutedColor:            '#515151',
    accent:                '#2769FF',
    rowSelectedBackground: 'rgba(39, 105, 255, 0.1)',
    inputBackground:       'rgba(255, 255, 255, 0.6)',
    inputBorder:           'rgba(0, 0, 0, 0.12)',
  },
  renderNode: (node, opts) => renderNodeDaylight(node, daylightTokens, opts),
}

export { daylightTokens } from './tokens.js'

export const VERSION = '0.7.0-beta.4'
