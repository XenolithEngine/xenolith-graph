// Angular — dive helpers called on the service editor. The card is host DOM.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupBreadcrumbDive, diveIntoSlug } from '@xenolithengine/demo/breadcrumb-dive'

@Component({
  selector: 'breadcrumb-dive-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn" (click)="dive('pipeline')">Dive into Pipeline</button>
        <button type="button" class="btn" (click)="dive('stage')">… then into Stage</button>
        <button type="button" class="btn" (click)="pop()">Pop to Root</button>
        <div class="note">Or double-click any $templateInstance node.</div>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; right:12px; z-index:5; display:flex; flex-direction:column;
      gap:6px; padding:8px; min-width:180px; background:var(--xeno-panel,#1d1d1d);
      border:1px solid var(--xeno-border,#333); border-radius:10px;
      color:var(--xeno-text,#cfcfcf); font:13px system-ui,sans-serif; }
    .btn { font:inherit; font-size:12px; padding:6px 12px; text-align:left; cursor:pointer;
      border-radius:6px; border:1px solid var(--xeno-border,#333); background:transparent;
      color:var(--xeno-text,#cfcfcf); }
    .note { font-size:11px; color:var(--xeno-muted,#9a9a9a); }
  `],
})
export class BreadcrumbDiveDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupBreadcrumbDive(editor)
  }

  dive(slug: 'pipeline' | 'stage'): void {
    const editor = this.graph.editor
    if (editor) diveIntoSlug(editor, slug)
  }

  pop(): void { this.graph.editor?.diveOut(0) }

  ngOnDestroy(): void { this.graph.destroy() }
}
