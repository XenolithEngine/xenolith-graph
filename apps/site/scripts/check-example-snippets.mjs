// Gate for the examples gallery. Snippet files are raw text in the site build —
// nothing typechecks them — so this script is the compiler they get.
//
// 1. Every manifest `impls` path exists on disk.
// 2. Every file under examples/{vue,svelte,solid,angular} is listed by some impl
//    (a snippet that isn't in the manifest can never show up, and a listed path
//    that doesn't exist ships a "// missing" tab).
// 3. The word "soon" is banned in the manifest, DemoFrame, and those snippets.
// 4. Svelte snippets compile. `$stores.` and `setEditorFor` are banned in them
//    (`$` auto-subscription needs a plain identifier; setEditorFor was a pre-contract API).

import { createRequire } from 'node:module'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(scriptDir, '../../..')
const examplesDir = path.join(repo, 'apps/site/src/examples')

const { EXAMPLES } = await import(pathToFileURL(path.join(examplesDir, 'manifest.ts')).href)

const SNIPPET_DIRS = ['vue', 'svelte', 'solid', 'angular']

function resolveRel(rel) {
  const roots = [
    ['shared/', path.join(repo, 'apps/shared')],
    ['vanilla/', path.join(examplesDir, 'vanilla')],
    ['vue/', path.join(examplesDir, 'vue')],
    ['angular/', path.join(examplesDir, 'angular')],
    ['svelte/', path.join(examplesDir, 'svelte')],
    ['solid/', path.join(examplesDir, 'solid')],
  ]
  for (const [prefix, root] of roots) {
    if (rel.startsWith(prefix)) return path.join(root, rel.slice(prefix.length))
  }
  return path.join(repo, 'apps/demo-react/src', rel)
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else out.push(abs)
  }
  return out
}

const errors = []
const listed = new Set()

for (const example of EXAMPLES) {
  for (const impl of Object.values(example.impls)) {
    for (const rel of impl.files) {
      const abs = resolveRel(rel)
      listed.add(abs)
      if (!statSync(abs, { throwIfNoEntry: false })?.isFile()) {
        errors.push(`${example.id}: missing file ${rel} (resolved ${path.relative(repo, abs)})`)
      }
    }
  }
}

for (const dir of SNIPPET_DIRS) {
  for (const abs of walk(path.join(examplesDir, dir))) {
    if (!listed.has(abs)) {
      errors.push(`unlisted snippet ${path.relative(repo, abs)} — add it to an example impl or delete it`)
    }
  }
}

const soonTargets = [
  path.join(examplesDir, 'manifest.ts'),
  path.join(repo, 'apps/site/src/components/DemoFrame.astro'),
  ...SNIPPET_DIRS.flatMap((dir) => walk(path.join(examplesDir, dir))),
]
const soon = /\bsoon\b/i
for (const abs of soonTargets) {
  const text = readFileSync(abs, 'utf8')
  if (soon.test(text)) errors.push(`${path.relative(repo, abs)}: contains "soon"`)
}

const svelteFiles = walk(path.join(examplesDir, 'svelte')).filter((f) => f.endsWith('.svelte'))
for (const abs of svelteFiles) {
  const text = readFileSync(abs, 'utf8')
  if (text.includes('$stores.')) errors.push(`${path.relative(repo, abs)}: $stores. is not a store auto-subscription — destructure the store first`)
  if (text.includes('setEditorFor')) errors.push(`${path.relative(repo, abs)}: setEditorFor is gone — set the editor store from on:ready`)
}

const require = createRequire(path.join(repo, 'packages/svelte/package.json'))
const { compile } = require('svelte/compiler')
for (const abs of svelteFiles) {
  const source = readFileSync(abs, 'utf8')
  try {
    compile(source, { filename: abs, generate: 'client' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`${path.relative(repo, abs)}: svelte compile failed\n${message}`)
  }
}

if (errors.length > 0) {
  console.error(`example snippet gate: ${errors.length} problem(s)\n`)
  for (const e of errors) console.error(`- ${e}\n`)
  process.exit(1)
}

console.log(`example snippet gate: ${EXAMPLES.length} examples, ${svelteFiles.length} svelte files compiled`)
