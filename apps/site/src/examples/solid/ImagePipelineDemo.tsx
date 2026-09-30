// Solid has no widget bridge. One DomWidgetController per renderer — these nodes use each renderer once.
import { xenolith } from '@xenolithengine/graph-solid'
import type { DomWidgetController, XenolithEditor } from '@xenolithengine/graph-editor'
import { buildImagePipeline, downloadImageResult } from '@xenolithengine/demo/image-pipeline'

function readFile(file: File | undefined, setValue: (v: unknown) => void): void {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => setValue(String(reader.result))
  reader.readAsDataURL(file)
}

function imageInput(): DomWidgetController {
  let img: HTMLImageElement | null = null
  let empty: HTMLDivElement | null = null
  const paint = (value: unknown): void => {
    const src = typeof value === 'string' && value ? value : ''
    if (img) { img.src = src; img.style.display = src ? 'block' : 'none' }
    if (empty) empty.style.display = src ? 'none' : 'flex'
  }
  return {
    mount(el, c) {
      el.style.cssText = 'position:relative;width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px solid var(--xeno-border);'
      img = document.createElement('img')
      img.alt = 'source'
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:none;'
      empty = document.createElement('div')
      empty.textContent = 'Drop an image'
      empty.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--xeno-muted);font-size:12px;'
      const label = document.createElement('label')
      label.textContent = 'Replace'
      label.style.cssText = 'position:absolute;bottom:6px;right:6px;font-size:10px;padding:3px 8px;border-radius:6px;background:var(--xeno-elevated);color:var(--xeno-text);cursor:pointer;border:1px solid var(--xeno-border);'
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.hidden = true
      input.addEventListener('change', () => readFile(input.files?.[0], c.setValue))
      label.appendChild(input)
      el.addEventListener('dragover', (e) => e.preventDefault())
      el.addEventListener('drop', (e) => { e.preventDefault(); readFile(e.dataTransfer?.files?.[0], c.setValue) })
      el.append(img, empty, label)
      paint(c.value)
      return () => { img = null; empty = null; el.replaceChildren() }
    },
    update(c) { paint(c.value) },
  }
}

function imageOutput(): DomWidgetController {
  let img: HTMLImageElement | null = null
  let empty: HTMLSpanElement | null = null
  const paint = (value: unknown): void => {
    const src = typeof value === 'string' && value ? value : ''
    if (img) { img.src = src; img.style.display = src ? 'block' : 'none' }
    if (empty) empty.style.display = src ? 'none' : 'inline'
  }
  return {
    mount(el, c) {
      el.style.cssText = 'width:100%;height:100%;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.25);border:1px solid var(--xeno-border);display:flex;align-items:center;justify-content:center;'
      img = document.createElement('img')
      img.alt = 'result'
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:none;'
      empty = document.createElement('span')
      empty.textContent = 'Rendering…'
      empty.style.cssText = 'color:var(--xeno-muted);font-size:12px;'
      el.append(img, empty)
      paint(c.value)
      return () => { img = null; empty = null; el.replaceChildren() }
    },
    update(c) { paint(c.value) },
  }
}

export function ImagePipelineDemo() {
  let editor: XenolithEditor | null = null
  const btn = 'font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;width:100%;border:1px solid var(--xeno-border);background:var(--xeno-elevated);color:var(--xeno-text);'
  return (
    <div
      use:xenolith={{ resizeToWindow: false }}
      on:ready={(e) => {
        editor = e.detail
        e.detail.chrome.setControls({ position: 'bottom-left' })
        buildImagePipeline(e.detail, { input: imageInput(), output: imageOutput() })
      }}
      style="position:absolute;inset:0"
    >
      <div style="position:absolute;top:12px;left:12px;z-index:5;display:flex;flex-direction:column;gap:6px;width:200px;padding:10px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;color:var(--xeno-text);font:13px system-ui,sans-serif;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--xeno-muted);">Image pipeline</p>
        <button type="button" style={btn} onClick={() => editor && downloadImageResult(editor)}>↓ Download result.png</button>
        <span style="color:var(--xeno-muted);font-size:11px;line-height:1.45;">
          Each node is a live GLSL pass. Drag a slider — the result re-renders. Drop your own image on the Source node.
        </span>
      </div>
    </div>
  )
}
