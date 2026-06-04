// Solid adapter — mount. Idiomatic Solid surface is `<div use:xenolith={props} />` (the directive
// re-dispatches events with colon names: `on:node:click`). For programmatic editor access we use
// the parallel imperative primitive `createXenolithGraph`, which the adapter exposes alongside the
// directive — the caller owns teardown.
import { createXenolithGraph } from '@xenolith/solid'
import { buildMount } from '@xenolith/demo/mount'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  buildMount(binding.editor)
  return () => { binding.destroy(); slot.remove() }
}
