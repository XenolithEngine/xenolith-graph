import type { APIRoute } from 'astro'
import { EXAMPLES } from '../../examples/manifest.ts'

// Machine-readable index of every example as one JSON object per line. Tiny, no HTML. Designed for
// agents that want to enumerate the gallery in one fetch (vs. crawling 30 example pages).
//
// Schema per row: { id, title, category, description, url, frameworks, files }
//
// Why JSONL not JSON: agents stream-parse, supports arbitrary growth without re-reading the whole
// document. Convention also used by HuggingFace / OpenAI for datasets.

export const GET: APIRoute = () => {
  const ORIGIN = 'https://xenolithengine.github.io'
  const BASE = '/xenolith-graph'
  const lines = EXAMPLES.map((e) => JSON.stringify({
    id: e.id,
    title: e.title,
    category: e.category,
    description: e.blurb,
    url: `${ORIGIN}${BASE}/examples/${e.id}/`,
    llmsUrl: `${ORIGIN}${BASE}/examples/${e.id}/llms.md`,
    thumb: `${ORIGIN}${BASE}/examples/thumbs/${e.id}.jpg`,
    frameworks: Object.keys(e.impls),
    files: Object.values(e.impls).flatMap((impl) => impl!.files),
  })).join('\n')

  return new Response(lines + '\n', {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  })
}
