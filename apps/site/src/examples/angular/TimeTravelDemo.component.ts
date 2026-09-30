import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { StepRecord, XenolithEditor } from '@xenolithengine/graph-editor'
import { buildTimeTravel, runTimeTravel, showTimeTravelStep } from '@xenolithengine/demo/time-travel'

@Component({
  selector: 'time-travel-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <div class="title">Time-travel scrubber</div>
        <span class="note">
          The graph ran <strong>(2 + 3) × 4 = 20</strong> from start to finish. Drag the slider
          to rewind through {{ history().length }} steps — green = done, yellow = the step you're
          inspecting. Press Play to auto-advance.
        </span>
        <input data-testid="scrub" type="range" min="0" [max]="history().length" [value]="scrub()" step="1" (input)="onScrub($event)" />
        <div class="row">
          <button type="button" class="btn" [class.on]="playing()" (click)="togglePlay()">{{ playing() ? '⏸ Pause' : '▶ Play' }}</button>
          <button type="button" class="btn" (click)="reset()">⟲ Reset</button>
          <span class="count">{{ scrub() }}/{{ history().length }}</span>
        </div>
      </div>
      @if (current() && inspected()) {
        <div class="inspect">
          <div class="kicker">Step {{ scrub() }}</div>
          <div class="title">{{ inspected()!.type }}</div>
          <div class="kicker">Outputs</div>
          @for (row of outputRows(); track row.label) {
            <div class="kv"><span>{{ row.label }}</span><span class="mono">{{ row.value }}</span></div>
          }
          <div class="kicker">{{ current()!.durationMs.toFixed(2) }}ms</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .card, .inspect { position:absolute; top:12px; z-index:5; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px; color:var(--xeno-text,#cfcfcf);
      font:13px system-ui,sans-serif; display:flex; flex-direction:column; gap:8px; }
    .card { left:12px; max-width:360px; }
    .inspect { right:12px; min-width:240px; max-width:320px; }
    .title { font-size:12px; font-weight:600; }
    .inspect .title { font-size:14px; }
    .note, .kicker { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.4; }
    .kicker { font-size:10px; text-transform:uppercase; }
    .row { display:flex; gap:6px; align-items:center; }
    .count { margin-left:auto; color:var(--xeno-muted,#9a9a9a); font-size:11px; }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626); color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400); color:var(--xeno-canvas,#111); }
    input[type=range] { width:100%; }
    .kv { display:flex; justify-content:space-between; font-size:11px; }
    .mono { font-family:ui-monospace,monospace; }
  `],
})
export class TimeTravelDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private editor: XenolithEditor | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  history = signal<StepRecord[]>([])
  scrub = signal(0)
  playing = signal(false)

  current(): StepRecord | undefined {
    const steps = this.history()
    const index = this.scrub()
    return index > 0 ? steps[index - 1] : undefined
  }
  inspected() {
    const rec = this.current()
    return rec && this.editor ? this.editor.getNode(rec.nodeId) : undefined
  }
  outputRows(): Array<{ label: string; value: string }> {
    const rec = this.current()
    const node = this.inspected()
    if (!rec || !node) return []
    return [...rec.outputs.entries()].map(([pinId, value]) => ({
      label: node.pins.find((p) => p.id === pinId)?.label ?? pinId,
      value: JSON.stringify(value),
    }))
  }

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    this.editor = editor
    buildTimeTravel(editor)
    const steps = await runTimeTravel(editor)
    if (this.editor !== editor) return
    this.history.set(steps)
    this.scrub.set(steps.length)
    this.paint()
  }

  onScrub(event: Event): void {
    this.playing.set(false)
    this.arm()
    this.scrub.set(Number((event.target as HTMLInputElement).value))
    this.paint()
  }
  togglePlay(): void {
    if (this.scrub() >= this.history().length) this.scrub.set(0)
    this.playing.update((on) => !on)
    this.arm()
    this.paint()
  }
  reset(): void {
    this.playing.set(false)
    this.arm()
    this.scrub.set(0)
    this.paint()
  }

  private paint(): void {
    const editor = this.editor
    const steps = this.history()
    if (!editor || steps.length === 0) return
    showTimeTravelStep(editor, steps, this.scrub())
  }

  private arm(): void {
    clearTimeout(this.timer)
    if (!this.playing()) return
    if (this.scrub() >= this.history().length) { this.playing.set(false); return }
    this.timer = setTimeout(() => {
      this.scrub.update((s) => Math.min(s + 1, this.history().length))
      this.paint()
      this.arm()
    }, 600)
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer)
    this.graph.destroy()
  }
}
