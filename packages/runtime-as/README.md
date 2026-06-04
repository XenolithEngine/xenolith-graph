# @xenolith/runtime-as

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

AssemblyScript-based WASM code generator for the XenolithGraph Blueprint runtime. Emits AS source from an `RtGraph` + `NodeDef` set, compiles to a WebAssembly module via `asc`, exposes the same call surface as the JS codegen.

> **Experimental** — supports the numeric subset only (`canCompileToAS(graph)` gates eligibility). Non-numeric primitives fall back to `@xenolith/plugin-runtime`'s JS codegen.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolith/runtime-as @xenolith/plugin-runtime
```

Requires `assemblyscript` at compile time (the package builds the WASM module in-process).

## Usage

```ts
import { compile, canCompileToAS } from '@xenolith/runtime-as'
import { BUILTIN_PRIMITIVES, type RtGraph } from '@xenolith/plugin-runtime'

if (canCompileToAS(myGraph)) {
  const wasm = await compile(myGraph, BUILTIN_PRIMITIVES)
  wasm.setVar('x', 0.3)
  wasm.tick()                     // executes the WASM module
  console.log(wasm.getVar('y'))
  if (wasm.tickArgs) console.log(wasm.tickArgs(0.3, 0.6))  // ~2× faster on hot loops
}
```

`wasm.wasm` and `wasm.source` are exposed for inspection — the raw bytes and the generated AS source.

## What's exported

- `compile(graph, defs)` → `Promise<ASWasmGraph>` — emit + compile + instantiate
- `canCompileToAS(graph)` — gate for eligibility (numeric primitives only)
- `emitASSource(graph, defs)` — generate AS source without compiling
- `compileAS(source)` — compile a hand-authored AS source string
- `ASWasmGraph` — `{ tick, getVar, setVar, reset, tickArgs?, wasm, source }`

## Docs

- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
