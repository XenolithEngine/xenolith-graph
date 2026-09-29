# Adapter Contract — what every framework adapter must ship

**Status:** accepted 2026-09-29 (Track A1). **Reference implementation:** `packages/react`.
**First parity target:** `packages/vue` (A2). Later: Svelte → Angular → Solid → Web Components v2.

This document is the yardstick. An adapter is "done" when every section below is satisfied and
enforced by tests — "заявлен = работает и задокументирован": if a Learn page claims it, a test
proves it. The React adapter defines the semantics; each adapter only changes the idiom
(`onNodeClick` prop vs `@node-click` emit vs `<xenolith-graph>` attribute event).

## 0. Foundation rules (all adapters)

1. Build on `@xenolithengine/graph-adapter-core` — `createEditorBinding()` for lifecycle,
   `EDITOR_EVENT_NAMES` for the event surface, `XenolithProps` for props, `applyProps` for the
   diff. Never hand-list events or props in an adapter; derive from these (the core list is
   exhaustiveness-checked against `EditorEvents` at compile time).
2. Peer dependencies only: the framework, `pixi.js`, `@xenolithengine/graph-editor`. No new
   runtime dependencies — an adapter that needs one is doing mount/lifecycle work outside
   adapter-core; move that work into adapter-core instead.
3. Semantics are React's semantics: reference-diff for props (a new object reference = change),
   commit-time events only (no per-frame), editor-owned drag (ADR 0006).
4. Client-only. SSR renders nothing (WebGL); document the framework's client-gate idiom
   (`'use client'` / `<ClientOnly>` / `onMount` / `browser` check).

## 1. Mount component

One idiomatic top-level mount: `<XenolithGraph>` (React/Vue), the framework's closest equivalent
elsewhere (Svelte action, Solid component, Angular directive, custom element).

- [ ] Accepts **all nine** `XenolithProps` keys as framework props: `theme`, `graph`,
      `zoomBounds`, `minimap`, `disableGrid`, `snap`, `resizeToWindow`, `fitOnLoad`,
      `isValidConnection` — declared AND kept in sync on change (→ `binding.setProps`).
      A prop declared but not watched is a silent bug (Vue `resizeToWindow`, fixed in A2).
- [ ] Ready signal fires once with the editor instance (`onReady` / `@ready` / callback prop).
- [ ] Every `EDITOR_EVENT_NAMES` event is re-exposed idiomatically **with typed payloads**
      (React: `EventCallbacks` from `events-map.ts`; Vue: typed emits object). A plain string
      array of emit names gives template users `any` — not acceptable.
- [ ] Lifecycle safety: unmount destroys the binding; async-init/double-mount races handled
      (React serializes through a module-level promise chain for StrictMode; Vue relies on
      `onUnmounted` ordering). If the framework can remount the same host, init and teardown
      must not interleave.
- [ ] Overlay children: in-editor components (§3) must work as children/slot content of the
      mount component.

## 2. Composables / hooks

Framework-idiomatic access to the editor. Names below are the React names; each adapter uses the
framework's naming convention (`useX` React/Vue/Solid, `createX` Svelte-runes, DI service Angular).

Editor access:
- [ ] `useEditor()` — strict: throws outside the mount subtree.
- [ ] Lenient variant (`useXenolithEditor()` / `useEditorOrNull()`) — tombstone instead of throw.
- [ ] `useEditorReady(cb)` or framework equivalent — one-shot setup when the editor mounts,
      optional cleanup return. (React's equivalent is structural: children render only after the
      editor exists, so `useEditor()` is already non-null there.)
- [ ] `useEditorEvent(event, handler)` — single-event subscribe, auto-rebind on editor swap,
      cleanup on unmount, latest-closure semantics (no stale handlers).
- [ ] Headless mount hook: `useXenolith(hostRef, props)` / `useXenolithGraph(...)` — mount into
      any ref without the component tree; keeps props synced; destroys on unmount.

Store hooks (read side; identity-stable snapshots, microtask-coalesced event bursts):
- [ ] `useNodes()` / `useEdges()` / `useSelection()` / `useViewport()` / `useGraphJSON()` —
      same event lists as React (`NODE_EVENTS`, `EDGE_EVENTS`, `GRAPH_EVENTS` in the adapter's
      hooks module; do not invent per-adapter lists).
- [ ] `useUndoRedo()` — `{ canUndo, canRedo }` reactive state + stable `undo()`/`redo()` handles.
      The underlying store hook must be created at module level, never inside the composable
      body (React got this wrong until A1 — hooks created per-call defeat lint and caching).

Controlled state (ADR 0006):
- [ ] `useNodesState()` — the triple: `{ nodes, edges }` mirror folded from commit-time
      `graph:changed` arrays via `reduceGraphChanges`; `applyChanges(changes)` forwarding to
      `editor.applyChanges` (idempotent for echoes); `setNodes(next | updater)` — one-shot
      shallow diff (position by coordinates, state by reference) applied as ONE undo step,
      with the `graph:changed` echo updating the mirror. No per-frame position updates — the
      renderer owns the drag; positions land at commit.

Return shapes are framework-idiomatic: React returns plain values; Vue returns
`Readonly<ShallowRef<T>>`. The VALUES and WHEN they change are the contract.

## 3. In-editor components

