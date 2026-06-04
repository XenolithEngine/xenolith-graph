# @xenolithengine/graph-angular

[![BETA](https://img.shields.io/badge/status-BETA-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph#status)
[![MIT](https://img.shields.io/badge/license-MIT-FCB400?style=flat-square)](https://github.com/XenolithEngine/xenolith-graph/blob/main/LICENSE)

Angular adapter for XenolithGraph — standalone `<xenolith-graph>` component.

> **Beta** — public API in `STABLE-API.md` is the surface we plan to freeze, but it is **NOT frozen yet** — breaking changes can land at any point before v1.0. If you adopt now, pin an exact version.

Part of [XenolithGraph](https://github.com/XenolithEngine/xenolith-graph) — an AI-native, embeddable node-graph editor for the web with its own visual design language (Xen).

## Install

```bash
pnpm add @xenolithengine/graph-angular pixi.js rxjs
```

Peer deps: `@angular/core >= 17`, `rxjs >= 7`, `pixi.js@^8.6.0`. WebGL/client-only.

## Usage

```ts
import { Component } from '@angular/core'
import { XenolithGraphComponent } from '@xenolithengine/graph-angular'
import type { XenolithEditor } from '@xenolithengine/graph-editor'

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [XenolithGraphComponent],
  template: `
    <xenolith-graph
      [graph]="savedGraph"
      [minimap]="true"
      (ready)="onReady($event)"
      (nodeClick)="onNodeClick($event)"
      style="display:block;width:100%;height:100vh"
    ></xenolith-graph>
  `,
})
export class EditorComponent {
  savedGraph = /* … */ null
  onReady(editor: XenolithEditor) { editor.fitView() }
  onNodeClick(p: { nodeId: string }) { console.log(p.nodeId) }
}
```

## What's exported

- `XenolithGraphComponent` — standalone component with inputs `theme`, `graph`, `zoomBounds`, `minimap`, `disableGrid`, `snap`, `resizeToWindow`, `fitOnLoad`
- Outputs: `ready`, `nodeAdded`, `nodeRemoved`, `nodeMoved`, `nodeClick`, `edgeConnected`, `edgeDisconnected`, `selectionChanged`, `viewportChanged`, `widgetChanged`, `widgetAction`, `graphLoaded`, `historyChanged`
- `angularOutputName(event)` — colon → camelCase translation

## Docs

- [API reference](https://xenolithengine.github.io/xenolith-graph/guides/api/) — every method exposed by `XenolithEditor`
- [GitHub](https://github.com/XenolithEngine/xenolith-graph)

MIT © XenolithEngine
