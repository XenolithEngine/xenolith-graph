// Angular — a WebGL level bar. widget:changed arrives on the service as on$('widget:changed').
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { Subscription } from 'rxjs'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { NodeId } from '@xenolithengine/graph-editor'
import { buildCanvasWidget } from '@xenolithengine/demo/canvas-widget'

@Component({
  selector: 'canvas-widget-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <h3>Live value (in Angular)</h3>
        <p class="note">The canvas widget commits through the editor; widget:changed hands the value back.</p>
        <div class="readout">{{ Math.round(gain() * 100) }}%</div>
        <input type="range" min="0" max="1" step="0.01" [value]="gain()" (input)="onRange($event)" />
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; right:12px; z-index:5; width:220px; padding:10px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    h3 { margin:0 0 6px; font-size:13px; }
    .note { margin:0 0 8px; font-size:12px; color:var(--xeno-muted,#9a9a9a); }
    .readout { font-size:28px; font-weight:600; color:var(--xeno-accent,#FCB400); }
    input { width:100%; }
  `],
})
export class CanvasWidgetDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private sub = new Subscription()
  private nodeId: NodeId | null = null
  gain = signal(0.6)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    this.sub.add(this.graph.on$('widget:changed').subscribe((payload) => {
      if (payload.widgetId === 'gain') this.gain.set(Number(payload.value))
    }))
    this.nodeId = buildCanvasWidget(editor).nodeId
  }

  onRange(ev: Event): void {
    const editor = this.graph.editor
    if (!editor || !this.nodeId) return
    editor.setWidgetValue(this.nodeId, 'gain', (ev.target as HTMLInputElement).valueAsNumber)
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe()
    this.graph.destroy()
  }
}
