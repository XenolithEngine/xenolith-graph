/**
 * Universal font loader for theme-declared font requirements.
 *
 * Themes export a static `fonts: FontSpec[]` list of what they need. The editor calls
 * `loadFonts(specs, opts)` on init and on each `setTheme(...)`. Default source is the Google
 * Fonts CDN — zero bundler config, zero shipped binaries, works everywhere. Hosts that need to
 * avoid the CDN (airgap / strict CSP / privacy) provide a self-hosted URL map via
 * `editor.fonts.selfHost({ 'Inter|400': '/fonts/Inter-Regular.woff2', ... })`.
 */

import type { FontSpec } from '@xenolithengine/graph-render-pixi'

/**
 * Map keyed by `<family>|<weight>[|<style>]` (style omitted = normal) → absolute font URL.
 * Used to override the default Google Fonts CDN with self-hosted WOFF2.
 */
export type FontUrlMap = Readonly<Record<string, string>>

export interface LoadFontsOptions {
  /** Per-(family, weight) URL overrides — see `FontUrlMap`. */
  selfHost?: FontUrlMap
}

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2'
const loadedRequests = new Set<string>()

/**
 * Load every font in `specs`. Idempotent — second call with the same families/weights is a no-op.
 * Returns once `document.fonts.ready` resolves (so PIXI Text measure is accurate on first paint).
 */
export async function loadFonts(specs: readonly FontSpec[], opts: LoadFontsOptions = {}): Promise<void> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined' || specs.length === 0) return

  const fromCdn: FontSpec[] = []

  for (const spec of specs) {
    const weights = spec.weights ?? [400]
    const styles  = spec.styles  ?? ['normal']
    let allSelfHosted = true
    for (const w of weights) {
      for (const s of styles) {
        const key = fontKey(spec.family, w, s)
        if (loadedRequests.has(key)) continue
        const url = opts.selfHost?.[key]
        if (url) {
          await registerFace(spec.family, w, s, url)
          loadedRequests.add(key)
        } else {
          allSelfHosted = false
        }
      }
    }
    if (!allSelfHosted) fromCdn.push(spec)
  }

  if (fromCdn.length > 0) injectGoogleFontsLink(fromCdn)

  await document.fonts.ready
}

function fontKey(family: string, weight: number, style: 'normal' | 'italic' = 'normal'): string {
  return style === 'normal' ? `${family}|${weight}` : `${family}|${weight}|${style}`
}

async function registerFace(family: string, weight: number, style: 'normal' | 'italic', url: string): Promise<void> {
  const face = new FontFace(family, `url(${url}) format("woff2")`, {
    weight: String(weight),
    style,
    display: 'swap',
  })
  await face.load()
  ;(document.fonts as unknown as { add(f: FontFace): void }).add(face)
}

function injectGoogleFontsLink(specs: readonly FontSpec[]): void {
  // One <link> per call, deduped by exact href so repeated setTheme() doesn't bloat <head>.
  const families = specs.map((s) => {
    const weights = (s.weights ?? [400]).slice().sort((a: number, b: number) => a - b)
    const styles: readonly ('normal' | 'italic')[] = s.styles ?? ['normal']
    const hasItalic = styles.includes('italic')
    // Google Fonts API v2 syntax:  family=Name:ital,wght@0,400;0,700;1,400
    const axisPairs = weights.flatMap((w: number) =>
      styles.map((st: 'normal' | 'italic') => `${st === 'italic' ? 1 : 0},${w}`),
    )
    const familyEnc = encodeURIComponent(s.family).replace(/%20/g, '+')
    return hasItalic ? `family=${familyEnc}:ital,wght@${axisPairs.join(';')}` : `family=${familyEnc}:wght@${weights.join(';')}`
  })
  const href = `${GOOGLE_FONTS_BASE}?${families.join('&')}&display=swap`

  // Reuse an existing <link> if its href already matches — avoids duplicate network requests on theme switch.
  for (const existing of document.querySelectorAll<HTMLLinkElement>('link[data-xeno-fonts]')) {
    if (existing.href === href) return
  }

  const link = document.createElement('link')
  link.setAttribute('data-xeno-fonts', '')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}
