#!/usr/bin/env node
// Regenerate the committed React Flow fixtures. Deterministic: same seeds → byte-identical
// files (verified by the package self-test). Run from the repo root:
//   node packages/test-fixtures/scripts/generate-reactflow.mjs
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateReactFlowFixture, reactFlowFeaturesFixture } from '../src/reactflow-gen.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '..', 'fixtures', 'reactflow')

// Keep in sync with src/manifest.ts ('reactflow/*' entries).
const TARGETS = [
  { file: 'rf-features.json', make: () => reactFlowFeaturesFixture() },
  { file: 'rf-mid.json', make: () => generateReactFlowFixture({ seed: 1337, nodes: 150, edges: 230, subflows: 3 }) },
  { file: 'rf-xl.json', make: () => generateReactFlowFixture({ seed: 4242, nodes: 1000, edges: 1600, subflows: 8 }) },
]

await mkdir(OUT, { recursive: true })
for (const t of TARGETS) {
  const graph = t.make()
  const json = JSON.stringify(graph, null, 1) + '\n'
  await writeFile(resolve(OUT, t.file), json)
  const parentId = graph.nodes.filter((n) => 'parentId' in n).length
  console.log(`${t.file}: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${parentId} parented, ${(json.length / 1024).toFixed(1)} KB`)
}
console.log('Update src/manifest.ts nodes/links/bytes if any of the above changed.')
