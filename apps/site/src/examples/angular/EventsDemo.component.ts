// Angular standalone component — events. Every editor event is exposed as a camelCase Output;
// bind with `(nodeClick)="…"` etc. Selection state + event log live in component fields.
import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { XenolithGraphComponent } from '@xenolith/angular'
import type { XenolithEditor, EditorEvents } from '@xenolith/editor'
import { loadDemo } from '@xenolith/demo/scene'

@Component({
  selector: 'events-demo',
  standalone: true,
  imports: [CommonModule, XenolithGraphComponent],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <xenolith-graph
        class="xeno"
        [resizeToWindow]="false"
        (ready)="onReady($event)"
        (nodeClick)="onNodeClick($event)"
        (selectionChanged)="onSelection($event)"
        (nodeMoved)="onMoved($event)"
        (edgeConnected)="onConnected($event)"
        (edgeDisconnected)="onDisconnected($event)"
        (widgetChanged)="onWidget($event)"
        (historyChanged)="onHistory($event)">
      </xenolith-graph>

      <div data-xeno-panel class="panel">
        <h3>Selection</h3>
        <p *ngIf="selection().length === 0" class="muted">Nothing selected.</p>
        <div *ngFor="let id of selection()" class="row"><span>{{ id }}</span></div>

        <h3>Event log</h3>
        <div class="log">
          <div *ngFor="let line of log()">{{ line }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [\`
    .panel { position:absolute; top:12px; right:12px; width:280px; max-height:calc(100% - 24px);
      overflow-y:auto; padding:12px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:8px;
      font:12px Inter,system-ui,sans-serif; color:var(--xeno-text,#cfcfcf); z-index:5; }
    h3 { margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#9a9a9a; }
    .muted { color:#9a9a9a; margin:0; }
    .log { font-family:ui-monospace,Menlo,monospace; font-size:11px; line-height:1.5; }
  \`],
})
export class EventsDemoComponent {
  selection = signal<string[]>([])
  log = signal<string[]>([])

  onReady(editor: XenolithEditor): void { loadDemo(editor) }

  private push(line: string): void {
    this.log.update((l) => [line, ...l].slice(0, 40))
  }

  onNodeClick(e: EditorEvents['node:click']): void { this.push(`node:click ${String(e.nodeId)}`) }
  onSelection(e: EditorEvents['selection:changed']): void {
    this.selection.set(e.nodeIds.map(String))
    this.push(`selection:changed (${e.nodeIds.length})`)
  }
  onMoved(e: EditorEvents['node:moved']): void {
    this.push(`node:moved ${String(e.nodeId)} → ${Math.round(e.position.x)},${Math.round(e.position.y)}`)
  }
  onConnected(e: EditorEvents['edge:connected']): void { this.push(`edge:connected ${String(e.edge.id)}`) }
  onDisconnected(e: EditorEvents['edge:disconnected']): void { this.push(`edge:disconnected ${String(e.edgeId)}`) }
  onWidget(e: EditorEvents['widget:changed']): void {
    this.push(`widget:changed ${e.widgetId} = ${JSON.stringify(e.value)}`)
  }
  onHistory(e: EditorEvents['history:changed']): void {
    this.push(`history undo=${e.canUndo} redo=${e.canRedo}`)
  }
}
