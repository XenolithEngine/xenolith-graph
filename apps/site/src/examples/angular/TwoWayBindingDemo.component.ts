// Angular — selection$ and graphJSON$ on XenolithGraphService. The inspector is host DOM;
// this adapter ships no panel component.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, computed, viewChild } from '@angular/core'
import { Subscription } from 'rxjs'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { NodeId, WidgetSpec } from '@xenolithengine/graph-editor'
import { loadDemo } from '@xenolithengine/demo/scene'

function numBound(w: WidgetSpec, key: 'min' | 'max' | 'step', fallback: number): number {
  const rec = w as unknown as Record<string, unknown>
  return typeof rec[key] === 'number' ? rec[key] as number : fallback
}
function comboOptions(w: WidgetSpec): { value: string; label: string }[] {
  if (w.type !== 'combo') return []
  return w.values.map((o) => typeof o === 'string'
    ? { value: o, label: o }
    : { value: String(o.value), label: o.label })
}

@Component({
  selector: 'two-way-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card" style="top:12px;left:12px;width:340px;height:min(420px,calc(100% - 24px));display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="btn on" (click)="apply()">Apply JSON →</button>
          @if (err()) { <span style="color:#e06c5b;font-size:12px;">Invalid JSON</span> }
        </div>
        <p class="note">graphJSON$ → the whole graph as state</p>
        <textarea [value]="text()" (focus)="focused.set(true)" (blur)="focused.set(false)"
          (input)="text.set($any($event.target).value)"></textarea>
      </div>
      <div class="card" style="top:12px;right:12px;width:232px;max-height:calc(100% - 24px);overflow-y:auto;">
        <h3>Inspector</h3>
        <p class="note">selection$ → widgets</p>
        @if (!node()) { <p class="note">Select a node.</p> }
        @else if (widgets().length === 0) { <p class="note">No editable widgets.</p> }
        @for (w of widgets(); track w.id) {
          <label>
            <span>{{ w.label }}</span>
            @if (w.type === 'slider' || w.type === 'number') {
              <input type="range" [min]="numBound(w, 'min', 0)" [max]="numBound(w, 'max', 1)"
                [step]="w.type === 'slider' ? numBound(w, 'step', 0.01) : numBound(w, 'step', 1)"
                [value]="num(w)" (input)="setValue(w, $any($event.target).valueAsNumber)" />
              <em>{{ valueOf(w) }}</em>
            } @else if (w.type === 'text') {
              <input type="text" [value]="str(w)" (input)="setValue(w, $any($event.target).value)" />
            } @else if (w.type === 'toggle') {
              <input type="checkbox" [checked]="bool(w)" (change)="setValue(w, $any($event.target).checked)" />
            } @else if (w.type === 'color') {
              <input type="color" [value]="str(w) || '#000000'" (input)="setValue(w, $any($event.target).value)" />
            } @else if (w.type === 'combo') {
              <select [value]="str(w)" (change)="setValue(w, $any($event.target).value)">
                @for (o of comboOptions(w); track o.value) { <option [value]="o.value">{{ o.label }}</option> }
              </select>
            }
          </label>
        }
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; z-index:5; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px; color:var(--xeno-text,#cfcfcf);
      font:13px Inter,system-ui,sans-serif; }
    .note { margin:0 0 8px; font-size:11.5px; color:var(--xeno-muted,#9a9a9a); }
    h3 { margin:0 0 6px; font-size:13px; }
    label { display:flex; flex-direction:column; gap:4px; margin:0 0 8px; font-size:12px; }
    textarea { flex:1; resize:none; font:12px ui-monospace,monospace; background:var(--xeno-canvas,#111);
      color:var(--xeno-text,#cfcfcf); border:1px solid var(--xeno-border,#333); border-radius:6px; padding:8px; }
    .btn { padding:7px 12px; border-radius:8px; cursor:pointer; font:inherit; }
    .btn.on { border:1px solid var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400); color:var(--xeno-canvas,#111); }
  `],
})
export class TwoWayBindingDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private subs = new Subscription()
  readonly numBound = numBound
  readonly comboOptions = comboOptions
  selection = signal<readonly NodeId[]>([])
  tick = signal(0)
  text = signal('')
  err = signal(false)
  focused = signal(false)
  node = computed(() => {
    void this.tick()
    const id = this.selection()[0]
    const e = this.graph.editor
    return id && e ? e.getNode(id) : undefined
  })
  widgets = computed(() => (this.node()?.widgets ?? []).filter((w) => w.key !== undefined))

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    loadDemo(editor)
    this.subs.add(this.graph.selection$.subscribe((ids) => this.selection.set(ids)))
    this.subs.add(this.graph.graphJSON$.subscribe((doc) => {
      if (doc && !this.focused()) { this.text.set(JSON.stringify(doc, null, 2)); this.err.set(false) }
    }))
    this.subs.add(this.graph.on$('widget:changed').subscribe(() => this.tick.update((n) => n + 1)))
  }

  valueOf(w: WidgetSpec): unknown {
    void this.tick()
    const id = this.selection()[0]
    return id ? this.graph.editor?.getWidgetValue(id, w.id) : undefined
  }
  num(w: WidgetSpec): number { return Number(this.valueOf(w)) || 0 }
  str(w: WidgetSpec): string { return String(this.valueOf(w) ?? '') }
  bool(w: WidgetSpec): boolean { return Boolean(this.valueOf(w)) }
  setValue(w: WidgetSpec, value: unknown): void {
    const id = this.selection()[0]
    if (!id) return
    this.graph.editor?.setWidgetValue(id, w.id, value)
    this.tick.update((n) => n + 1)
  }
  apply(): void {
    const editor = this.graph.editor
    if (!editor) return
    try {
      editor.loadJSON(JSON.parse(this.text()))
      editor.view.fitView({ padding: 48, maxZoom: 1 })
      this.focused.set(false)
      this.err.set(false)
    } catch { this.err.set(true) }
  }
  ngOnDestroy(): void { this.subs.unsubscribe(); this.graph.destroy() }
}
