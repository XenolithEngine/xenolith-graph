import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import type { XenolithEditor } from '@xenolithengine/graph-editor'

@Component({
  selector: 'graph-diff-pane',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div #host class="xeno" style="position:absolute;inset:0;"></div>
    <div class="label">
      <div class="title">{{ label }}</div>
      @if (counts) {
        <div class="legend">
          <span class="swatch" style="background:#39d98a"></span> added {{ counts.added }}
          <span class="swatch" style="background:#fcb400"></span> modified {{ counts.modified }}
          <span class="swatch" style="background:#ff5b6e"></span> removed {{ counts.removed }}
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; position:absolute; top:0; bottom:0; overflow:hidden; }
    :host(.left) { left:0; right:50%; border-right:1px solid var(--xeno-border,#222); }
    :host(.right) { left:50%; right:0; }
    .label { position:absolute; top:12px; left:12px; z-index:5; padding:8px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px; color:var(--xeno-text,#cfcfcf);
      font:13px system-ui,sans-serif; }
    .title { font-size:12px; font-weight:600; }
    .legend { font-size:11px; color:var(--xeno-muted,#9a9a9a); display:flex; align-items:center; margin-top:6px; }
    .swatch { display:inline-block; width:10px; height:10px; border-radius:10px; margin:0 6px 0 10px; }
  `],
  host: { '[class.left]': 'side === "left"', '[class.right]': 'side === "right"' },
})
export class GraphDiffPaneComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  @Input() side: 'left' | 'right' = 'left'
  @Input() label = ''
  @Input() counts: { added: number; modified: number; removed: number } | null = null
  @Output() ready = new EventEmitter<XenolithEditor>()

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    this.ready.emit(editor)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
