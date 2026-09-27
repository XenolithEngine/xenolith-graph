import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { EditorBridge } from '../bridge.js'
import { createMcpServer } from '../server.js'
import { TOOLS } from '../tools.js'
import { RESOURCES } from '../resources.js'

// Smoke: the REAL McpServer, built exactly like the CLI builds it, answers an MCP Client over
// an in-memory transport pair (the SDK's canonical in-process pattern — no stdio). Catches the
// registry's most embarrassing failure mode: a bad schema or a throw during registration making
// tools silently vanish from tools/list.
describe('createMcpServer smoke (tools/list + resources/list)', () => {
  let bridge: EditorBridge
  let server: ReturnType<typeof createMcpServer>
  let client: Client

  beforeEach(async () => {
    bridge = new EditorBridge({ port: 0, token: 'secret', log: () => {} })
    await bridge.start()
    server = createMcpServer(bridge)
    client = new Client({ name: 'smoke-test', version: '0.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(clientTransport), server.server.connect(serverTransport)])
  })
  afterEach(async () => {
    await client.close()
    await bridge.stop()
  })

  it('advertises every tool from the catalog (count + names + required metadata)', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual(Object.keys(TOOLS).sort())
    expect(names.length).toBeGreaterThanOrEqual(25)
    for (const name of ['list_node_types', 'add_node', 'connect_pins', 'auto_layout', 'get_graph']) {
      expect(names).toContain(name)
    }
    for (const tool of tools) {
      expect(tool.description?.length ?? 0).toBeGreaterThan(10) // clients show this to the LLM
    }
  })

  it('advertises the graph:// and schema:// resources', async () => {
    const { resources } = await client.listResources()
    const uris = resources.map((r) => r.uri).sort()
    expect(uris).toEqual(RESOURCES.map((r) => r.uri).sort())
  })

  it('identifies itself with the package name and version', async () => {
    const version = client.getServerVersion()
    expect(version?.name).toBe('xenolith-graph')
    expect(version?.version).toBe('0.7.0-beta.5')
  })
})
