// Angular standalone component — palette sidebar. Schemas + sidebar config from the shared
// package; the editor's built-in `node:drop` handler spawns the dragged node at the drop point.
import { Component } from '@angular/core'
import { XenolithGraphComponent } from '@xenolith/angular'
import type { XenolithEditor } from '@xenolith/editor'
import { buildPaletteSidebar } from '@xenolith/demo/palette-sidebar'

@Component({
  selector: 'palette-sidebar-demo',
  standalone: true,
  imports: [XenolithGraphComponent],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <xenolith-graph
        class="xeno"
        [resizeToWindow]="false"
        (ready)="onReady($event)">
      </xenolith-graph>
    </div>
  `,
})
export class PaletteSidebarDemoComponent {
  onReady(editor: XenolithEditor): void {
    buildPaletteSidebar(editor)
    editor.view.fitView({ padding: 80, maxZoom: 1 })
  }
}
