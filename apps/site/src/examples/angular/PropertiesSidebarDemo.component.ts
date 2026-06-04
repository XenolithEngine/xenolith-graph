// Angular standalone component — properties sidebar. Auto-open via the `(ready)` Output; toggle
// is a direct editor call. Sidebar open-state lives only in the component that drives the button.
import { Component, signal } from '@angular/core'
import { XenolithGraphComponent } from '@xenolithengine/angular'
import type { XenolithEditor } from '@xenolithengine/editor'
import { setupPropertiesSidebar, PROPERTIES_SIDEBAR_NODE_ID } from '@xenolithengine/demo/properties-sidebar'

@Component({
  selector: 'properties-sidebar-demo',
  standalone: true,
  imports: [XenolithGraphComponent],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <xenolith-graph
        class="xeno"
        [resizeToWindow]="false"
        (ready)="onReady($event)">
      </xenolith-graph>

      <div data-xeno-panel class="panel">
        <button class="btn" [class.on]="open()" (click)="toggle()">
          {{ open() ? 'Close sidebar' : 'Open sidebar' }}
        </button>
      </div>
    </div>
  `,
  styles: [\`
    .panel { position:absolute; top:12px; left:12px; display:flex; gap:6px; padding:6px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:8px; font:12px Inter,system-ui,sans-serif; z-index:5; }
    .btn { padding:6px 12px; font-size:12px; cursor:pointer; border-radius:6px;
      border:1px solid var(--xeno-border,#333); background:transparent; color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
  \`],
})
export class PropertiesSidebarDemoComponent {
  private editor: XenolithEditor | null = null
  open = signal(true)

  onReady(editor: XenolithEditor): void {
    this.editor = editor
    setupPropertiesSidebar(editor)
    editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID)
  }

  toggle(): void {
    if (!this.editor) return
    if (this.open()) { this.editor.closeSidebar(); this.open.set(false) }
    else             { this.editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID); this.open.set(true) }
  }
}
