// Angular — load a saved graph after mount. The host owns the card; the service owns the editor.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { loadDemo } from '@xenolithengine/demo/scene'
import { demoGraph } from '@xenolithengine/demo'

@Component({
  selector: 'load-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn" (click)="reload()">Reload graph</button>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; right:12px; z-index:5; padding:10px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; font:13px system-ui,sans-serif; }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626);
      color:var(--xeno-text,#cfcfcf); }
  `],
})
export class LoadDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    editor.chrome.setControls({ position: 'bottom-left' })
    loadDemo(editor)
  }

  reload(): void {
    const editor = this.graph.editor
    if (!editor) return
    editor.loadJSON(demoGraph)
    editor.view.fitView({ padding: 48, maxZoom: 1 })
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
