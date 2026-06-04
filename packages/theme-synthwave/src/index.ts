import { xenTokens, mergeTheme } from '@xenolithengine/graph-theme-xen'
import type { XenolithTheme } from '@xenolithengine/graph-render-pixi'
import { createSynthwaveBackdrop } from './backdrop.js'
import { renderNodeSynthwave } from './render-node.js'
import { drawEdgeSynthwave } from './draw-edge.js'

// Synthwave / retro-future neon theme — deep midnight purple canvas, hot magenta + electric cyan
// + laser violet category accents, sodium-yellow utility. Pure token override on top of Xen — no
// custom render hook, no shader; the existing renderer happily eats the rgba values.

const NEON = {
  midnight: '#0a0420',
  midnightDeep: '#070218',
  panel: '#160a3a',
  panelDeep: '#0e0520',
  grid: '#2a1561',
  hotPink: '#ff2ec0',
  cyan: '#00f0ff',
  violet: '#a040ff',
  yellow: '#ffea2c',
  white: '#ffffff',
  bone: '#f3eaff',
  lavender: '#c9b3ff',
}

const synthwaveOverrides = {
  color: {
    surface: {
      canvas: NEON.midnight,
      node: NEON.panel,
      nodeAlt: NEON.panelDeep,
    },
    text: {
      primary: NEON.bone,
      secondary: NEON.lavender,
      label: NEON.lavender,
    },
    accent: NEON.hotPink,
    grid: NEON.grid,
  },
  category: {
    logic: {
      accent: NEON.hotPink,
      gradient: 'linear-gradient(90deg, rgba(255, 46, 192, 0.75) 0%, rgba(22, 10, 58, 0.6) 100%)',
    },
    data: {
      accent: NEON.cyan,
      gradient: 'linear-gradient(90deg, rgba(0, 240, 255, 0.7) 0%, rgba(22, 10, 58, 0.6) 100%)',
    },
    macro: {
      accent: NEON.violet,
      gradient: 'linear-gradient(90deg, rgba(160, 64, 255, 0.75) 0%, rgba(22, 10, 58, 0.6) 100%)',
    },
    utility: {
      accent: NEON.yellow,
      gradient: 'linear-gradient(90deg, rgba(255, 234, 44, 0.7) 0%, rgba(22, 10, 58, 0.6) 100%)',
    },
  },
  pinType: {
    exec:   { color: NEON.white },
    float:  { color: NEON.cyan },
    number: { color: NEON.cyan },
    string: { color: NEON.yellow },
    object: { color: NEON.hotPink },
    image:  { color: NEON.violet },
    any:    { color: NEON.lavender },
  },
  state: {
    hover: {
      border:      NEON.cyan,
      borderWidth: 1,
      glow:        'rgba(0, 240, 255, 0.55)',
      glowBlur:    8,
    },
    selected: {
      border:      NEON.hotPink,
      borderWidth: 2,
      glow:        'rgba(255, 46, 192, 0.6)',
      glowBlur:    10,
    },
    active: {
      border:      NEON.yellow,
      borderWidth: 1,
      glow:        'rgba(255, 234, 44, 0.65)',
      glowBlur:    12,
    },
  },
}

export const synthwaveTokens = mergeTheme(xenTokens, synthwaveOverrides as never)

/**
 * Synthwave theme — neon-on-midnight palette inspired by TRON / Blade Runner / 80s arcade
 * marquees. Pure token override on top of Xen — no shader, no custom renderNode. Swap in via
 * `editor.setTheme(synthwaveTheme)`.
 */
export const synthwaveTheme: XenolithTheme = {
  id: 'synthwave',
  tokens: synthwaveTokens,
  createGrid: () => createSynthwaveBackdrop(),
  // Glow halo per node bakes a non-trivial extra Graphics + BlurFilter — virtualise earlier than
  // the 300-node default so we don't melt the GPU on the stress demo.
  virtualizeThreshold: 150,
  renderNode: (node, opts) => renderNodeSynthwave(node, synthwaveTokens, opts),
  drawEdge: (g, from, to, opts) => drawEdgeSynthwave(g, from, to, synthwaveTokens, opts),
  paletteStyle: {
    panelBackground:       'rgba(22, 10, 58, 0.92)',
    panelBorder:           'rgba(255, 46, 192, 0.45)',
    panelShadow:           '0 0 24px rgba(255, 46, 192, 0.32), 0 16px 48px rgba(0, 0, 0, 0.7)',
    panelRadius:           '10px',
    textColor:             '#F3EAFF',
    mutedColor:            '#C9B3FF',
    accent:                '#FF2EC0',
    rowSelectedBackground: 'rgba(255, 46, 192, 0.22)',
    inputBackground:       'rgba(14, 5, 32, 0.85)',
    inputBorder:           'rgba(160, 64, 255, 0.4)',
  },
}

export const VERSION = '0.7.0-beta.1'
