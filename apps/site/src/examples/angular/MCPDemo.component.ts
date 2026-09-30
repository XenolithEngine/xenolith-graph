import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { demoSchemas, createCurveWidget, createXYPadWidget } from '@xenolithengine/demo'

type Status = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

const SAMPLE_PROMPTS = [
  'Build a simple linear pipeline: Source → Sample → Filter → Cache → Transform → Resolve. Use list_node_types first, then add_node without coordinates, connect pins by label, finally call auto_layout.',
  'Show me every available node type, one of each, fan them out from a single Source. End with auto_layout LR.',
  'Make a branching pipeline: Source feeds two parallel branches (Filter + Sample), both converge into Validate, then Resolve. Call auto_layout when done.',
  'First call list_node_types to see what is available, then design something that uses at least 8 node types and looks visually interesting after auto_layout.',
]
const URL_KEY = 'xeno.mcp.url'
const DEFAULT_URL = 'ws://127.0.0.1:7777?token=devtoken'

@Component({
  selector: 'mcp-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <div class="row">
          <span class="dot" [style.background]="dotColor()"></span>
          <strong>MCP {{ label() }}</strong>
        </div>
        <input [value]="url()" (input)="url.set(asValue($event))" [disabled]="status() === 'open' || status() === 'connecting'" placeholder="ws://127.0.0.1:7777?token=…" />
        <div class="row">
          @if (status() !== 'open') {
            <button type="button" class="btn on" [disabled]="status() === 'connecting'" (click)="connect()">{{ status() === 'connecting' ? 'Connecting…' : 'Connect' }}</button>
          } @else {
            <button type="button" class="btn" (click)="hangUp()">Disconnect</button>
          }
          <button type="button" class="btn" (click)="clearGraph()">Clear graph</button>
        </div>
        @if (err()) { <div class="err">{{ err() }}</div> }
        <details>
          <summary>Sample prompts (click to copy)</summary>
          @for (prompt of prompts; track prompt) {
            <button type="button" class="prompt" (click)="copy(prompt)">{{ prompt }}</button>
          }
          <em>Click to copy, then paste into Claude / Cursor chat.</em>
        </details>
      </div>
      <div class="log">
        <div class="muted">Log</div>
        @if (log().length === 0) {
          <div class="muted">Empty — connect and ask the AI to build something.</div>
        } @else {
          @for (line of log(); track $index) { <div class="line">{{ line }}</div> }
        }
      </div>
    </div>
  `,
  styles: [`
    .card, .log { position:absolute; left:12px; z-index:5; padding:10px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px; color:var(--xeno-text,#cfcfcf);
      font:13px system-ui,sans-serif; }
    .card { top:12px; max-width:360px; display:flex; flex-direction:column; gap:8px; }
    .log { bottom:12px; min-width:280px; max-width:360px; max-height:200px; overflow:auto; }
    .row { display:flex; align-items:center; gap:8px; }
    .dot { width:8px; height:8px; border-radius:8px; display:inline-block; }
    input, .prompt, .btn { font:inherit; font-size:11px; padding:6px 8px; border-radius:6px;
      background:var(--xeno-bg,#111); color:var(--xeno-text,#cfcfcf); border:1px solid var(--xeno-border,#333); }
    .btn { font-size:13px; padding:7px 12px; cursor:pointer; background:var(--xeno-elevated,#262626); }
    .btn.on { background:var(--xeno-accent,#FCB400); color:var(--xeno-canvas,#111); border-color:var(--xeno-accent,#FCB400); }
    .btn:disabled { opacity:.4; cursor:default; }
    .prompt { text-align:left; cursor:pointer; display:block; width:100%; margin-top:6px; }
    .err { font-size:11px; color:#e25b5b; white-space:pre-wrap; }
    .muted { font-size:11px; color:var(--xeno-muted,#9a9a9a); }
    .line { font:10px ui-monospace,monospace; }
    details { font-size:11px; color:var(--xeno-muted,#9a9a9a); }
  `],
})
export class MCPDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  private editor: XenolithEditor | null = null
  private disconnectFn: (() => void) | null = null
  readonly prompts = SAMPLE_PROMPTS
  url = signal(localStorage.getItem(URL_KEY) ?? DEFAULT_URL)
  status = signal<Status>('idle')
  err = signal<string | null>(null)
  log = signal<string[]>([])

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    this.editor = editor
    editor.registerWidget('curve', createCurveWidget())
    editor.registerWidget('xypad', createXYPadWidget())
    for (const schema of demoSchemas) editor.registry.register(schema)
    editor.view.fitView()
  }

  asValue(event: Event): string { return (event.target as HTMLInputElement).value }
  label(): string { return ({ idle: 'idle', connecting: 'connecting…', open: 'connected', closed: 'closed', error: 'error' })[this.status()] }
  dotColor(): string {
    const s = this.status()
    return s === 'open' ? '#3ddc97' : s === 'connecting' ? '#fcb400' : s === 'error' ? '#e25b5b' : '#666'
  }
  copy(text: string): void { void navigator.clipboard.writeText(text) }

  async connect(): Promise<void> {
    const editor = this.editor
    if (!editor) return
    localStorage.setItem(URL_KEY, this.url())
    this.err.set(null)
    this.status.set('connecting')
    this.append(`connect ${this.url()}`)
    try {
      this.disconnectFn = await editor.connectMCP(this.url(), {
        onStatus: (s) => { this.status.set(s); this.append(`status: ${s}`) },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.status.set('error')
      this.err.set(message)
      this.append(`error: ${message}`)
    }
  }

  hangUp(): void {
    this.disconnectFn?.()
    this.disconnectFn = null
    this.status.set('closed')
    this.append('disconnected')
  }

  clearGraph(): void {
    this.editor?.loadJSON({ version: 'xenolith.v1', nodes: [], edges: [] })
    this.append('graph cleared')
  }

  private append(line: string): void {
    const stamp = new Date().toLocaleTimeString()
    this.log.update((prev) => [...prev.slice(-29), `${stamp} ${line}`])
  }

  ngOnDestroy(): void {
    this.disconnectFn?.()
    this.disconnectFn = null
    this.graph.destroy()
  }
}
