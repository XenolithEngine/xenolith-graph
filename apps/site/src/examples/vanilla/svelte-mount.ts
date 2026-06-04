// Svelte adapter — mount. The idiomatic Svelte surface is `<div use:xenolith={props}>`; for
// programmatic setup (registering schemas, framing) we use the imperative `createXenolithGraph`
// primitive the adapter exposes alongside the action. This mount runs on the site under a
// vanilla loader because the per-example router boots Svelte demos as plain TS.
import { createXenolithGraph } from '@xenolithengine/svelte'
import { buildMount } from '@xenolithengine/demo/mount'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  buildMount(binding.editor)
  return () => { binding.destroy(); slot.remove() }
}