Five primitives, portalled/teleported into `editor.chrome.overlayRoot`, themed by the active
theme's `--xeno-*` vars:

- [ ] `XenolithPanel` — absolute anchor, six positions, `bare` drops card chrome.
- [ ] `XenolithButton` — themed button, `active` accent state, forwards native attrs/events.
- [ ] `XenolithControls` — declarative `chrome.setControls`; unmount → `setControls(false)`;
      option changes re-apply.
- [ ] `XenolithMiniMap` — declarative minimap on/position; unmount → hidden.
- [ ] `XenolithProposalQueue` — declarative `chrome.showProposals()`; no propose-mode session →
      silent no-op; unmount → hidden.

## 4. Custom-widget wrapper

- [ ] `reactWidget` / `vueWidget` / `<fw>Widget(Component) → DomWidgetController` bridging a
      framework component into `editor.registerWidget`.
- [ ] `WidgetProps` shape identical across adapters: `value`, `setValue`, `openSidebar`,
      `accent`, `text`, `muted`, `width`, `height`. Mount once per widget instance; updates
      mutate props in place (no remount/flicker).

## 5. Tests (parity is enforced by tests, not hope)

- [ ] Mount: props forwarded to the binding; events re-emitted with idiomatic names;
      `setProps` called when a prop changes — **test every mutable prop, including
      `resizeToWindow` and `isValidConnection`**; destroy on unmount.
- [ ] Store hooks: each hook reflects its triggering events (mirror React's
      `packages/react/src/hooks.test.tsx` suite in the framework's test idiom).
- [ ] Controlled triple: integration test against the real editor (mirror
      `packages/test-utils/src/use-nodes-state.test.tsx`) — commit-time fold, one-undo-step
      `setNodes`, add+remove in one call, echo convergence.
- [ ] Components + widget wrapper: portal targets, declarative on/off, prop bridging.
- [ ] Everything runs in CI via the repo-wide `pnpm -r test` — no adapter-local-only checks.

## 6. Docs

- [ ] Learn page on the site (`apps/site/src/content/docs/guides/<fw>.mdx` + `ru/` + `zh/`
      mirrors — keep locales in sync): install, mount, props table, events, composables,
      in-editor components, custom widgets, SSR note, "what's NOT in this adapter"
      (no `v-model`/`nodes=` whole-graph mode — ADR 0006).
- [ ] Package README (short, links to the Learn page).
- [ ] New surface appears in `CHANGELOG.md` `[Unreleased]`.

## Current status

| Adapter | Mount | Props (9/9) | Typed events | Hook set | `useNodesState` | Components | Widget | Learn page |
|---|---|---|---|---|---|---|---|---|
| React | ✅ StrictMode-safe | ✅ | ✅ `EventCallbacks` | ✅ full | ✅ | ✅ ×4 + Queue | ✅ | ✅ |
| Vue | ✅ | ✅ (A2 done) | ✅ typed emits (A2) | ✅ full (A2: `useXenolithGraph`) | ✅ (A2) | ✅ ×4 + Queue | ✅ | ✅ (A2: controlled pattern + mount composable) |
| Svelte | ✅ action | ✅ via action param | ✅ typed `on:*` attrs (A3) | ✅ stores (A3) | ✅ `nodesState()` (A3) | ⏳ next slice (.svelte source + compiler devDep) | ⏳ same slice | ✅ (A3) |
| Angular | ✅ BYO host component (A4) | ✅ mount(props) (A4) | ✅ typed `on$()` (A4) | ✅ service observables (A4) | ✅ `nodesState()` (A4) | ✗ via `editor.chrome` (by design) | ✗ | ✅ (A4) |
| Solid | ✅ directive (A5) | ✅ via bound accessor (A5) | ✅ colon `on:` + `JSX.Directives` typing (A5) | ✅ signal bag (A5) | ✅ `nodesState()` (A5) | ✗ via `editor.chrome` | ✗ | ✅ (A5) |
| WC | ✅ custom element (A6) | ✅ attr dict 5 + JS props 4 (A6) | ✅ all 25 + `ready` CustomEvents (A6) | n/a (DOM: no hooks — imperative `el.editor`) | n/a (host framework's job) | ✗ via `editor.chrome` | ✗ | ✅ (A6) |

Svelte's "components + widget" slice requires shipping `.svelte` source and compiling components
in tests (`@sveltejs/vite-plugin-svelte` as a test-only devDep — pending owner approval per the
new-dependency rule). The runtime surface above is complete and covered by tests.

Angular will never ship components by that route either: its "mount component" is deliberately
**bring-your-own** — a decorator-free `XenolithGraphService` (plain-class DI + RxJS) with the
host-side component recipe documented on the Learn page. Angular library components require
ng-packagr partial compilation; raw decorator classes break every AOT consumer (the old shipped
`XenolithGraphComponent` was exactly that landmine, removed in A4).

WC parity is its own shape by design (§0: adapters are framework-idiomatic, and DOM has no
hooks): full attribute/event dictionary + imperative handle. Reactive store sets and the
controlled triple are the HOST framework's adapter's job — the WC hands over the editor via
`ready` + `el.editor`.

Stubs become "claimed" only when their column is ✅ across this checklist — until then the docs
must not claim parity (F3 truth-pass rule).
