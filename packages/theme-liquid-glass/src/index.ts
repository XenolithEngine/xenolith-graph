import type { XenolithTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTokens } from './tokens.js'
import {
  renderNodeLiquidGlass,
  renderRerouteLiquidGlass,
  renderRerouteNodeBoxLiquidGlass,
  syncLiquidGlassBackdropSize,
  syncLiquidGlassBackdropTexture,
} from './render-node.js'
import { createLiquidGlassBackdrop } from './backdrop.js'

/**
 * Liquid Glass theme — Apple WWDC25 material aesthetic applied to nodes.
 *
 * Custom PIXI v8 Mesh + GLSL material per node body (see `render-node.ts` + `glass-shader.ts`).
 * Each frame the editor renders the world (minus the nodes layer) into a backdrop RenderTexture
 * via `needsBackdrop: true`; every glass body samples that texture through its shader with
 * edge-localised refraction, gaussian blur, and a vertical tint. Sits over a radial-gradient
 * navy canvas with a soft dot grid (`createGrid` override).
 */
export const liquidGlassTheme: XenolithTheme = {
  id: 'liquid-glass',
  fonts: [{ family: 'Inter', weights: [400, 600, 700] }],
  tokens: liquidGlassTokens,
  needsBackdrop: true,
  // Disabled for now: the freeze/unfreeze at gesture start/end causes a hitch that hurts
  // smoothness more than the per-frame glass cost. Revisit with proper LOD/virtualization (#59).
  freezeOnNavigate: false,
  // Glass nodes are far heavier per node than flat Xen ones (per-node backdrop RTs + the refraction
  // shader), so the GPU ceiling is hit at fewer nodes — virtualize earlier than the 300 default.
  virtualizeThreshold: 150,
  // Comment header mirrors the LG node header: a flat accent tint over the (non-glass) comment body.
  commentHeaderStyle: 'tint',
  // CSS frosted-glass approximation for DOM chrome (insert palette). Translucent cool-white
  // panel + heavy backdrop blur + luminous 1px rim + soft inner highlight — the WWDC25 look
  // without the backdrop-sampling shader (overkill for chrome).
  paletteStyle: {
    backdropFilter:        'blur(18px) saturate(160%)',
    panelBackground:       'rgba(28, 42, 74, 0.55)',
    panelBorder:           'rgba(255, 255, 255, 0.28)',
    panelShadow:           '0 16px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
    panelRadius:           '16px',
    textColor:             'rgba(255, 255, 255, 0.95)',
    mutedColor:            'rgba(220, 232, 255, 0.6)',
    accent:                '#9AD6E3',
    rowSelectedBackground: 'rgba(255, 255, 255, 0.16)',
    inputBackground:       'rgba(255, 255, 255, 0.1)',
    inputBorder:           'rgba(255, 255, 255, 0.22)',
  },
  renderNode: (node, opts, ctx) => renderNodeLiquidGlass(node, liquidGlassTokens, opts, ctx),
  renderReroute: (node, opts, ctx) => renderRerouteLiquidGlass(node, liquidGlassTokens, opts, ctx),
  renderRerouteNode: (node, opts, ctx) => renderRerouteNodeBoxLiquidGlass(node, liquidGlassTokens, opts, ctx),
  createGrid: () => createLiquidGlassBackdrop(liquidGlassTokens),
  onFrame: (ctx) => {
    const tex = ctx.backdropTexture
    if (tex) syncLiquidGlassBackdropSize(tex.width, tex.height)
  },
  onNodeBackdrop: (nodeId, texture) => syncLiquidGlassBackdropTexture(nodeId, texture),
}

export { liquidGlassTokens } from './tokens.js'

export const VERSION = '0.7.0-beta.2'
