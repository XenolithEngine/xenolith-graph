// Vanilla example loader — one entry per id, lazy-imported so the bundle stays per-page.
// New vanilla demos: drop a file in ./vanilla/<id>.ts exporting `mount(target): Promise<dispose>`
// and add a row to MAP below. The site's per-example page picks the mount by id and listens for
// the `xeno:reset` event (the gallery's "Reset preview" button) to tear down + re-mount.

type Mount = (target: HTMLElement) => Promise<() => void>
const MAP: Record<string, () => Promise<{ mount: Mount }>> = {
  'auto-layout':   () => import('./vanilla/auto-layout.ts'),
  'nested-layout':    () => import('./vanilla/nested-layout.ts'),
  'type-conversions': () => import('./vanilla/type-conversions.ts'),
  'preview-nodes':    () => import('./vanilla/preview-nodes.ts'),
  'edge-paths':         () => import('./vanilla/edge-paths.ts'),
  'properties-sidebar': () => import('./vanilla/properties-sidebar.ts'),
  'breadcrumb-dive':    () => import('./vanilla/breadcrumb-dive.ts'),
  'conditional-widgets': () => import('./vanilla/conditional-widgets.ts'),
  'palette-sidebar':    () => import('./vanilla/palette-sidebar.ts'),
  'mobile-touch':       () => import('./vanilla/mobile-touch.ts'),

  // Framework-adapter mounts: same router, prefixed by framework key. The per-example page's
  // host script picks `svelte-${id}` / `solid-${id}` when those framework tabs are active.
  'svelte-mount':                () => import('./vanilla/svelte-mount.ts'),
  'svelte-events':               () => import('./vanilla/svelte-events.ts'),
  'svelte-save-restore':         () => import('./vanilla/svelte-save-restore.ts'),
  'svelte-properties-sidebar':   () => import('./vanilla/svelte-properties-sidebar.ts'),
  'svelte-palette-sidebar':      () => import('./vanilla/svelte-palette-sidebar.ts'),
  'solid-mount':                 () => import('./vanilla/solid-mount.ts'),
  'solid-events':                () => import('./vanilla/solid-events.ts'),
  'solid-save-restore':          () => import('./vanilla/solid-save-restore.ts'),
  'solid-properties-sidebar':    () => import('./vanilla/solid-properties-sidebar.ts'),
  'solid-palette-sidebar':       () => import('./vanilla/solid-palette-sidebar.ts'),
}

export function hasVanilla(id: string): boolean { return id in MAP }

export async function mountVanillaExample(id: string, target: HTMLElement): Promise<() => void> {
  const loader = MAP[id]
  if (!loader) {
    target.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#9a9a9a;font:13px Inter;">No vanilla implementation yet for this example.</div>'
    return () => {}
  }
  const mod = await loader()
  return mod.mount(target)
}
