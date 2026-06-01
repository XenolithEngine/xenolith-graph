import { xenTokens, mergeTheme } from '@xenolith/theme-xen'

// Holographic tokens override Xen with glass-vibe values. The CUSTOM renderNode (in render-node.ts)
// builds the node geometry from scratch using these tokens — translucent body, no header gradient,
// crisp metallic text. Tokens still flow into the widget renderer (we reuse `renderWidgets` from
// render-pixi), so sliders / combos / colour pickers etc. get a coherent treatment.

const GLASS = {
  bodyFill:    'rgba(18, 18, 28, 0.45)',  // translucent dark
  bodyFillTop: 'rgba(35, 35, 55, 0.55)',  // slight top tint (inner highlight base)
  text:        '#f5f5fa',
  textMuted:   'rgba(245, 245, 250, 0.65)',
  accent:      '#c8a8ff',                  // soft lavender — neutral against rainbow border
  canvasBg:    '#0a0a0e',
}

export const holographicTokens = mergeTheme(xenTokens, {
  color: {
    surface: {
      canvas:   GLASS.canvasBg,
      node:     GLASS.bodyFill,
      panel:    'rgba(20, 20, 32, 0.85)',  // DOM chrome panels (palette etc.)
      elevated: 'rgba(35, 35, 55, 0.5)',
    },
    text: {
      primary:   GLASS.text,
      secondary: GLASS.textMuted,
      label:     GLASS.textMuted,
    },
    accent: GLASS.accent,
    grid:   'rgba(255, 255, 255, 0)',     // grid is in the noise backdrop, no PIXI grid
  },
  category: {
    // Categories in holographic are colour TINTS that subtly bias the iridescent border, NOT solid
    // headers (there's no header bar in this theme — the whole node is one glass plate).
    logic:   { accent: '#ff4dd6', gradient: 'linear-gradient(90deg, rgba(255, 77, 214, 0.5), rgba(255, 77, 214, 0))' },
    data:    { accent: '#4dd6ff', gradient: 'linear-gradient(90deg, rgba(77, 214, 255, 0.5), rgba(77, 214, 255, 0))' },
    macro:   { accent: '#c8a8ff', gradient: 'linear-gradient(90deg, rgba(200, 168, 255, 0.5), rgba(200, 168, 255, 0))' },
    utility: { accent: '#ffe04d', gradient: 'linear-gradient(90deg, rgba(255, 224, 77, 0.5), rgba(255, 224, 77, 0))' },
  },
  pinType: {
    exec:   { color: '#ffffff' },
    float:  { color: '#4dd6ff' },
    number: { color: '#4dd6ff' },
    string: { color: '#ffe04d' },
    object: { color: '#ff4dd6' },
    image:  { color: '#c8a8ff' },
    any:    { color: 'rgba(245, 245, 250, 0.9)' },
  },
  state: {
    hover:    { border: '#ffffff', borderWidth: 1, glow: 'rgba(255, 255, 255, 0.45)', glowBlur: 8 },
    selected: { border: '#ffffff', borderWidth: 2, glow: 'rgba(200, 168, 255, 0.7)',   glowBlur: 14 },
    active:   { border: '#ffe04d', borderWidth: 1, glow: 'rgba(255, 224, 77, 0.55)',   glowBlur: 10 },
  },
} as never)
