# @xenolithengine/graph-test-utils

jsdom test kit for [XenolithGraph](https://graph.xenolith.studio/) hosts — unit-test the editor
in vitest + jsdom even though jsdom has no WebGL.

It stubs the **browser boundary** (canvas 2D/WebGL contexts, `ResizeObserver`,
`requestAnimationFrame`), so the *real* editor boots: real `XenolithEditor.init`, real PIXI
renderer init, real command bus. Assert on the same code your users run.

## Usage

```ts
// @vitest-environment jsdom
import { renderEditorToDOM } from '@xenolithengine/graph-test-utils'

const { editor, unmount } = await renderEditorToDOM()
editor.registry.register({ /* schema */ })
const a = editor.insertNode('MyNode', { x: 0, y: 0 })!
const b = editor.insertNode('MyNode', { x: 200, y: 0 })!
editor.connect(a, 1, b, 0)
expect(editor.toJSON().edges).toHaveLength(1)
unmount()
```

- `mockPixi()` — install the browser-boundary stubs manually; `flushFrames()` runs queued rAF
  callbacks deterministically, `stats` introspects contexts handed out, `restore()` undoes
  everything. Install before the first editor boot in a test file (PIXI memoizes its
  WebGL-support probe per worker).
- `renderEditorToDOM(options)` — one-call real-editor mount; reuses an outer `mockPixi()` when
  present.
- `@xenolithengine/graph-test-utils/react` — `renderXenolithToDOM(props, { strictMode })`
  mounts the real `<XenolithGraph>` adapter via `react-dom/client` + `act()`.
- `@xenolithengine/graph-test-utils/fake` — headless `FakeEditor`: real core primitives
  (Graph, CommandBus, EventEmitter, NodeRegistry) for logic-level tests; no DOM needed.

Rendered pixels, hit-testing and pointer gestures still belong to Playwright e2e — the stubs
prove boot and state plumbing, not visuals.

Full guide: [Testing your integration](https://graph.xenolith.studio/guides/testing/).

MIT License © XenolithEngine
