// Regenerates the test-count numbers in README.md (badge + Tests section) from the actual
// suites, so the advertised counts can't drift from reality. Run: node scripts/update-test-counts.mjs
//   - unit  = Σ `vitest list` across every workspace package/app that ships *.test.ts (excl. playground e2e)
//   - e2e   = `playwright test --list --project=chromium` unique cases in apps/playground
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const sh = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

// A workspace dir counts when `pnpm -r run test` would actually run its suite — the test
// script is the single source of truth (file-location heuristics miss nested test dirs).
const hasTestScript = (dir) => {
  try { return Boolean(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts?.test) }
  catch { return false }
}

const workspaceDirs = [
  ...readdirSync(join(ROOT, 'packages')).map((p) => join(ROOT, 'packages', p)),
  ...readdirSync(join(ROOT, 'apps')).map((a) => join(ROOT, 'apps', a)),
]

let unit = 0
for (const dir of workspaceDirs) {
  if (!hasTestScript(dir)) continue
  const out = sh('npx vitest list', dir)
  const n = out.split('\n').filter((l) => l.trim().length > 0 && !l.startsWith('Total:')).length
  console.log(`  ${dir.replace(ROOT + '/', '')}: ${n}`)
  unit += n
}

const e2eOut = sh('npx playwright test --list --project=chromium', join(ROOT, 'apps/playground'))
const e2e = Number(/Total: (\d+) tests/.exec(e2eOut)?.[1] ?? 0)

const readmePath = join(ROOT, 'README.md')
let readme = readFileSync(readmePath, 'utf8')
const before = readme
readme = readme.replace(
  /badge\/tests-\d+%20unit%20%C2%B7%20\d+%20e2e-/,
  `badge/tests-${unit}%20unit%20%C2%B7%20${e2e}%20e2e-`,
)
readme = readme.replace(/\*\*\d+ unit tests\*\*/, `**${unit} unit tests**`)
readme = readme.replace(/\*\*\d+ interaction tests\*\*/, `**${e2e} interaction tests**`)
if (readme === before) { console.error('no test-count placeholders matched — README format changed?'); process.exit(1) }
writeFileSync(readmePath, readme)
console.log(`README updated: ${unit} unit · ${e2e} e2e`)
