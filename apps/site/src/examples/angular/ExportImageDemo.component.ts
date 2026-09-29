// Angular — full-graph image export. The click handler reads the service's editor.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { loadDemo } from '@xenolithengine/demo/scene'
import { exportGraphImage } from '@xenolithengine/demo/export-image'

@Component({
  selector: 'export-image-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <p class="label">Export image</p>
        <button type="button" class="btn" [disabled]="busy()" (click)="save('png', 1)">↓ PNG · 1×</button>
        <button type="button" class="btn" [disabled]="busy()" (click)="save('png', 2)">↓ PNG · 2× (retina)</button>
        <button type="button" class="btn" [disabled]="busy()" (click)="save('jpeg', 2)">↓ JPG · 2×</button>
        <span class="note">Exports the entire graph, not just what’s on screen.</span>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; width:190px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .label { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.05em;
      color:var(--xeno-muted,#9a9a9a); }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626);
      color:var(--xeno-text,#cfcfcf); }
    .btn:disabled { opacity:0.4; cursor:default; }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.45; }
  `],
})
export class ExportImageDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  busy = signal(false)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    editor.chrome.setControls({ position: 'bottom-left' })
    loadDemo(editor)
  }

  async save(format: 'png' | 'jpeg', scale: number): Promise<void> {
    const editor = this.graph.editor
    if (!editor || this.busy()) return
    this.busy.set(true)
    try { await exportGraphImage(editor, format, scale) } finally { this.busy.set(false) }
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
