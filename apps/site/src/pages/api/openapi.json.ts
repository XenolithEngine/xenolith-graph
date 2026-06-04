import type { APIRoute } from 'astro'
import { TOOLS } from '@xenolithengine/mcp-server'
import { zodToJsonSchema } from 'zod-to-json-schema'

// Auto-generated OpenAPI 3.1 catalog of every MCP tool. Same source as /api/mcp-tools.json — but
// in the standard OpenAPI shape so non-MCP function-calling agents (LangChain, LlamaIndex, raw
// OpenAI function tools, etc.) can read it. Routes are not actually mounted on this endpoint —
// the underlying transport is MCP over WebSocket. This file documents the WIRE SHAPE so an agent
// can either (a) spin up our MCP server or (b) build a custom HTTP proxy that mirrors it.

interface OpenAPIOperation {
  operationId: string
  summary: string
  description?: string
  requestBody: { required: boolean; content: { 'application/json': { schema: unknown } } }
  responses: { '200': { description: string } }
  tags: string[]
}

export const GET: APIRoute = () => {
  const paths: Record<string, { post: OpenAPIOperation }> = {}
  for (const tool of Object.values(TOOLS)) {
    const schema = zodToJsonSchema(tool.schema, { target: 'openApi3' })
    paths[`/tools/${tool.name}`] = {
      post: {
        operationId: tool.name,
        summary: tool.description.split('.')[0]!.trim(),
        description: tool.description,
        requestBody: { required: true, content: { 'application/json': { schema } } },
        responses: { '200': { description: 'Tool result (shape depends on the tool).' } },
        tags: ['mcp'],
      },
    }
  }
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'XenolithGraph MCP Tools',
      version: '1.0.0',
      description: 'Function-calling catalog mirroring every MCP tool exposed by `@xenolithengine/mcp-server`. Use this if your agent framework reads OpenAPI but not MCP directly.',
      contact: { url: 'https://github.com/XenolithEngine/xenolith-graph' },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [{ url: 'ws://127.0.0.1:7777', description: 'Local MCP WebSocket bridge.' }],
    paths,
  }

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  })
}
