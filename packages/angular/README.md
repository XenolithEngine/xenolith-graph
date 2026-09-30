# @xenolithengine/graph-angular

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Angular adapter for XenolithGraph — the decorator-free `XenolithGraphService` (DI + RxJS).

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Why a service, not a component

Angular libraries that ship components must be partially compiled (ng-packagr /
`@angular/compiler-cli`). A decorator class compiled by plain tooling has no `ɵcmp` and throws
*"is not a component"* in every default (AOT) consumer build — which is exactly what the old
shipped `XenolithGraphComponent` was. The adapter is now decorator-free: a plain class Angular's
DI injects as-is, with RxJS as the reactive surface. Your app compiles the thin host component
(the guide ships the exact recipe).

## Install

```bash
pnpm add @xenolithengine/graph-angular pixi.js
```

Peer deps: `rxjs >= 7`, `pixi.js@^8.6.0`. Works with Angular 17+ (the service itself imports
zero Angular APIs). WebGL/client-only.

## Usage

```ts
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'

@Component({
  selector: 'app-editor',
  standalone: true,
  providers: [XenolithGraphService], // per-editor instance
  template: '<div #host style="display:block;width:100%;height:100vh"></div>',
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit() {
    const editor = await this.graph.mount(this.host().nativeElement, { minimap: true })
    editor.view.fitView()
    this.graph.on$('node:click').subscribe((p) => console.log(p.nodeId))
  }

  ngOnDestroy() { this.graph.destroy() }
}
```

## What's exported

- `XenolithGraphService` — DI service (decorator-free): `mount(host, props)` / `destroy()` / `editor`
- Reactive surface: `editor$`, `nodes$`, `edges$`, `selection$`, `viewport$`, `graphJSON$`, `canUndo$` / `canRedo$`, `undo()` / `redo()`, typed `on$('node:click')` for all 25 editor events
- `nodesState()` — controlled state (ADR 0006): `nodes$` / `edges$` mirror folded from commit-time `graph:changed`, `applyChanges`, `setNodes` / `setEdges` (one undo step each)
- `XenolithNodesState` — return type of `nodesState()`

## Docs

- [Angular guide](https://graph.xenolith.studio/guides/angular/) — mount recipe, reactive surface, controlled state
- [API reference](https://graph.xenolith.studio/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
