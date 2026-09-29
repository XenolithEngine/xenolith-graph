// Angular — one click sets every edge to that path style.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { EdgePathStyle } from '@xenolithengine/graph-render-pixi'
import { setupEdgePaths, setAllEdgePaths, EDGE_PATH_STYLES } from '@xenolithengine/demo/edge-paths'

@Component({
  selector: 'edge-paths-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <div class="label">Apply to all</div>
        @for (style of styles; track style) {
          <button type="button" class="btn" [class.on]="active() === style" (click)="flip(style)">{{ style }}</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; min-width:200px; padding:8px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .label { font-size:11px; color:var(--xeno-muted,#9a9a9a); text-transform:uppercase; letter-spacing:.06em; }
    .btn { padding:6px 12px; font-size:12px; text-align:left; cursor:pointer; border-radius:6px;
      border:1px solid var(--xeno-border,#333); background:transparent; color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
  `],
})
export class EdgePathsDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  readonly styles = EDGE_PATH_STYLES
  active = signal<EdgePathStyle | 'each'>('each')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupEdgePaths(editor)
  }

  flip(style: EdgePathStyle): void {
    const editor = this.graph.editor
    if (!editor) return
    this.active.set(style)
    setAllEdgePaths(editor, style)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
