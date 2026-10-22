#!/usr/bin/env node
// audit-stable-api.mjs — drift gate between STABLE-API.md and the shipped surfaces.
//
// For every package it collects the actual public surface (top-level exports from the
// entry modules the package.json `exports` map ships, plus public members of every
// exported class) from the shipped shape — built `dist/*.d.ts` for tsc packages,
// `src/*.ts` for source-shipped ones — then compares it against the names STABLE-API.md
// declares for that package. It also re-derives the event table from the runtime
// `EDITOR_EVENT_NAMES` and re-checks the `@internal` promises (stripped mutators stay
// stripped).
//
// Usage: node scripts/audit-stable-api.mjs
// Exit 1 when any invariant fails. The IGNORE_* sets below hold prose tokens vetted by
// hand against the shipped .d.ts; extend them only with a comment saying why.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = path.join(ROOT, 'STABLE-API.md');

// `entry` modules carry the export surface; `scan` globs the rest of the shipped
// sources for class-member shapes. Source-shipped packages (svelte, angular) scan src.
const PACKAGES = [
  { name: '@xenolithengine/graph-core', dir: 'packages/core', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-editor', dir: 'packages/editor', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-adapter-core', dir: 'packages/adapter-core', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-render-pixi', dir: 'packages/render-pixi', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-react', dir: 'packages/react', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-vue', dir: 'packages/vue', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-svelte', dir: 'packages/svelte', entry: ['src/index.ts', 'src/components.ts'], scan: 'src/*.ts' },
  { name: '@xenolithengine/graph-solid', dir: 'packages/solid', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-angular', dir: 'packages/angular', entry: ['src/index.ts'], scan: 'src/*.ts' },
  { name: '@xenolithengine/graph-wc', dir: 'packages/wc', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-theme-xen', dir: 'packages/theme-xen', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-theme-daylight', dir: 'packages/theme-daylight', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-theme-liquid-glass', dir: 'packages/theme-liquid-glass', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-plugin-autolayout', dir: 'packages/plugin-autolayout', entry: ['dist/index.d.ts', 'dist/adapters/dagre.d.ts', 'dist/adapters/elk.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-plugin-runtime', dir: 'packages/plugin-runtime', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-runtime-as', dir: 'packages/runtime-as', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
  { name: '@xenolithengine/graph-mcp-server', dir: 'packages/mcp-server', entry: ['dist/index.d.ts'], scan: 'dist/**/*.d.ts' },
];

// Bare doc tokens that are prose, payload keys, option names or MCP tool names —
// not TS identifiers. Every entry checked by hand against the shipped .d.ts.
const IGNORE_DOC_TOKENS = new Set([
  'v1', // xenolith.v1 format name
  'fn', 'opts', 'v', 'q', 'id', 'name', 'url', 'data', 'json', 'compute',
  'in', 'out', 'null', 'undefined', 'js', 'tag', 'screen', 'graph',
  'get_audit_log', 'find_nodes', 'auto_layout', // MCP tool names, not TS symbols
  'Editor', // bare "Editor" inside XenolithEditor prose
  // payload / option keys, params and host-shape prose in the doc tables
  'target', 'Promise', 'event', 'handler', 'doc', 'report', 'inferType', 'schemas',
  'idleTimeoutMs', 'onConnect', 'mirror', 'changes', 'state', 'nodeId', 'from', 'fromRef',
  'to', 'toRef', 'source', 'sourceHandle', 'targetHandle', 'predicate', 'controller',
  'clientId', 'mode', 'direction', 'spacing', 'fit', 'plugin', 'entries', 'approve',
  'reject', 'onChange', 'Directives', 'toObject', 'Blob', 'load', 'disable', 'grid',
  'resize', 'window', 'minimap', 'snap', 'next', 'updater', 'prev', 'props', 'ready',
  // 'props' = param name; 'ready' = the WC CustomEvent (not a TS symbol)
]);

function glob(dir, pattern) {
  const base = path.join(ROOT, dir);
  const re = new RegExp(
    '^' +
      pattern
        .replace(/[.\\+^$()|[\]{}]/g, '\\$&')
        .replace(/\*\*\//g, '(?:.*/)?')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*') +
      '$',
  );
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (re.test(path.relative(base, p))) out.push(path.relative(ROOT, p));
    }
  };
  walk(base);
  return out;
}

