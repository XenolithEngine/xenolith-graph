// Vanilla chapter loader — mirrors examples/VanillaMount.ts but scoped to /learn tutorial.
type Mount = (target: HTMLElement) => Promise<() => void>
const MAP: Record<string, () => Promise<{ mount: Mount }>> = {
  '01-mount':           () => import('./vanilla/01-mount.ts'),
  '02-register-schema': () => import('./vanilla/02-register-schema.ts'),
  '03-connect-edges':   () => import('./vanilla/03-connect-edges.ts'),
  '04-widgets':         () => import('./vanilla/04-widgets.ts'),
  '05-events':          () => import('./vanilla/05-events.ts'),
  '06-save-load':       () => import('./vanilla/06-save-load.ts'),
  '07-run-graph':       () => import('./vanilla/07-run-graph.ts'),
  '08-make-it-yours':   () => import('./vanilla/08-make-it-yours.ts'),
}

export async function mountVanillaChapter(id: string, target: HTMLElement): Promise<() => void> {
  const loader = MAP[id]
  if (!loader) {
    target.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#9a9a9a;font:13px Inter;">No vanilla implementation yet for this chapter.</div>'
    return () => {}
  }
  const mod = await loader()
  return mod.mount(target)
}
