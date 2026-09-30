// Angular — no panel component. Play sits in a DOM card; the service owns the editor.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { loadAudioGraph, createAudioEngine, type AudioSynthHandle } from '@xenolithengine/demo/audio-synth'

@Component({
  selector: 'audio-synth-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn" [class.on]="playing()" (click)="toggle()">
          {{ playing() ? '■ Stop' : '▶ Play' }}
        </button>
        <span class="note">Tweak the knobs while it plays — the chain is wired from the graph; the active path glows.</span>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; max-width:220px; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px; width:100%;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626); color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400); color:var(--xeno-canvas,#111); }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.4; }
  `],
})
export class AudioSynthDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private engine: AudioSynthHandle | null = null
  playing = signal(false)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    loadAudioGraph(editor)
    this.engine = createAudioEngine(editor)
  }

  toggle(): void {
    const engine = this.engine
    if (!engine) return
    if (this.playing()) engine.stop()
    else engine.play()
    this.playing.update((on) => !on)
  }

  ngOnDestroy(): void {
    this.engine?.dispose()
    this.engine = null
    this.graph.destroy()
  }
}