function parseFile(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exports = new Map(); // name -> kind
  const classMembers = new Map(); // class/interface name -> Set<member>
  const literalMembers = new Set(); // property names of every type-literal shape
  let hasInternalMarker = false;

  const visit = (node) => {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          exports.set(el.name.text, el.isTypeOnly ? 'type' : 're-export');
        }
      }
      return;
    }
    const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (isExported && (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableStatement(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node))) {
      const kind = ts.isClassDeclaration(node) ? 'class' : ts.isFunctionDeclaration(node) ? 'function' : ts.isInterfaceDeclaration(node) ? 'interface' : ts.isTypeAliasDeclaration(node) ? 'type' : ts.isEnumDeclaration(node) ? 'enum' : 'const';
      const names = [];
      if (ts.isVariableStatement(node)) {
        for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text);
      } else if (node.name) {
        names.push(node.name.text);
      }
      for (const n of names) exports.set(n, kind);
      if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name) {
        const members = new Set();
        for (const mem of node.members) {
          if (mem.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword)) continue;
          let n;
          if ((ts.isMethodDeclaration(mem) || ts.isPropertyDeclaration(mem) || ts.isGetAccessorDeclaration(mem) || ts.isSetAccessorDeclaration(mem) || ts.isMethodSignature(mem) || ts.isPropertySignature(mem)) && ts.isIdentifier(mem.name)) {
            n = mem.name.text;
          }
          if (n && !n.startsWith('#')) members.add(n);
        }
        classMembers.set(node.name.text, members);
      }
    }
    if (ts.isTypeLiteralNode(node)) {
      for (const mem of node.members) {
        if (ts.isPropertySignature(mem) && ts.isIdentifier(mem.name)) literalMembers.add(mem.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (/^\s*\*\s*@internal/m.test(text)) hasInternalMarker = true;
  return { exports, classMembers, literalMembers, hasInternalMarker };
}

function surfaceFor(pkg) {
  const exports = new Map();
  const classMembers = new Map(); // exported classes/interfaces only
  const allMembers = new Set(); // members of every parsed class/interface/type-literal
  const notes = [];
  for (const f of glob(pkg.dir, pkg.scan)) {
    const s = parseFile(f);
    for (const [c, m] of s.classMembers) {
      classMembers.set(c, new Set([...(classMembers.get(c) ?? []), ...m]));
      for (const n of m) allMembers.add(n);
    }
    for (const n of s.literalMembers) allMembers.add(n);
    if (s.hasInternalMarker) notes.push(`@internal marker still present in ${f}`);
  }
  for (const e of pkg.entry) {
    const s = parseFile(path.join(pkg.dir, e));
    for (const [n, k] of s.exports) exports.set(n, k);
  }
  for (const [c, m] of classMembers) if (!exports.has(c)) classMembers.delete(c);
  return { exports, classMembers, allMembers, notes };
}

// Doc token extraction -----------------------------------------------------------

const BACKTICK = /`([^`\n]+)`/g;
const CHAIN = /[$A-Za-z_][\w$]*(?:\.[$A-Za-z_][\w$]*)*/g;

function docTokens(text) {
  const tokens = new Set();
  for (const m of text.matchAll(BACKTICK)) {
    const span = m[1];
    if (/[:/]/.test(span)) continue; // events, paths, urls
    if (span.startsWith('.') || span.startsWith('@')) continue; // relative paths, package names
    if (/^v?\d/.test(span)) continue; // versions
    if (/^[\w.-]+@[\^~]?[\d]/.test(span)) continue; // dependency specs (pixi.js@^8.6.0)
    for (const c of span.matchAll(CHAIN)) {
      const last = c[0].split('.').pop();
      if (IGNORE_DOC_TOKENS.has(last)) continue;
      tokens.add(last);
    }
  }
  return tokens;
}

function docEventNames(eventsText) {
  return [...eventsText.matchAll(/^\| `([\w:-]+)` \|/gm)].map((m) => m[1]);
}

// Doc sections -------------------------------------------------------------------

function docSections(text) {
  const stableStart = text.indexOf('## Stable');
  const eventsStart = text.indexOf('## Events');
  const internalStart = text.indexOf('## @internal');
  const expStart = text.indexOf('## Experimental');
  if (stableStart < 0 || eventsStart < 0 || expStart < 0) throw new Error('STABLE-API.md sections not found');
  return {
    stable: text.slice(stableStart, eventsStart),
    events: text.slice(eventsStart, internalStart),
    internal: text.slice(internalStart, expStart),
    experimental: text.slice(expStart),
  };
}

// package -> stable-section text: `### \`pkg\`` headers (ended by ANY next heading)
// plus Framework/Themes/Plugins table rows keyed by package name.
function packageDocText(stable) {
  const map = new Map();
  const anyHeading = /^###? /gm;
  const pkgHeader = /^### `(@xenolithengine\/[\w-]+)`/gm;
  const heads = [...stable.matchAll(anyHeading)];
  for (const m of stable.matchAll(pkgHeader)) {
    const next = heads.filter((h) => h.index > m.index).sort((a, b) => a.index - b.index)[0];
    const end = next ? next.index : stable.length;
    map.set(m[1], stable.slice(m.index, end));
  }
  for (const m of stable.matchAll(/^\| `(@xenolithengine\/[\w-]+)` \|/gm)) {
    const row = stable.slice(m.index, stable.indexOf('\n', m.index));
    map.set(m[1], (map.get(m[1]) ?? '') + '\n' + row);
  }
  return map;
}

