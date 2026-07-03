import { xenTokens, mergeTheme, type XenTokens, type DeepPartial } from '@xenolithengine/graph-theme-xen'

/**
 * Daylight — original light-mode design language for XenolithGraph. Soft light-grey canvas
 * (`#E2E2E2`) where node bodies share the SAME fill as the canvas; separation comes purely
 * from a soft drop-shadow. Pin halos protrude from the body in a matching grey, with the
 * wire passing UNDER the halo. Typography is Helvetica Neue with an Inter fallback.
 *
 * Source: Figma "Node Draft" file, P3 colours flattened to sRGB hex.
 */
const daylightOverride: DeepPartial<XenTokens> = {
  color: {
    surface: {
      canvas:    '#E2E2E2',
      node:      '#E2E2E2',
      panel:     '#EDEDED',
      elevated:  '#FFFFFF',
      muted:     '#D6D6D6',
      subtle:    '#CFCFCF',
      outline:   'rgba(255, 255, 255, 0.31)',
      divider:   'rgba(0, 0, 0, 0.08)',
      headerEnd: '#E2E2E2',
    },
    text: {
      primary:   '#181717',
      secondary: '#515151',
      muted:     'rgba(24, 23, 23, 0.5)',
      disabled:  'rgba(24, 23, 23, 0.3)',
    },
    alpha: {
      white10: 'rgba(255, 255, 255, 0.1)',
      white20: 'rgba(255, 255, 255, 0.2)',
      white30: 'rgba(255, 255, 255, 0.31)',
      white50: 'rgba(255, 255, 255, 0.5)',
      dark50:  'rgba(0, 0, 0, 0.06)',
    },
    minimap: {
      background:  'rgba(255, 255, 255, 0.85)',
      border:      'rgba(0, 0, 0, 0.12)',
      node:        'rgba(24, 23, 23, 0.32)',
      frame:       'rgba(39, 105, 255, 0.14)',
      frameBorder: '#2769FF',
    },
    widget: {
      bg:            'rgba(255, 255, 255, 0.39)',
      bgHover:       'rgba(255, 255, 255, 0.55)',
      bgFocused:     '#FFFFFF',
      track:         'rgba(0, 0, 0, 0.08)',
      fill:          '#2769FF',
      fillAlpha:     0.6,
      text:          '#181717',
      label:         '#515151',
      placeholder:   '#515151',
      border:        'rgba(0, 0, 0, 0.12)',
      borderFocused: '#2769FF',
      selection:     'rgba(39, 105, 255, 0.25)',
      knob:          '#FFFFFF',
    },
    brand: {
      primary:       '#2769FF',
      primaryDark:   '#1B4FCC',
      primaryDeep:   '#0F306B',
      primaryLight:  '#6E9BFF',
      primaryPale:   '#C8D9FF',
      primaryAlpha20: 'rgba(39, 105, 255, 0.2)',
      primaryAlpha30: 'rgba(39, 105, 255, 0.3)',
      primaryAlpha50: 'rgba(39, 105, 255, 0.5)',
      primaryAlpha60: 'rgba(39, 105, 255, 0.6)',
    },
  },
  category: {
    logic:   { accent: '#1AA63D' },
    data:    { accent: '#2769FF' },
    macro:   { accent: '#8A78D2' },
    utility: { accent: '#515151' },
  },
  state: {
    hover:    { border: '#2769FF', borderWidth: 1, glow: 'rgba(39, 105, 255, 0.35)', glowBlur: 4 },
    selected: { border: '#181717', borderWidth: 1, glow: 'rgba(0, 0, 0, 0.15)', glowBlur: 5 },
    active:   { border: '#2769FF', borderWidth: 1, glow: 'rgba(39, 105, 255, 0.45)', glowBlur: 6 },
  },
  geometry: {
    node: {
      radius:       12,
      // Header band matches the Figma "Node Draft" spec: title at top:12 + height:16 = 28.
      headerHeight: 28,
    },
    header: {
      // Gap between header bottom (y=28) and first pin's halo top (y=37) — 9px per Figma.
      toPinsGap: 9,
    },
    pin: {
      // Row cell height MUST equal the halo diameter (20px) so 20px halos don't overlap when the
      // row layout computes centers from rowHeight — same size the render-node.ts custom renderer
      // uses (`HALO_RADIUS * 2`). rowSpacing = Figma inter-halo gap (9px, matches its auto-layout).
      rowHeight:  20,
      rowSpacing: 9,
    },
    // Wider wires than Xen — Daylight reads on a light grey canvas with low-contrast pin colours,
    // so a 2px wire (Xen default) looks anemic. 3px matches the Figma source.
    edge: {
      width:     3,
      execWidth: 3,
    },
  },
  pinType: {
    exec:     { color: '#2769FF', edgeColor: '#2769FF', edgeWidth: 3 },
    float:    { color: '#1AA63D', edgeColor: '#1AA63D', edgeWidth: 3 },
    string:   { color: '#8A78D2', edgeColor: '#8A78D2', edgeWidth: 3 },
    object:   { color: '#2769FF', edgeColor: '#2769FF', edgeWidth: 3 },
    wildcard: { color: '#515151', edgeColor: '#515151', edgeWidth: 3 },
    any:      { color: '#515151', edgeColor: '#515151', edgeWidth: 3 },
  },
  background: {
    color: '#E2E2E2',
    grid: {
      kind:    'dots',
      spacing: 24,
      size:    1,
      // Dark dots on a light canvas — Xen's `rgba(255,255,255,0.3)` was invisible on Daylight grey.
      color:   'rgba(0, 0, 0, 0.18)',
    },
  },
}

export const daylightTokens: XenTokens = mergeTheme(xenTokens, daylightOverride)
