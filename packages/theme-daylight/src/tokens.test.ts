import { describe, it, expect } from 'vitest'
import { daylightTokens } from './tokens.js'

// Daylight tokens are extracted from the Figma source ("Node Draft" file). Hex values are P3 →
// sRGB approximations: Figma exports `display-p3 0.886 0.886 0.886` as `#E2E2E2`, which is the
// sRGB fallback the browser uses unless the page declares P3. We store sRGB hex so it matches
// what a non-P3 user will see; P3 is a future upgrade for the whole theme system.

describe('daylightTokens', () => {
  it('canvas and node body share the same light-grey — separation is via shadow only', () => {
    expect(daylightTokens.color.surface.canvas).toBe('#E2E2E2')
    expect(daylightTokens.color.surface.node).toBe('#E2E2E2')
  })

  it('text primary is near-black for daylight readability', () => {
    expect(daylightTokens.color.text.primary).toBe('#181717')
    expect(daylightTokens.color.text.secondary).toBe('#515151')
  })

  it('exec pin colour switches from gold (Xen) to brand blue', () => {
    expect(daylightTokens.pinType.exec.color).toBe('#2769FF')
    expect(daylightTokens.pinType.exec.edgeColor).toBe('#2769FF')
  })

  it('float (data) pins use the green Figma accent', () => {
    expect(daylightTokens.pinType.float.color).toBe('#1AA63D')
  })

  it('widget background is the translucent-white frosted inset from Figma', () => {
    expect(daylightTokens.color.widget.bg).toBe('rgba(255, 255, 255, 0.39)')
  })
})