// Main ----------------------------------------------------------------------------

const text = fs.readFileSync(DOC, 'utf8');
const sections = docSections(text);
const pkgDoc = packageDocText(sections.stable);
const docEvents = docEventNames(sections.events);
const globalTokens = docTokens(text);

const failures = [];

// global union of every package's exports + members, for the "shipped elsewhere" bucket
const GLOBAL = new Map(); // name -> list of "pkg:name" origins
const surfaces = new Map();
for (const pkg of PACKAGES) {
  const s = surfaceFor(pkg);
  surfaces.set(pkg.name, s);
  for (const n of s.exports.keys()) GLOBAL.set(n, [...(GLOBAL.get(n) ?? []), pkg.name]);
  for (const n of s.allMembers) GLOBAL.set(n, [...(GLOBAL.get(n) ?? []), `${pkg.name}#member`]);
}

console.log('# STABLE-API drift audit\n');

for (const pkg of PACKAGES) {
  const surface = surfaces.get(pkg.name);
  for (const n of surface.notes) failures.push(`${pkg.name}: ${n}`);

  const declared = pkgDoc.get(pkg.name);
  const tokens = declared ? docTokens(declared) : new Set();
  const exportNames = new Set(surface.exports.keys());

  // exports never mentioned anywhere in the doc vs mentioned only outside the package section
  const appearsAnywhere = text.includes(pkg.name);
  const nowhere = [...exportNames].filter((n) => !globalTokens.has(n) && !declared?.includes(n));
  const elsewhere = [...exportNames].filter((n) => !nowhere.includes(n) && !tokens.has(n));

  // doc names missing from the shipped surface (own package first, then the global union)
  const missing = [];
  const shippedElsewhere = [];
  for (const n of tokens) {
    if (surface.exports.has(n) || surface.allMembers.has(n)) continue;
    const origins = (GLOBAL.get(n) ?? []).filter((o) => !o.startsWith(pkg.name));
    if (origins.length) shippedElsewhere.push(`${n} (ships from ${origins.join(', ')})`);
    else missing.push(n);
  }

  console.log(`## ${pkg.name} — ${exportNames.size} exports, ${surface.allMembers.size} public members`);
  if (!declared) console.log(`  (no Stable section: ${appearsAnywhere ? 'package appears only in Experimental / other sections' : 'package name never appears in STABLE-API.md at all'})`);
  if (nowhere.length) console.log(`  exported but never declared anywhere in STABLE-API.md: ${nowhere.map((n) => `${n}(${surface.exports.get(n)})`).join(', ')}`);
  if (elsewhere.length) console.log(`  declared only outside own section: ${elsewhere.join(', ')}`);
  if (shippedElsewhere.length) console.log(`  declared in this section but shipped from another package: ${shippedElsewhere.join(', ')}`);
  if (missing.length) console.log(`  DECLARED IN DOC BUT NOT FOUND ANYWHERE IN CODE: ${missing.join(', ')}`);
  if (!nowhere.length && !elsewhere.length && !missing.length && !shippedElsewhere.length) console.log('  ok');
  console.log('');

  if (missing.length) failures.push(`${pkg.name}: doc declares symbols missing from code: ${missing.join(', ')}`);
  if (!declared && appearsAnywhere) failures.push(`${pkg.name}: no own Stable section (Experimental mention only — ${nowhere.length} exports undeclared)`);
  if (!declared && !appearsAnywhere) failures.push(`${pkg.name}: completely absent from STABLE-API.md (${nowhere.length} undocumented exports)`);
}

