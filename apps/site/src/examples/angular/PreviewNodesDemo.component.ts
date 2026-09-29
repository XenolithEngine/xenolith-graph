// Angular — per-node canvas drawing. No panel: setupPreviewNodes registers the widgets and the poller.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupPreviewNodes } from '@xenolithengine/demo/preview-nodes'

@Component({
  selector: 'preview-nodes-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
    </div>
  `,
})
export class PreviewNodesDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupPreviewNodes(editor)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
