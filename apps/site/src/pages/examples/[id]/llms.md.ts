import type { APIRoute } from 'astro'
import { EXAMPLES } from '../../../examples/manifest.ts'

// Per-example plain-text mirror for AI crawlers. Same content as the example page minus the HTML
// chrome (sidebar, header, code-tabs UI) — just the title, blurb, category, source-file list, and
// links to the live demo + repo. ~10× smaller than the HTML page, ~10× higher signal-to-noise for
// an LLM trying to understand what each example demonstrates.

export function getStaticPaths(): { params: { id: string } }[] {
  return EXAMPLES.map((e) => ({ params: { id: e.id } }))
}

export const GET: APIRoute = ({ params }) => {
  const id = params['id'] as string
  const example = EXAMPLES.find((e) => e.id === id)
  if (!example) return new Response('not found', { status: 404 })

  const ORIGIN = 'https://xenolithengine.github.io'
  const BASE = '/xenolith-graph'
  const url = `${ORIGIN}${BASE}/examples/${example.id}/`
  const frameworks = Object.keys(example.impls).join(', ')
  const files = Object.entries(example.impls)
    .flatMap(([fw, impl]) => impl!.files.map((f) => `  - [${fw}] ${f}`))
    .join('\n')

  const body = [
    `# ${example.title}`,
    '',
    `**Category:** ${example.category}  `,
    `**Live demo:** ${url}  `,
    `**Frameworks shipped:** ${frameworks}`,
    '',
    '## Description',
    '',
    example.blurb,
    '',
    '## Source files',
    '',
    files,
    '',
    '## How to use this example',
    '',
    `Open the live demo at ${url} to interact with it in the browser. The same source files are`,
    'reproduced verbatim in the page so you can copy-paste into your own project. Every example is',
    'self-contained — pick one, copy the files, install `@xenolithengine/graph-editor` + the relevant framework',
    'adapter, and it runs.',
    '',
    '## See also',
    '',
    `- Full project docs: ${ORIGIN}${BASE}/llms.txt`,
    `- All examples (raw): ${ORIGIN}${BASE}/api/graphs.jsonl`,
    `- MCP tool catalog: ${ORIGIN}${BASE}/api/mcp-tools.json`,
    `- Repository: https://github.com/XenolithEngine/xenolith-graph`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}
