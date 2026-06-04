// Angular standalone component — mount. The `<xenolith-graph>` component exposes a `(ready)`
// emitter that fires once the editor is mounted; we do the imperative seed work there.
import { Component } from '@angular/core'
import { XenolithGraphComponent } from '@xenolith/angular'
import type { XenolithEditor } from '@xenolith/editor'
import { buildMount } from '@xenolith/demo/mount'

@Component({
  selector: 'mount-demo',
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
export class MountDemoComponent {
  onReady(editor: XenolithEditor): void {
    buildMount(editor)
  }
}
