import { Container, TilingSprite, Texture } from 'pixi.js'

// Holographic canvas backdrop — matte black with a subtle film-grain noise. The glass panels
// + iridescent borders are the visual focus, so the backdrop intentionally STAYS QUIET.

const TILE = 512

function bakeNoise(): Texture {
  const cnv = document.createElement('canvas')
  cnv.width = TILE
  cnv.height = TILE
  const ctx = cnv.getContext('2d')!

  // Matte black base.
  ctx.fillStyle = '#0a0a0e'
  ctx.fillRect(0, 0, TILE, TILE)

  // Deterministic noise via a simple linear hash — same texture every build so screenshot diffs
  // stay clean. Low contrast (luma 4-10) — visible only when zoomed in.
  const img = ctx.getImageData(0, 0, TILE, TILE)
  for (let i = 0; i < img.data.length; i += 4) {
    const r = (i * 9301 + 49297) % 233280
    const n = 4 + (r / 233280) * 6
    img.data[i] = 10 + n
    img.data[i + 1] = 10 + n
    img.data[i + 2] = 14 + n
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)

  return Texture.from(cnv)
}

export function createHolographicBackdrop(): Container {
  const root = new Container({ label: 'holographic-backdrop' })
  const tex = bakeNoise()
  const SIZE = 40_000
  const tile = new TilingSprite({ texture: tex, width: SIZE, height: SIZE })
  // PIXI v8 TilingSprite doesn't honour `anchor` reliably — set the top-left to (-SIZE/2, -SIZE/2)
  // so the tile is centred on world (0,0). Without this the tile starts at (0,0) and only covers
  // the bottom-right quadrant — the visible backdrop was clipped because the camera was looking
  // at world coords near origin.
  tile.position.set(-SIZE / 2, -SIZE / 2)
  root.addChild(tile)
  return root
}