// Events: doc table vs the runtime list adapters derive from.
const adapterCore = await import(path.join(ROOT, 'packages/adapter-core/dist/index.js'));
const runtimeEvents = adapterCore.EDITOR_EVENT_NAMES;
console.log(`## Events — doc table ${docEvents.length} vs EDITOR_EVENT_NAMES ${runtimeEvents.length}`);
const evMissingDoc = runtimeEvents.filter((e) => !docEvents.includes(e));
const evMissingCode = docEvents.filter((e) => !runtimeEvents.includes(e));
if (evMissingDoc.length) { console.log(`  in EDITOR_EVENT_NAMES but not in the doc table: ${evMissingDoc.join(', ')}`); failures.push(`events missing from doc table: ${evMissingDoc.join(', ')}`); }
if (evMissingCode.length) { console.log(`  in the doc table but not in EDITOR_EVENT_NAMES: ${evMissingCode.join(', ')}`); failures.push(`doc events missing from EDITOR_EVENT_NAMES: ${evMissingCode.join(', ')}`); }
if (!evMissingDoc.length && !evMissingCode.length) console.log('  ok');
console.log('');

// @internal promises: these must stay OUT of the shipped surfaces.
const editorClass = surfaces.get('@xenolithengine/graph-editor').classMembers.get('XenolithEditor') ?? new Set();
for (const n of ['app', 'commandBus', 'graph', 'requestRender', 'renderedNodePosition', 'isNodeRendered', 'renderedNodeCount']) {
  if (editorClass.has(n)) failures.push(`@internal leak: editor.${n} is still a public member of XenolithEditor in the shipped surface`);
}
const pixiExports = surfaces.get('@xenolithengine/graph-render-pixi').exports;
for (const n of ['markPinInteractive', 'readPinHandle', 'clearGlowTextureCache', 'clearGradientCache']) {
  if (pixiExports.has(n)) failures.push(`@internal leak: ${n} is still exported from graph-render-pixi`);
}
const leakedMutators = [...(surfaces.get('@xenolithengine/graph-core').classMembers.get('Graph') ?? [])].filter((m) => m.startsWith('_'));
if (leakedMutators.length) failures.push(`@internal leak: Graph still ships underscore mutators: ${leakedMutators.join(', ')}`);
console.log('## @internal — editor internals, pixi helpers, Graph mutators');
console.log(failures.some((f) => f.includes('@internal leak')) ? '  FAIL (see below)' : '  ok (all stripped)');

console.log(`\n${failures.length} failure(s).`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
