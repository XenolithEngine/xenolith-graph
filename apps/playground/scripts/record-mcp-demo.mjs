// Records the /?demo=agent session to video for the "Agents build. Humans debug." asset.
// Usage: (pnpm --filter @xenolithengine/playground dev &) && node scripts/record-mcp-demo.mjs
// Writes an .mp4 next to this script; convert to GIF with the ffmpeg palette command in B1 notes.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT_DIR = new URL('../.recordings/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
})
const page = await context.newPage()
await page.goto('http://localhost:5173/?demo=agent')
await page.waitForSelector('[data-agent-done]', { timeout: 30_000 })
await page.waitForTimeout(1500) // let the final state breathe on camera
await context.close() // flushes the video
const video = page.video()
const path = await video.path()
await browser.close()
console.log(`VIDEO:${path}`)
