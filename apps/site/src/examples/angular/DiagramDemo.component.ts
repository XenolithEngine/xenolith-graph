// Angular — edges$ re-applies the flow flag. No panel component: the toggle is a DOM card,
// the viewport controls are editor.chrome.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { Subscription } from 'rxjs'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { buildDiagram } from '@xenolithengine/demo/diagram'

@Component({
  selector: 'diagram-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <p class="label">Diagram edges</p>
        <button type="button" class="btn" [class.on]="animated()" (click)="toggle()">
          {{ animated() ? '⏸ Stop flow' : '▶ Animate flow' }}
        </button>
        <span class="note">
          Directional edges with arrowheads + labels. The main path animates a flowing dash.
          The toggle writes edges$ through setEdgeOptions.
        </span>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; width:200px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .label { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.05em;
      color:var(--xeno-muted,#9a9a9a); }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626);
      color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.45; }
  `],
})
export class DiagramDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private sub = new Subscription()
  animated = signal(true)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    editor.chrome.setControls({ position: 'bottom-left' })
    buildDiagram(editor)
    this.sub.add(this.graph.edges$.subscribe(() => this.applyFlow()))
  }

  toggle(): void {
    this.animated.update((on) => !on)
    this.applyFlow()
  }

  private applyFlow(): void {
    const editor = this.graph.editor
    if (!editor) return
    const on = this.animated()
    for (const edge of editor.graphEdges()) editor.setEdgeOptions(edge.id, { animated: on })
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe()
    this.graph.destroy()
  }
}
