// Angular — ELK keeps the macro hierarchy; dagre flattens it.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupNestedLayout, runNestedLayout, type LayoutEngineId } from '@xenolithengine/demo/nested-layout'

@Component({
  selector: 'nested-layout-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn on" [disabled]="busy()" (click)="arrange()">
          {{ busy() ? 'Arranging…' : 'Auto-arrange' }}
        </button>
        <button type="button" class="btn" [class.on]="engine() === 'elk'" [disabled]="busy()" (click)="flip('elk')">ELK</button>
        <button type="button" class="btn" [class.on]="engine() === 'dagre'" [disabled]="busy()" (click)="flip('dagre')">dagre</button>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; gap:6px; padding:6px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; font:13px system-ui,sans-serif; }
    .btn { font:inherit; font-size:12px; padding:6px 12px; cursor:pointer; border-radius:6px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-panel,#1d1d1d);
      color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
    .btn:disabled { opacity:0.4; cursor:default; }
  `],
})
export class NestedLayoutDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  engine = signal<LayoutEngineId>('elk')
  busy = signal(false)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupNestedLayout(editor)
  }

  async arrange(next: LayoutEngineId = this.engine()): Promise<void> {
    const editor = this.graph.editor
    if (!editor || this.busy()) return
    this.busy.set(true)
    try { await runNestedLayout(editor, next) } finally { this.busy.set(false) }
  }

  async flip(next: LayoutEngineId): Promise<void> {
    this.engine.set(next)
    await this.arrange(next)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
