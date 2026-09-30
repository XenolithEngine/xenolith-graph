import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import {
  attachStepDebugger, buildStepDemo,
  type StepDebugController, type StepDebugSnapshot,
} from '@xenolithengine/demo/step-debugger'

const EMPTY: StepDebugSnapshot = {
  status: 'idle', paused: null, history: [], planned: [], macroExpanded: false, busy: false,
}

@Component({
  selector: 'step-debugger-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <div class="row">
          <span class="dot" [style.background]="dotColor()"></span>
          <strong>Debugger {{ statusLabel() }}</strong>
        </div>
        <div class="row wrap">
          <button type="button" class="btn" [class.on]="canStart()" [disabled]="!canStart()" (click)="ctrl?.start()">▶ Start</button>
          <button type="button" class="btn" [disabled]="!canStep()" (click)="ctrl?.step()">⤵ Step</button>
          <button type="button" class="btn" [disabled]="!canStep()" (click)="ctrl?.continue()">⏩ Continue</button>
          <button type="button" class="btn" [disabled]="!canStop()" (click)="ctrl?.stop()">■ Stop</button>
        </div>
        <button type="button" class="btn" [disabled]="snap().busy" (click)="ctrl?.toggleMacro()">
          {{ snap().macroExpanded ? '⟲ Collapse macro' : '⤢ Expand macro' }}
        </button>
        <span class="note">
          Graph: <strong>(2 + 3) × 4 = 20</strong> piped through a template-wrapped Identity
          into Display. Add + Multiply are inside macro <em>Compute</em>; Identity is inside
          template <em>Probe</em>. Toggle the macro to step its members individually. Templates
          are always one step. Click any node while debugging to toggle a breakpoint (red).
          Yellow = paused, green = executed.
        </span>
      </div>
      @if (snap().paused) {
        <div class="inspect">
          <div class="kicker">Paused on</div>
          <div class="title">{{ snap().paused!.nodeType }}</div>
          <div class="kicker">Inputs</div>
          @if (snap().paused!.inputs.length === 0) {
            <div class="note">— (no incoming values)</div>
          } @else {
            @for (row of snap().paused!.inputs; track $index) {
              <div class="kv"><span>{{ row[0] }}</span><span class="mono">{{ json(row[1]) }}</span></div>
            }
          }
        </div>
      }
      <div class="trace">
        @if (snap().planned.length > 0) {
          <div class="kicker">Planned walk ({{ snap().planned.length }} steps)</div>
          <div class="mono walk">{{ plannedText() }}</div>
        }
        <div class="kicker">Trace</div>
        @if (snap().history.length === 0) {
          <div class="note">Press ▶ Start, then ⤵ Step.</div>
        } @else {
          @for (record of snap().history; track $index) {
            <div class="trace-row">
              <span class="idx">{{ pad($index) }}</span>
              <span>{{ record.type }}</span>
              <span class="note">{{ record.durationMs.toFixed(2) }}ms</span>
              <span class="mono">{{ outputsOf(record) }}</span>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .card, .inspect, .trace { position:absolute; z-index:5; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px; color:var(--xeno-text,#cfcfcf);
      font:13px system-ui,sans-serif; }
    .card { top:12px; left:12px; max-width:320px; display:flex; flex-direction:column; gap:8px; }
    .inspect { top:12px; right:12px; min-width:240px; max-width:320px; }
    .trace { bottom:12px; left:12px; min-width:280px; max-width:360px; max-height:260px; overflow:auto; }
    .row { display:flex; align-items:center; gap:6px; }
    .wrap { flex-wrap:wrap; }
    .dot { width:8px; height:8px; border-radius:8px; }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626); color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400); color:var(--xeno-canvas,#111); }
    .btn:disabled { opacity:.4; cursor:default; }
    .note, .kicker { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.4; }
    .kicker { font-size:10px; text-transform:uppercase; margin:6px 0 4px; }
    .title { font-size:14px; font-weight:600; }
    .kv, .trace-row { display:flex; justify-content:space-between; gap:8px; font-size:11px; padding:2px 0; }
    .trace-row { display:grid; grid-template-columns:24px 1fr auto auto; }
    .idx { color:var(--xeno-accent,#FCB400); }
    .mono { font-family:ui-monospace,monospace; }
    .walk { font-size:10px; line-height:1.5; margin-bottom:8px; }
  `],
})
export class StepDebuggerDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private tick = signal(0)
  ctrl: StepDebugController | null = null

  snap(): StepDebugSnapshot {
    this.tick()
    return this.ctrl?.snapshot() ?? EMPTY
  }
  canStart(): boolean {
    const s = this.snap()
    return !s.busy && (s.status === 'idle' || s.status === 'finished' || s.status === 'error')
  }
  canStep(): boolean { return !this.snap().busy && this.snap().status === 'paused' }
  canStop(): boolean { return !this.snap().busy && this.snap().status !== 'idle' }
  statusLabel(): string {
    return ({ idle: 'idle', paused: 'paused', running: 'running…', finished: 'finished', error: 'error' })[this.snap().status]
  }
  dotColor(): string {
    const s = this.snap().status
    if (s === 'paused') return '#fcb400'
    if (s === 'running') return '#3ddc97'
    if (s === 'error') return '#e25b5b'
    if (s === 'finished') return '#5b8def'
    return '#666'
  }
  json(value: unknown): string { return JSON.stringify(value) }
  pad(index: number): string { return String(index + 1).padStart(2, '0') }
  plannedText(): string {
    const planned = this.snap().planned
    return planned.map((step, i) => `${i + 1}. ${step}${i < planned.length - 1 ? ' → ' : ''}`).join('')
  }
  outputsOf(record: StepDebugSnapshot['history'][number]): string {
    return [...record.outputs.values()].map((v) => JSON.stringify(v)).join(', ') || '—'
  }

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    buildStepDemo(editor)
    this.ctrl = attachStepDebugger(editor, () => this.tick.update((n) => n + 1))
    this.tick.update((n) => n + 1)
  }

  ngOnDestroy(): void {
    this.ctrl?.dispose()
    this.ctrl = null
    this.graph.destroy()
  }
}
