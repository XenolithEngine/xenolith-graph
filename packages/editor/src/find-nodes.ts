// H1 — the find-node semantics shared by the MCP `find_nodes` tool and the human Ctrl+F search
// (extracted from mcp.ts so both surfaces can never disagree). Pure: takes a registry view and
// a node iterable, returns ordered hits.
//
// Title = the EFFECTIVE title: node `state.title` when renamed, else the schema's `title`.
// Type matching is exact but case-insensitive — LLMs and humans type 'filter' for 'Filter'.

export interface FindNodesQuery {
  type?: string
  category?: string
  titleContains?: string
}

export interface FoundNode {
  id: string
  type: string
  title: string | null
  category: string | null
}

export function findNodesIn(
  source: {
    registry: { all(): Iterable<{ type: string; title?: string | undefined; category?: string | undefined }> }
    nodes: Iterable<{ id: unknown; type: string; state?: Record<string, unknown> }>
  },
  q: FindNodesQuery,
): FoundNode[] {
  const needle = q.titleContains?.toLowerCase()
  const schemaByType = new Map<string, { title?: string | undefined; category?: string | undefined }>()
  for (const s of source.registry.all()) schemaByType.set(s.type, { title: s.title, category: s.category })
  const typeNeedle = q.type?.toLowerCase()
  const hits: FoundNode[] = []
  for (const n of source.nodes) {
    if (typeNeedle && n.type.toLowerCase() !== typeNeedle) continue
    const schema = schemaByType.get(n.type)
    const cat = schema?.category
    if (q.category && cat !== q.category) continue
    const title = ((n.state ?? {}) as { title?: string }).title ?? schema?.title ?? null
    if (needle && !(title?.toLowerCase().includes(needle) ?? false)) continue
    hits.push({ id: String(n.id), type: n.type, title, category: cat ?? null })
  }
  return hits
}
