// Svelte adapter — save & restore. Imperative primitive (`createXenolithGraph`) for editor access;
// shared helpers (`downloadGraph` / `uploadGraph` / `saveToLocal` / `restoreFromLocal`) do the IO.
// Autosave rides the binding's `history:changed` event.
import { createXenolithGraph } from '@xenolithengine/graph-svelte'
import {
  initSaveRestore, downloadGraph, uploadGraph, saveToLocal, restoreFromLocal, hasSaved,
} from '@xenolithengine/demo/save-restore'

export async function mount(target: HTMLElement): Promise<() => void> {
  const slot = document.createElement('div')
  slot.style.cssText = 'position:absolute;inset:0;'
  target.appendChild(slot)
  const binding = await createXenolithGraph(slot, { resizeToWindow: false })
  initSaveRestore(binding.editor)

  const panel = document.createElement('div')
  panel.setAttribute('data-xeno-panel', '')
  panel.style.cssText = 'position:absolute;pointer-events:auto;top:12px;left:12px;display:flex;flex-direction:column;gap:6px;width:180px;padding:10px;background:var(--xeno-panel,#1d1d1d);border:1px solid var(--xeno-border,#333);border-radius:8px;font:12px Inter,system-ui,sans-serif;color:var(--xeno-text,#cfcfcf);z-index:5;'
  const fileInput = document.createElement('input')
  fileInput.type = 'file'; fileInput.accept = 'application/json,.json'; fileInput.hidden = true

  const status = document.createElement('span')
  status.style.cssText = 'color:var(--xeno-muted,#9a9a9a);font-size:11px;line-height:1.4;'
  status.textContent = 'Edit the graph — it autosaves to localStorage.'

  const btn = (text: string, on: () => void, opts?: { disabled?: () => boolean }) => {
    const b = document.createElement('button')
    b.textContent = text
    b.style.cssText = 'width:100%;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer;border:1px solid var(--xeno-border,#333);border-radius:6px;background:transparent;color:var(--xeno-text,#cfcfcf);'
    b.addEventListener('click', on)
    if (opts?.disabled) b.disabled = opts.disabled()
    return b
  }
  const restoreBtn = btn('↺ Restore last', () => restoreFromLocal(binding.editor), { disabled: () => !hasSaved() })

  panel.append(
    Object.assign(document.createElement('p'), { textContent: 'Save / restore', style: 'margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted,#9a9a9a);' as unknown as string }),
    btn('↓ Download .json', () => downloadGraph(binding.editor)),
    btn('↑ Upload .json', () => fileInput.click()),
    restoreBtn,
    status,
    fileInput,
  )
  fileInput.addEventListener('change', () => { const f = fileInput.files?.[0]; if (f) uploadGraph(binding.editor, f) })

  let timer: ReturnType<typeof setTimeout> | null = null
  let first = true
  const off = binding.on('history:changed', () => {
    if (first) { first = false; return }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { saveToLocal(binding.editor); status.textContent = '✓ Autosaved to your browser'; restoreBtn.disabled = false }, 500)
  })

  binding.editor.overlayRoot.appendChild(panel)
  return () => { off(); panel.remove(); binding.destroy(); slot.remove() }
}
