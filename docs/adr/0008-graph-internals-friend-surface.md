# ADR 0008 — `Graph` internals friend surface (stripInternal for core)

Date: 2026-09-29 · Status: accepted (implemented in Track M / tranche 2)

## Context

Every package in the monorepo compiles with `stripInternal: true` — `@internal`-marked members
vanish from the shipped `.d.ts` — **except `graph-core`**. The reason: the editor's command bus
applies commands through `Graph._addNode/_addEdge/_patchNode/…` (10 underscore mutators, already
carrying `@internal` markers in source), and the editor is a *separate package* that typechecks
against core's declarations. Stripping the members would break the editor's build; not stripping
leaks the whole mutation surface to every host.

STABLE-API has documented this exception — and named the friend-interface refactor as future
work — since the G1 API-freeze pass.

## Decision

1. **Export a `GraphInternals` interface** from `@xenolithengine/graph-core` describing the
   complete 10-method command-bus mutation surface (`_addComment`, `_removeComment`,
   `_patchComment`, `_addNode`, `_removeNode`, `_addEdge`, `_removeEdge`, `_patchNode`,
   `_setNodePins`, `_setNodeWidgets`).
2. **One public accessor on `Graph`: `internals(): GraphInternals`** — returns `this`. The
   concrete underscore members stay `@internal` and are now STRIPPED from the class in the
   shipped `.d.ts`; the friend interface survives (it is not `@internal`) and is the only
   typechecked path to the surface. `class Graph implements GraphInternals` locks conformance
   inside core at compile time.
3. **`stripInternal: true` in core's tsconfig** — core joins every other package.

## Consequences

- **Editor bus migrates** from `graph._addNode(…)` to `graph.internals()._addNode(…)` (14 call
  sites in `editor/src/index.ts` + `subgraph.ts`). Fully typechecked: renaming or re-signaturing
  a surface member now breaks the editor's build through the interface — a compile-time drift
  lock that did not exist before (the unstripped members were checked, but nothing tied the
  editor to an explicit contract).
- **Host reachability is unchanged in kind** — `graph._addNode()` was always public in the
  shipped types; now it is `graph.internals()._addNode()`. One more hop, same determined-host
  reach. What changes is hygiene: the class surface is clean, the surface is NAMED, documented
  as reserved for the in-repo bus, and listed in STABLE-API under core as "not for hosts —
  mutate through commands / `editor.applyChanges`".
- **Future `@internal` markers in core now actually strip** — the G1 hygiene finally applies to
  the zero-dependency package where it matters most.
- Alternatives rejected:
  - *Keep the status quo* — core's public surface keeps leaking the mutation backdoor.
  - *Editor-local structural mirror + `as unknown` cast* — breaks entirely under stripping
    (the class type loses the members, assignment fails), and a blind cast loses drift-checking.
  - *Brand/token gating (true "friend" secrecy)* — TS has no module-private construct that
    core could grant to the editor but not hosts; a branded token must be exported to be
    usable cross-package, which grants it to everyone anyway. The named-surface accessor is
    the honest approximation.
