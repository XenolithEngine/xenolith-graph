// Records the /?demo=agent session to video for the "Agents build. Humans debug." asset.
// Usage: (pnpm --filter @xenolithengine/playground dev &) && node scripts/record-mcp-demo.mjs
//
// The raw page load is several seconds of gray (Vite cold-transforms the module graph on the
// FIRST request, then the editor boots). Two fixes keep it out of the recording:
//   1. a throwaway warm-up browser hits the page first so Vite's transform cache is hot;
//   2. the recording measures when the session actually starts (transcript panel mounted) and
//      prints START_MS — trim with `ffmpeg -ss <START_MS/1000 - 0.25>` when converting.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const PAGE_URL = 'http://localhost:5173/?demo=agent'
const OUT_DIR = new URL('../.recordings/', import.meta.url).pathname
mkdirSync(OUT_DIR, { recursive: true })

// Warm-up: populate Vite's transform cache + editor's font/CDN cache with a non-recording page.
const warmer = await chromium.launch()
{
  const page = await warmer.newPage()
  await page.goto(PAGE_URL)
  await page.waitForFunction(() => '__xenoEditor' in window, null, { timeout: 60_000 })
}
await warmer.close()

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
})
const page = await context.newPage()
const t0 = Date.now()
await page.goto(PAGE_URL)
// The session's first visible moment = transcript panel mounted (buildLog) — trim up to here.
await page.waitForSelector('[data-agent-log]', { timeout: 60_000 })
const startMs = Date.now() - t0
await page.waitForSelector('[data-agent-done]', { timeout: 60_000 })
await page.waitForTimeout(1500) // let the final state breathe on camera
await context.close() // flushes the video
const path = await page.video().path()
await browser.close()
console.log(`START_MS:${Math.max(0, startMs - 250)}`) // 250ms pre-roll for the title line
console.log(`VIDEO:${path}`)
