// Angular standalone host component — events. Single events stream through the service's
// on$('node:click') observables; reactive state (selection) through the store observables
// (selection$, …) wired to signals with toSignal(). The log lives in a component signal.
import {
  AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, inject, signal, viewChild,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { loadDemo } from '@xenolithengine/demo/scene'

@Component({
  selector: 'events-demo',
  standalone: true,
  imports: [CommonModule],
  providers: [XenolithGraphService],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>

      <div data-xeno-panel class="panel">
        <h3>Selection</h3>
        <p class="muted" *ngIf="selection().length === 0">Nothing selected.</p>
        <div *ngFor="let id of selection()" class="row"><span>{{ id }}</span></div>

        <h3>Event log</h3>
        <div class="log">
          <div *ngFor="let line of log()">{{ line }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel { position:absolute; top:12px; right:12px; width:280px; max-height:calc(100% - 24px);
      overflow-y:auto; padding:12px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:8px;
      font:12px Inter,system-ui,sans-serif; color:var(--xeno-text,#cfcfcf); z-index:5; }
    h3 { margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#9a9a9a; }
    .muted { color:#9a9a9a; margin:0; }
    .log { font-family:ui-monospace,Menlo,monospace; font-size:11px; line-height:1.5; }
  `],
})
export class EventsDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private destroyRef = inject(DestroyRef)

  // Reactive state: the service's store observables → signals (toSignal needs an injection
  // context, so it's a field initializer, not inside ngAfterViewInit).
  protected selection = toSignal(this.graph.selection$, { initialValue: [] as string[] })
  protected log = signal<string[]>([])

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    loadDemo(editor)

    const push = (line: string): void => this.log.update((l) => [line, ...l].slice(0, 40))
    const until = takeUntilDestroyed(this.destroyRef) // post-await: pass DestroyRef explicitly

    this.graph.on$('node:click').pipe(until).subscribe((e) => push(`node:click ${String(e.nodeId)}`))
    this.graph.on$('node:moved').pipe(until).subscribe((e) =>
      push(`node:moved ${String(e.nodeId)} → ${Math.round(e.position.x)},${Math.round(e.position.y)}`))
    this.graph.on$('edge:connected').pipe(until).subscribe((e) => push(`edge:connected ${String(e.edge.id)}`))
    this.graph.on$('edge:disconnected').pipe(until).subscribe((e) => push(`edge:disconnected ${String(e.edgeId)}`))
    this.graph.on$('widget:changed').pipe(until).subscribe((e) =>
      push(`widget:changed ${e.widgetId} = ${JSON.stringify(e.value)}`))
    this.graph.on$('history:changed').pipe(until).subscribe((e) =>
      push(`history undo=${e.canUndo} redo=${e.canRedo}`))
    this.graph.on$('selection:changed').pipe(until).subscribe((e) =>
      push(`selection:changed (${e.nodeIds.length})`))
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
