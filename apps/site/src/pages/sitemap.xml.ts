import type { APIRoute } from 'astro'
import { EXAMPLES } from '../examples/manifest.ts'

// Manual sitemap rather than @astrojs/sitemap — no extra dep, and we want full control over which
// pages get listed (the playground / sandbox routes are intentionally excluded so AI crawlers
// don't burn budget on them).

export const GET: APIRoute = () => {
  const ORIGIN = 'https://xenolithengine.github.io'
  const BASE = '/xenolith-graph'

  const fixed = [
    { loc: `${ORIGIN}${BASE}/`,           priority: '1.0' },
    { loc: `${ORIGIN}${BASE}/examples/`,  priority: '0.9' },
    { loc: `${ORIGIN}${BASE}/playground/`, priority: '0.5' },
    { loc: `${ORIGIN}${BASE}/guides/install/`, priority: '0.8' },
    { loc: `${ORIGIN}${BASE}/llms.txt`,      priority: '0.7' },
    { loc: `${ORIGIN}${BASE}/llms-full.txt`, priority: '0.6' },
    { loc: `${ORIGIN}${BASE}/agents.md`,     priority: '0.7' },
    { loc: `${ORIGIN}${BASE}/api/mcp-tools.json`, priority: '0.6' },
    { loc: `${ORIGIN}${BASE}/api/graphs.jsonl`,   priority: '0.6' },
    { loc: `${ORIGIN}${BASE}/api/openapi.json`,   priority: '0.6' },
  ]

  const examples = EXAMPLES.map((e) => ({
    loc: `${ORIGIN}${BASE}/examples/${e.id}/`,
    priority: '0.7',
  }))

  const urls = [...fixed, ...examples].map((u) =>
    `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`,
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
