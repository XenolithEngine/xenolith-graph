// Angular has no widget bridge. prompt-edit and output-view are DOM controllers, registered before load.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { DomWidgetController, XenolithEditor } from '@xenolithengine/graph-editor'
import { loadLLMGraph, runLLM } from '@xenolithengine/demo/llm-builder'

const box = 'width:100%;height:100%;box-sizing:border-box;font:11px inherit;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:6px;resize:none;'

function promptEdit(): DomWidgetController {
  let area: HTMLTextAreaElement | null = null
  return {
    mount(el, c) {
      area = document.createElement('textarea')
      area.spellcheck = false
      area.value = String(c.value ?? '')
      area.style.cssText = box
      area.addEventListener('input', () => c.setValue(area?.value ?? ''))
      el.append(area)
      return () => { area = null; el.replaceChildren() }
    },
    update(c) {
      const next = String(c.value ?? '')
      if (area && area.value !== next) area.value = next
    },
  }
}

function outputView(): DomWidgetController {
  let view: HTMLDivElement | null = null
  const paint = (value: unknown): void => {
    if (!view) return
    const text = String(value ?? '')
    view.textContent = text || 'Run to generate…'
    view.style.color = text ? 'var(--xeno-text)' : 'var(--xeno-muted)'
  }
  return {
    mount(el, c) {
      view = document.createElement('div')
      view.style.cssText = box + 'overflow:auto;white-space:pre-wrap;font-family:ui-monospace,monospace;'
      el.append(view)
      paint(c.value)
      return () => { view = null; el.replaceChildren() }
    },
    update(c) { paint(c.value) },
  }
}

@Component({
  selector: 'llm-builder-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn" [class.on]="running()" [disabled]="running()" (click)="onRun()">
          {{ running() ? 'Running…' : '▶ Run' }}
        </button>
        <span class="note">Edit the Input / Prompt / Model, then Run — the active node glows and the completion streams in.</span>
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
    .btn:disabled { opacity:.4; cursor:default; }
    .note { color:var(--xeno-muted,#9a9a9a); font-size:11px; line-height:1.4; }
  `],
})
export class LLMBuilderDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private editor: XenolithEditor | null = null
  running = signal(false)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    this.editor = editor
    editor.registerWidget('prompt-edit', promptEdit())
    editor.registerWidget('output-view', outputView())
    loadLLMGraph(editor)
  }

  async onRun(): Promise<void> {
    const editor = this.editor
    if (!editor || this.running()) return
    this.running.set(true)
    try { await runLLM(editor) } finally { this.running.set(false) }
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
