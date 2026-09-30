import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { mountHeatmap, type HeatmapHandle } from '@xenolithengine/demo/heatmap'

@Component({
  selector: 'heatmap-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <div class="title">Per-node cost heatmap</div>
        <span class="note">
          A simulated RAG pipeline. Each node has a per-call latency badge —
          <span style="color:hsl(200deg,80%,55%)"> cool blue</span> for cheap,
          <span style="color:hsl(40deg,80%,55%)"> warm</span> for medium,
          <span style="color:hsl(0deg,80%,55%)"> hot red</span> for the bottleneck.
          Press Pulse to animate live metrics.
        </span>
        <button type="button" class="btn" [class.on]="pulsing()" (click)="toggle()">
          {{ pulsing() ? '⏸ Pause pulse' : '▶ Pulse' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:8px; max-width:320px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .title { font-size:12px; font-weight:600; }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.4; }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626); color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400); color:var(--xeno-canvas,#111); }
  `],
})
export class HeatmapDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private handle: HeatmapHandle | null = null
  pulsing = signal(false)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    this.handle = mountHeatmap(editor)
  }

  toggle(): void {
    const next = !this.pulsing()
    this.pulsing.set(next)
    this.handle?.setPulsing(next)
  }

  ngOnDestroy(): void {
    this.handle?.dispose()
    this.handle = null
    this.graph.destroy()
  }
}
