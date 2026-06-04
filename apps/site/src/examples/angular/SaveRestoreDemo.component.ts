// Angular standalone component — save & restore. Imperative IO via the shared helpers; autosave
// rides the `(historyChanged)` Output. Editor reference is captured from `(ready)` once.
import { Component, signal, ViewChild, ElementRef } from '@angular/core'
import { XenolithGraphComponent } from '@xenolithengine/angular'
import type { XenolithEditor } from '@xenolithengine/editor'
import {
  initSaveRestore, downloadGraph, uploadGraph, saveToLocal, restoreFromLocal, hasSaved,
} from '@xenolithengine/demo/save-restore'

@Component({
  selector: 'save-restore-demo',
  standalone: true,
  imports: [XenolithGraphComponent],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <xenolith-graph
        class="xeno"
        [resizeToWindow]="false"
        (ready)="onReady($event)"
        (historyChanged)="scheduleAutosave()">
      </xenolith-graph>

      <div data-xeno-panel class="panel">
        <p class="label">Save / restore</p>
        <button class="btn" (click)="download()">↓ Download .json</button>
        <button class="btn" (click)="fileInput.click()">↑ Upload .json</button>
        <button class="btn" [disabled]="savedAt() === null && !hasSaved" (click)="restore()">↺ Restore last</button>
        <span class="status">{{ savedAt() ? '✓ Autosaved to your browser' : 'Edit the graph — it autosaves to localStorage.' }}</span>
        <input #fileInput type="file" accept="application/json,.json" hidden (change)="onUpload($event)" />
      </div>
    </div>
  `,
  styles: [\`
    .panel { position:absolute; top:12px; left:12px; display:flex; flex-direction:column; gap:6px;
      width:180px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:8px;
      font:12px Inter,system-ui,sans-serif; color:var(--xeno-text,#cfcfcf); z-index:5; }
    .label { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#9a9a9a; }
    .btn { width:100%; padding:6px 10px; font-size:12px; cursor:pointer;
      border:1px solid var(--xeno-border,#333); border-radius:6px;
      background:transparent; color:var(--xeno-text,#cfcfcf); }
    .status { color:#9a9a9a; font-size:11px; line-height:1.4; }
  \`],
})
export class SaveRestoreDemoComponent {
  private editor: XenolithEditor | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private first = true
  savedAt = signal<number | null>(null)
  readonly hasSaved = hasSaved()

  onReady(editor: XenolithEditor): void {
    this.editor = editor
    initSaveRestore(editor)
  }

  scheduleAutosave(): void {
    if (this.first) { this.first = false; return }
    if (!this.editor) return
    if (this.timer) clearTimeout(this.timer)
    const e = this.editor
    this.timer = setTimeout(() => { saveToLocal(e); this.savedAt.set(Date.now()) }, 500)
  }

  download(): void { if (this.editor) downloadGraph(this.editor) }
  restore(): void { if (this.editor) restoreFromLocal(this.editor) }
  onUpload(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0]
    if (f && this.editor) uploadGraph(this.editor, f)
  }
}
