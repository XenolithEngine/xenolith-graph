// Angular — nodes$/edges$/viewport$ drive the readout. The minimap is editor.chrome
// (this adapter ships no minimap component).
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { Subscription } from 'rxjs'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { MinimapPosition } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'

@Component({
  selector: 'viewport-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <p class="label">Minimap</p>
        <button type="button" class="btn wide" [class.on]="on()" (click)="show(!on())">
          {{ on() ? 'Visible' : 'Hidden' }}
        </button>
        <p class="label" style="margin-top:14px;">Position</p>
        <div class="grid">
          @for (cell of grid; track cell) {
            @if (cell === 'center') {
              <button type="button" class="cell" (click)="pick(cell)">⊙</button>
            } @else {
              <button type="button" class="cell" [class.on]="on() && pos() === cell" [disabled]="!on()" (click)="pick(cell)">
                {{ arrow[cell] }}
              </button>
            }
          }
        </div>
      </div>
      <div class="stats">
        <span class="accent">{{ nodes() }}</span> nodes ·
        <span class="accent">{{ edges() }}</span> edges ·
        <span class="accent">{{ zoom() }}%</span>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; min-width:150px; padding:10px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .label { margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:.05em;
      color:var(--xeno-muted,#9a9a9a); }
    .btn, .cell { font:inherit; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626);
      color:var(--xeno-text,#cfcfcf); }
    .btn { font-size:13px; padding:7px 12px; }
    .btn.wide { width:100%; }
    .btn.on, .cell.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
    .btn:disabled, .cell:disabled { opacity:0.35; cursor:default; }
    .grid { display:grid; grid-template-columns:repeat(3, 34px); gap:6px; }
    .cell { width:34px; height:30px; padding:0; font-size:14px; }
    .stats { position:absolute; bottom:12px; left:12px; z-index:5; padding:6px 10px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif;
      font-variant-numeric:tabular-nums; }
    .accent { color:var(--xeno-accent,#FCB400); }
  `],
})
export class ViewportDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private sub = new Subscription()

  readonly grid = [
    'top-left', 'top', 'top-right',
    'left', 'center', 'right',
    'bottom-left', 'bottom', 'bottom-right',
  ] as const
  readonly arrow: Record<string, string> = {
    'top-left': '↖', top: '↑', 'top-right': '↗', left: '←', right: '→',
    'bottom-left': '↙', bottom: '↓', 'bottom-right': '↘',
  }

  nodes = signal(0)
  edges = signal(0)
  zoom = signal(100)
  on = signal(true)
  pos = signal<MinimapPosition>('bottom-right')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    editor.chrome.setControls({ position: 'top-right', orientation: 'horizontal' })
    editor.chrome.setMinimapVisible(true)
    editor.chrome.setMinimapPosition('bottom-right')
    loadDemo(editor)
    this.sub.add(this.graph.nodes$.subscribe((ns) => this.nodes.set(ns.length)))
    this.sub.add(this.graph.edges$.subscribe((es) => this.edges.set(es.length)))
    this.sub.add(this.graph.viewport$.subscribe((vp) => this.zoom.set(Math.round(vp.zoom * 100))))
  }

  show(next: boolean): void {
    this.on.set(next)
    this.graph.editor?.chrome.setMinimapVisible(next)
  }

  pick(cell: string): void {
    if (cell === 'center') { this.show(!this.on()); return }
    const next = cell as MinimapPosition
    this.pos.set(next)
    this.graph.editor?.chrome.setMinimapPosition(next)
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe()
    this.graph.destroy()
  }
}
