// Angular — every built-in widget on one node. The node is data; this file only mounts it.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { buildBuiltinWidgets } from '@xenolithengine/demo/builtin-widgets'

@Component({
  selector: 'builtin-widgets-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
    </div>
  `,
})
export class BuiltinWidgetsDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    buildBuiltinWidgets(editor)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
