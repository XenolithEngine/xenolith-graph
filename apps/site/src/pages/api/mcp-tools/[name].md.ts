import type { APIRoute } from 'astro'
import { TOOLS } from '@xenolith/mcp-server'
import { zodToJsonSchema } from 'zod-to-json-schema'

// Per-tool plain-text card. The aggregate `/api/mcp-tools.json` is great for cataloguing, but if an
// agent needs to deeply understand ONE tool (its full description, its JSON-Schema input shape,
// examples), it pulls a wall of irrelevant text. This endpoint serves one tool at a time —
// ~1 KB instead of ~12 KB. Markdown so it renders cleanly in any preview tool the agent uses.

export function getStaticPaths(): { params: { name: string } }[] {
  return Object.values(TOOLS).map((t) => ({ params: { name: t.name } }))
}

export const GET: APIRoute = ({ params }) => {
  const name = params['name'] as string
  const tool = Object.values(TOOLS).find((t) => t.name === name)
  if (!tool) return new Response('not found', { status: 404 })

  const schema = zodToJsonSchema(tool.schema, { target: 'openApi3' })
  const ORIGIN = 'https://xenolithengine.github.io'
  const BASE = '/xenolith-graph'

  const body = [
    `# ${tool.name}`,
    '',
    '**Server:** `@xenolith/mcp-server`  ',
    '**Transport:** stdio MCP ↔ WS bridge (port 7777 by default)  ',
    `**OpenAPI:** ${ORIGIN}${BASE}/api/openapi.json`,
    '',
    '## Description',
    '',
    tool.description,
    '',
    '## Input schema',
    '',
    '```json',
    JSON.stringify(schema, null, 2),
    '```',
    '',
    '## Example call',
    '',
    '```jsonc',
    `// MCP tool call`,
    `{`,
    `  "method": "tools/call",`,
    `  "params": {`,
    `    "name": "${tool.name}",`,
    `    "arguments": { /* see input schema above */ }`,
    `  }`,
    `}`,
    '```',
    '',
    '## See also',
    '',
    `- Full tool catalog: ${ORIGIN}${BASE}/api/mcp-tools.json`,
    `- AI agent guide: ${ORIGIN}${BASE}/agents.md`,
    `- Repository: https://github.com/XenolithEngine/xenolith-graph`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  })
}
