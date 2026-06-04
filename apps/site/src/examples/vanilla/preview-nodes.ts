// Vanilla mount for the per-node canvas drawing showcase (G11).
import { XenolithEditor } from '@xenolithengine/graph-editor'
import { buildPreviewNodes } from '@xenolithengine/demo/preview-nodes'

export async function mount(target: HTMLElement): Promise<() => void> {
  const editor = await XenolithEditor.init(target, { resizeToWindow: false, minimap: false })
  const scene = buildPreviewNodes(editor)
  return () => { scene.dispose(); editor.destroy() }
}
