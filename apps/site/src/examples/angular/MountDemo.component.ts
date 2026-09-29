// Angular standalone host component — mount. Provides the XenolithGraphService per editor,
// mounts into a #host div from ngAfterViewInit, and does the imperative seed work on the
// resolved editor. The host component is YOURS — compiled by your Angular CLI; the adapter
// ships no components (Angular libraries need ng-packagr partial compilation), only the
// decorator-free service.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { buildMount } from '@xenolithengine/demo/mount'

@Component({
  selector: 'mount-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div class="app" style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
    </div>
  `,
})
export class MountDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    buildMount(editor)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
