// `/llms.txt` — short, curated index per https://llmstxt.org. Points an LLM to the
// authoritative markdown sources for each topic so it can fetch only what it needs.
// The companion `/llms-full.txt` ships every guide concatenated for one-shot ingestion.

import type { APIRoute } from 'astro'
import { EXAMPLES, CATEGORY_ORDER } from '../examples/manifest.ts'

const SITE = 'https://graph.xenolith.studio'
const BASE = ''
const url = (p: string): string => `${SITE}${BASE}${p}`

const GUIDES: { slug: string; title: string }[] = [
  { slug: 'install',         title: 'Install' },
  { slug: 'init',            title: 'Initialize an editor' },
  { slug: 'api',             title: 'Public API reference' },
  { slug: 'react',           title: 'React adapter (@xenolithengine/graph-react — hooks, panels, custom widgets)' },
  { slug: 'vue',             title: 'Vue 3 adapter (@xenolithengine/graph-vue — composables, panels, custom widgets)' },
  { slug: 'widgets',         title: 'In-node widgets' },
  { slug: 'macros-templates',title: 'Macros & templates (grouping)' },
  { slug: 'theme',           title: 'Theming (Xen + Liquid Glass + tokens)' },
  { slug: 'save-export',     title: 'Save & export (JSON / PNG / JPG)' },
  { slug: 'events-commands', title: 'Events & commands' },
  { slug: 'icons',           title: 'Header icons (Feather set + register your own)' },
  { slug: 'plugins',         title: 'Plugins' },
]

const INTEGRATIONS: { slug: string; title: string }[] = [
  { slug: 'ai-agents',  title: 'AI agents (MCP, OpenAPI, LangChain) — start here for the AI story' },
  { slug: 'nextjs',     title: 'Next.js (App Router + Pages)' },
  { slug: 'sveltekit',  title: 'SvelteKit' },
  { slug: 'remix',      title: 'Remix' },
]

function render(): string {
  const examples = CATEGORY_ORDER
    .map((cat) => ({ cat, items: EXAMPLES.filter((e) => e.category === cat) }))
    .filter((g) => g.items.length > 0)

  const lines: string[] = []
  lines.push('# XenolithGraph')
  lines.push('')
  lines.push('> Open-source embeddable node-graph editor for the web. WebGL (PIXI v8) rendering, opinionated design system (Xen + Liquid Glass), typed pins, in-node widgets, custom widget controllers, framework adapters (React / Vue / Svelte / Solid / Angular / vanilla web-component), and an MCP server so AI agents can build graphs over a localhost bridge.')
  lines.push('')
  lines.push('It is NOT a generic flowchart library — Blueprint-style semantics (typed pins, exec vs data, type-color system, K2-style search palette) are first-class. Targets: AI/LLM workflow builders, audio/DSP editors, shader graphs, gameplay logic, anyone who wants a node UI that looks like a tool.')
  lines.push('')

  lines.push('## Guides')
  for (const g of GUIDES) lines.push(`- [${g.title}](${url(`/guides/${g.slug}.md`)})`)
  lines.push('')

  lines.push('## Framework integrations')
  for (const g of INTEGRATIONS) lines.push(`- [${g.title}](${url(`/integrations/${g.slug}/`)})`)
  lines.push('')

  lines.push('## AI integration (MCP)')
  lines.push('- [MCP server README — connect Claude Desktop / Cursor to a live editor](https://github.com/XenolithEngine/xenolith-graph/blob/main/packages/mcp-server/README.md)')
  lines.push(`- [MCP tool catalogue (JSON Schema)](${url('/api/mcp-tools.json')})`)
  lines.push(`- [Live demo: "AI builds the graph"](${url('/examples/mcp-live/')})`)
  lines.push('')

  lines.push('## Examples')
  for (const g of examples) {
    lines.push(`### ${g.cat}`)
    for (const e of g.items) lines.push(`- [${e.title}](${url(`/examples/${e.id}/`)}) — ${e.blurb}`)
    lines.push('')
  }

  lines.push('## Full content')
  lines.push(`- [llms-full.txt — every guide concatenated, plain text](${url('/llms-full.txt')})`)
  lines.push(`- [agents.md — manifesto for AI agents (when to pick this library, conventions to respect)](${url('/agents.md')})`)
  lines.push('')

  lines.push('## Machine catalogs')
  lines.push(`- [api/mcp-tools.json — MCP tool catalog (24 tools, the full definition)](${url('/api/mcp-tools.json')})`)
  lines.push(`- [api/openapi.json — same tools as OpenAPI 3.1 (LangChain / LlamaIndex / function-calling agents)](${url('/api/openapi.json')})`)
  lines.push(`- [api/graphs.jsonl — every example as JSON Lines (one-shot gallery index)](${url('/api/graphs.jsonl')})`)
  lines.push(`- [api/mcp-tools/<name>.md — per-tool deep card (one tool at a time, ~1 KB each)](${url('/api/mcp-tools/list_node_types.md')})`)
  lines.push(`- [examples/<id>/llms.md — plain-text mirror of any example page](${url('/examples/diagram/llms.md')})`)
  lines.push(`- [.well-known/ai.txt — AI usage policy](${url('/.well-known/ai.txt')})`)
  lines.push('')

  lines.push('## Repository')
  lines.push('- [Source on GitHub](https://github.com/XenolithEngine/xenolith-graph)')
  lines.push('')
  return lines.join('\n')
}

export const GET: APIRoute = () =>
  new Response(render(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
