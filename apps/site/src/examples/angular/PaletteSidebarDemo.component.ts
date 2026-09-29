// Angular standalone host component — palette sidebar. Schemas + sidebar config from the
// shared package; the editor's built-in `node:drop` handler spawns the dragged node at the
// drop point. mount() resolves the editor for one-shot seed work.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { buildPaletteSidebar } from '@xenolithengine/demo/palette-sidebar'

@Component({
  selector: 'palette-sidebar-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
    </div>
  `,
})
export class PaletteSidebarDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    buildPaletteSidebar(editor)
    editor.view.fitView({ padding: 80, maxZoom: 1 })
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
