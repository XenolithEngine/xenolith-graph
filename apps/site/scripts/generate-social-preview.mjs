// GitHub repository social-preview card (1280×640, ≤1 MB PNG).
// Mirrors generate-og.mjs but uses GitHub's recommended dimensions and keeps every
// element inside the 40pt safe-area border so nothing gets cropped on profile previews.

import { readFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '..')
const LOGO = resolve(ROOT, 'src/assets/logo.png')
const BACKDROP = resolve(ROOT, 'src/assets/og-backdrop.jpg')
const OUT = resolve(ROOT, '../../docs/social-preview.png')

const W = 1280
const H = 640
const SAFE = 40

const logoBuf = await readFile(LOGO)
const backdropBuf = await readFile(BACKDROP)

const logoSize = 200
const logoX = SAFE + 56
const logoY = Math.round((H - logoSize) / 2)

const backdropFitted = await sharp(backdropBuf)
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.5 })
  .blur(0.4)
  .toBuffer()

const logoRendered = await sharp(logoBuf)
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer()

const textX = logoX + logoSize + 64
const overlaySvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="darken" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="#0A0A0A" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="#0A0A0A" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#0A0A0A" stop-opacity="0.88"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#FFF7D7"/>
      <stop offset="48%"  stop-color="#B09C5A"/>
      <stop offset="100%" stop-color="#FFF7D7"/>
    </linearGradient>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Tektur:wght@500;700&amp;family=Manrope:wght@400;500;600&amp;family=JetBrains+Mono:wght@500&amp;display=swap");
      .display { font-family: 'Tektur', 'Manrope', sans-serif; }
      .body    { font-family: 'Manrope', sans-serif; }
      .mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#darken)"/>

  <g transform="translate(${textX}, 200)">
    <text class="display" x="0" y="0" font-size="76" font-weight="700" fill="url(#gold)">XenolithGraph</text>
    <text class="display" x="0" y="52" font-size="20" font-weight="500" fill="rgba(255,255,255,0.66)" letter-spacing="0.08em">AN AI-NATIVE NODE EDITOR FOR THE WEB</text>
    <text class="body"    x="0" y="128" font-size="28" font-weight="500" fill="rgba(255,255,255,0.94)">Beautiful node editing. Built to embed.</text>
    <text class="body"    x="0" y="194" font-size="17" font-weight="400" fill="rgba(255,255,255,0.62)" letter-spacing="0.02em">Macros · Templates · Widgets · MCP · 6 framework adapters · MIT</text>
  </g>

  <g transform="translate(${SAFE + 56}, ${H - SAFE - 28})">
    <text class="mono" x="0" y="0" font-size="14" font-weight="500" fill="rgba(252, 180, 0, 0.85)" letter-spacing="0.16em">BETA · 0.7.0</text>
  </g>
  <g transform="translate(${W - SAFE - 56}, ${H - SAFE - 28})">
    <text class="mono" x="0" y="0" font-size="14" font-weight="500" fill="rgba(255,255,255,0.50)" letter-spacing="0.10em" text-anchor="end">xenolithengine.github.io/xenolith-graph</text>
  </g>

  <rect x="0" y="${H - 4}" width="${W}" height="4" fill="url(#gold)" opacity="0.6"/>
</svg>`)

await mkdir(dirname(OUT), { recursive: true })
await sharp(backdropFitted)
  .composite([
    { input: overlaySvg, top: 0, left: 0 },
    { input: logoRendered, top: logoY, left: logoX },
  ])
  .png({ compressionLevel: 9 })
  .toFile(OUT)

console.log(`✓ social-preview.png written → ${OUT}`)
