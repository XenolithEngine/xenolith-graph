// Angular standalone host component — properties sidebar. Auto-open after mount; toggle is a
// direct editor call. Sidebar open-state lives only in the component that drives the button.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupPropertiesSidebar, PROPERTIES_SIDEBAR_NODE_ID } from '@xenolithengine/demo/properties-sidebar'

@Component({
  selector: 'properties-sidebar-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>

      <div data-xeno-panel class="panel">
        <button class="btn" [class.on]="open()" (click)="toggle()">
          {{ open() ? 'Close sidebar' : 'Open sidebar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .panel { position:absolute; top:12px; left:12px; display:flex; gap:6px; padding:6px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:8px; font:12px Inter,system-ui,sans-serif; z-index:5; }
    .btn { padding:6px 12px; font-size:12px; cursor:pointer; border-radius:6px;
      border:1px solid var(--xeno-border,#333); background:transparent; color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
  `],
})
export class PropertiesSidebarDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  open = signal(true)

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupPropertiesSidebar(editor)
    editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID)
  }

  toggle(): void {
    const editor = this.graph.editor
    if (!editor) return
    if (this.open()) { editor.closeSidebar(); this.open.set(false) }
    else             { editor.openSidebar(PROPERTIES_SIDEBAR_NODE_ID); this.open.set(true) }
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
