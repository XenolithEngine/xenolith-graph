import { Component, OnDestroy, signal } from '@angular/core'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { presentGraphDiff } from '@xenolithengine/demo/graph-diff-demo'
import { GraphDiffPaneComponent } from './GraphDiffPane.component'

@Component({
  selector: 'graph-diff-demo',
  standalone: true,
  imports: [GraphDiffPaneComponent],
  template: `
    <div style="position:absolute;inset:0;">
      <graph-diff-pane side="left" label="BEFORE" (ready)="onBefore($event)" />
      <graph-diff-pane side="right" label="AFTER" [counts]="counts()" (ready)="onAfter($event)" />
    </div>
  `,
})
export class GraphDiffDemoComponent implements OnDestroy {
  private before: XenolithEditor | null = null
  private after: XenolithEditor | null = null
  private presentation: { dispose(): void } | null = null
  counts = signal<{ added: number; modified: number; removed: number } | null>(null)

  onBefore(editor: XenolithEditor): void { this.before = editor; this.tryPresent() }
  onAfter(editor: XenolithEditor): void { this.after = editor; this.tryPresent() }

  private tryPresent(): void {
    if (!this.before || !this.after || this.presentation) return
    const presented = presentGraphDiff(this.before, this.after)
    this.presentation = presented
    this.counts.set({
      added: presented.diff.addedNodes.size,
      modified: presented.diff.modifiedNodes.size,
      removed: presented.diff.removedNodes.size,
    })
  }

  ngOnDestroy(): void { this.presentation?.dispose(); this.presentation = null }
}
