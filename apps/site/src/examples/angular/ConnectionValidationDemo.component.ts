// Angular — the attempt log is a signal. The guard and the graph are shared; viewport
// controls go through editor.chrome (no controls component in this adapter).
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { buildConnectionValidation, type Attempt } from '@xenolithengine/demo/connection-validation'

@Component({
  selector: 'connection-validation-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <p class="label">Connection rules</p>
        <span class="note">
          Pins are typed. Drag <b>Text</b> → a float input — refused (snaps back).
          Drag <b>C</b> → <b>A</b> — blocked (cycle).
        </span>
        <div class="log">
          @if (log().length === 0) {
            <span class="note">No attempts yet.</span>
          }
          @for (attempt of log(); track $index) {
            <span class="line" [class.ok]="attempt.ok" [class.bad]="!attempt.ok">
              {{ attempt.ok ? '✓' : '✗' }} {{ attempt.text }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; right:12px; z-index:5; display:flex; flex-direction:column;
      gap:8px; width:230px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .label { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.05em;
      color:var(--xeno-muted,#9a9a9a); }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.5; }
    .note b { color:var(--xeno-text,#cfcfcf); font-weight:600; }
    .log { display:flex; flex-direction:column; gap:3px; max-height:168px; overflow:hidden; }
    .line { font-size:11px; font-family:var(--xeno-mono, monospace); }
    .line.ok { color:#39d98a; }
    .line.bad { color:#ff5b6e; }
  `],
})
export class ConnectionValidationDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  log = signal<Attempt[]>([])

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    editor.chrome.setControls({ position: 'bottom-left' })
    buildConnectionValidation(editor, (attempt) => {
      this.log.update((prev) => [attempt, ...prev].slice(0, 8))
    })
  }

  ngOnDestroy(): void {
    this.graph.destroy()
  }
}
