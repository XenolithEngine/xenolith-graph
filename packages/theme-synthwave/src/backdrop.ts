import { Container, Sprite, TilingSprite, Texture } from 'pixi.js'

// Synthwave canvas backdrop — three pieces stacked at world (0,0):
//   1. SKY tile: deep purple → magenta gradient + horizon line + stars.
//      TilingSprite that tiles HORIZONTALLY only (height = texture height, no vertical wrap),
//      anchored above the horizon (world y < 0 is above horizon).
//   2. GROUND tile: deep midnight + perspective grid + horizon glow.
//      Same trick — tile horizontally, single vertical strip going DOWN from horizon.
//   3. SUN sprite: single instance at world (0,0), sits on the horizon line.
//
// Why split into sky+ground rather than one tile: a single 2048×2048 tile that tiles vertically
// would repeat the horizon every 2048 world-units — surreal in a bad way. By making each strip
// the FULL height of its section (4096 tall) and tiling horizontal-only, the horizon stays
// where it should and there's no vertical repeat.

const TILE_W = 2048
const SKY_H = 4096
const GROUND_H = 4096
const WORLD_W = 32_000
const SUN_TILE = 1024
const SUN_R_RATIO = 0.16

function bakeSky(): Texture {
  const cnv = document.createElement('canvas')
  cnv.width = TILE_W
  cnv.height = SKY_H
  const ctx = cnv.getContext('2d')!

  // Top of canvas = far above horizon (deep midnight); bottom = at horizon (hot pink).
  const sky = ctx.createLinearGradient(0, 0, 0, SKY_H)
  sky.addColorStop(0,    '#070218')
  sky.addColorStop(0.75, '#1a0838')
  sky.addColorStop(0.92, '#5b1466')
  sky.addColorStop(1,    '#a01a8c')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, TILE_W, SKY_H)

  // Stars — deterministic so adjacent tiles share their layout (no visible seam).
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  const STAR_COUNT = 140
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = ((i * 137.508) % TILE_W)
    const y = ((i * 73.911)  % SKY_H) * 0.7 // keep stars in upper 70% (far from horizon)
    const size = (i % 3 === 0) ? 1.6 : 0.9
    ctx.fillRect(x, y, size, size)
  }

  // Horizon glow band — magenta haze just above the horizon line.
  const haze = ctx.createLinearGradient(0, SKY_H - 80, 0, SKY_H)
  haze.addColorStop(0, 'rgba(255, 46, 192, 0)')
  haze.addColorStop(1, 'rgba(255, 46, 192, 0.55)')
  ctx.fillStyle = haze
  ctx.fillRect(0, SKY_H - 80, TILE_W, 80)

  // Horizon line — bright cyan rim at the bottom edge.
  ctx.fillStyle = '#00f0ff'
  ctx.fillRect(0, SKY_H - 2, TILE_W, 2)

  return Texture.from(cnv)
}

function bakeGround(): Texture {
  const cnv = document.createElement('canvas')
  cnv.width = TILE_W
  cnv.height = GROUND_H
  const ctx = cnv.getContext('2d')!

  // Solid deep midnight ground.
  ctx.fillStyle = '#06021a'
  ctx.fillRect(0, 0, TILE_W, GROUND_H)

  // Perspective grid — converging to a vanishing point at the TOP CENTRE (horizon centre of a
  // single tile). Across multiple tiled copies you get many vanishing points which reads as a
  // proper "wide vaporwave plain", not "one perfect perspective".
  const VP_X = TILE_W / 2
  const VP_Y = 0
  ctx.strokeStyle = 'rgba(255, 46, 192, 0.5)'
  ctx.lineWidth = 1.2
  const RADIAL_COUNT = 28
  for (let i = -RADIAL_COUNT / 2; i <= RADIAL_COUNT / 2; i++) {
    const x = VP_X + (i / (RADIAL_COUNT / 2)) * TILE_W * 1.6
    ctx.beginPath()
    ctx.moveTo(VP_X, VP_Y)
    ctx.lineTo(x, GROUND_H)
    ctx.stroke()
  }
  // Horizontal lines — exponential spacing, dense near horizon (top of tile) and far apart down.
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)'
  const ROW_COUNT = 18
  for (let i = 1; i <= ROW_COUNT; i++) {
    const t = Math.pow(i / ROW_COUNT, 2.2)
    const y = t * GROUND_H
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(TILE_W, y)
    ctx.stroke()
  }

  return Texture.from(cnv)
}

function bakeSun(): Texture {
  // Slim sun — small radius and 6 thin slice bars. Drawn on a transparent canvas so the sky
  // gradient shows through behind it.
  const cnv = document.createElement('canvas')
  cnv.width = SUN_TILE
  cnv.height = SUN_TILE
  const ctx = cnv.getContext('2d')!
  const cx = SUN_TILE / 2
  // Sun centre slightly above the canvas centre so the bottom of the disc touches the canvas
  // bottom — placement code below pins THAT bottom edge to world y=0 (the horizon).
  const cy = SUN_TILE * 0.5
  const sunR = SUN_TILE * SUN_R_RATIO

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR)
  grad.addColorStop(0,    'rgba(255, 200, 90, 0.98)')
  grad.addColorStop(0.5,  'rgba(255, 80, 180, 0.55)')
  grad.addColorStop(1,    'rgba(255, 80, 180, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2)
  ctx.fill()

  // Six slim slice bars in the bottom half of the sun — classic synthwave silhouette.
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  const SLICE_COUNT = 6
  const barH = 3
  const sliceSpan = sunR * 0.85
  for (let i = 0; i < SLICE_COUNT; i++) {
    const y = cy + (i * sliceSpan) / SLICE_COUNT
    ctx.fillRect(cx - sunR, y, sunR * 2, barH)
  }
  ctx.globalCompositeOperation = 'source-over'

  return Texture.from(cnv)
}

export function createSynthwaveBackdrop(): Container {
  const root = new Container({ label: 'synthwave-backdrop' })

  // SKY — tiles horizontally only. Anchor on the BOTTOM-CENTRE so its bottom edge sits exactly
  // at world y=0 (the horizon). Sprite height = texture height (no vertical wrap).
  const skyTex = bakeSky()
  const sky = new TilingSprite({ texture: skyTex, width: WORLD_W, height: SKY_H })
  sky.anchor.set(0.5, 1.0)
  sky.position.set(0, 0)
  sky.tilePosition.set(TILE_W / 2, 0) // centre a tile boundary on x=0 so the sun lands mid-section
  root.addChild(sky)

  // GROUND — tiles horizontally only. Anchor on TOP-CENTRE so its top edge sits at world y=0.
  const groundTex = bakeGround()
  const ground = new TilingSprite({ texture: groundTex, width: WORLD_W, height: GROUND_H })
  ground.anchor.set(0.5, 0.0)
  ground.position.set(0, 0)
  ground.tilePosition.set(TILE_W / 2, 0)
  root.addChild(ground)

  // SUN — single sprite. Anchor bottom-centre so the visible disc sits ON the horizon line.
  const sun = new Sprite(bakeSun())
  const SUN_WORLD_SIZE = 2400
  sun.width = SUN_WORLD_SIZE
  sun.height = SUN_WORLD_SIZE
  sun.anchor.set(0.5, 0.5) // centre — half-above, half-below the horizon line at world y=0
  sun.position.set(0, 0)
  root.addChild(sun)

  return root
}
