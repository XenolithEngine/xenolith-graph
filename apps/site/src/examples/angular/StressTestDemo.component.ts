// Angular — nodes$ drives the counter. This adapter ships no panel component, so the
// buttons are a DOM card over the host the service mounts into.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { Subscription } from 'rxjs'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupStressTest, addStressNodes } from '@xenolithengine/demo/stress-test'

@Component({
  selector: 'stress-test-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <p class="label">Stress test</p>
        <div class="count">{{ nodes() }}<span class="unit"> nodes</span></div>
        <div class="row">
          <button type="button" class="btn" (click)="add(500)">+500</button>
          <button type="button" class="btn" (click)="add(1000)">+1000</button>
        </div>
        <button type="button" class="btn" (click)="add(5000)">+5000</button>
        <button type="button" class="btn" (click)="reset()">Reset</button>
        <span class="note">WebGL, render-on-demand. Live stats top-right. The count is nodes$.</span>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; width:168px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .label { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.05em;
      color:var(--xeno-muted,#9a9a9a); }
    .count { font-size:22px; font-weight:700; color:var(--xeno-accent,#FCB400);
      font-variant-numeric:tabular-nums; }
    .unit { font-size:12px; color:var(--xeno-muted,#9a9a9a); font-weight:400; }
    .row { display:flex; gap:6px; }
    .btn { flex:1; font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626);
      color:var(--xeno-text,#cfcfcf); }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.4; }
  `],
})
export class StressTestDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private sub = new Subscription()
  nodes = signal(0)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, {
      resizeToWindow: false,
      zoomBounds: [0.05, 2],
    })
    setupStressTest(editor)
    this.sub.add(this.graph.nodes$.subscribe((ns) => this.nodes.set(ns.length)))
  }

  add(n: number): void {
    const editor = this.graph.editor
    if (editor) addStressNodes(editor, n)
  }

  reset(): void {
    this.graph.editor?.clear()
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe()
    this.graph.destroy()
  }
}
