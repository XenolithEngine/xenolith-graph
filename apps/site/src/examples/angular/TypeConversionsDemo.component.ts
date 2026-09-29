// Angular — the cast toggle calls setConversionEnabled. edge:connected arrives on on$().
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { Subscription } from 'rxjs'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupTypeConversions, setConversionEnabled } from '@xenolithengine/demo/type-conversions'

const stamp = (): string => new Date().toISOString().slice(11, 19)

@Component({
  selector: 'type-conversions-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn" [class.on]="enabled()" (click)="toggle()">
          {{ enabled() ? '✓ Conversion enabled' : 'Enable number → text cast' }}
        </button>
        <div class="log">
          @for (line of visible(); track $index) {
            <div [style.color]="color(line)">{{ line }}</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; min-width:280px; padding:8px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .btn { padding:8px 12px; font-size:12px; border-radius:6px; cursor:pointer;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-panel,#1d1d1d);
      color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
    .log { font:11px/1.4 ui-monospace,monospace; max-height:120px; overflow:auto; padding:6px;
      background:rgba(0,0,0,0.3); border-radius:4px; }
  `],
})
export class TypeConversionsDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private sub = new Subscription()
  enabled = signal(false)
  log = signal<string[]>([
    `[${stamp()}] No conversion registered. Try dragging from NumberSource.out to TextSink.in — refused.`,
  ])

  visible(): string[] { return this.log().slice(-6) }

  color(line: string): string {
    if (line.includes('✗')) return '#f88'
    if (line.includes('✓')) return '#9f9'
    return '#cfcfcf'
  }

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupTypeConversions(editor)
    this.sub.add(this.graph.on$('edge:connected').subscribe((payload) => {
      this.append(`✓ connected ${String(payload.edge.id).slice(0, 6)} (number → text via cast)`)
    }))
  }

  toggle(): void {
    const editor = this.graph.editor
    if (!editor) return
    const result = setConversionEnabled(editor, !this.enabled())
    this.enabled.set(result.enabled)
    if (result.enabled) {
      this.append('✓ conversion number → text registered — try connecting the pins now')
    } else {
      const tail = result.droppedEdges > 0
        ? ` (dropped ${result.droppedEdges} stale edge${result.droppedEdges === 1 ? '' : 's'})`
        : ''
      this.append(`✗ conversion removed${tail} — try connecting again, it refuses`)
    }
  }

  private append(line: string): void {
    this.log.update((prev) => [...prev.slice(-39), `[${stamp()}] ${line}`])
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe()
    this.graph.destroy()
  }
}
