// Angular — mount applies theme once. Later flips go through editor.setTheme (props are not re-watched).
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { xenTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'
import { loadDemo } from '@xenolithengine/demo/scene'

@Component({
  selector: 'theming-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <button type="button" class="btn" [class.on]="name() === 'xen'" (click)="setTheme('xen')">Xen</button>
        <button type="button" class="btn" [class.on]="name() === 'lg'" (click)="setTheme('lg')">Liquid Glass</button>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; gap:6px; padding:6px;
      background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; font:13px system-ui,sans-serif; }
    .btn { font:inherit; font-size:13px; padding:7px 12px; cursor:pointer; border-radius:8px;
      border:1px solid var(--xeno-border,#333); background:var(--xeno-elevated,#262626);
      color:var(--xeno-text,#cfcfcf); }
    .btn.on { border-color:var(--xeno-accent,#FCB400); background:var(--xeno-accent,#FCB400);
      color:var(--xeno-canvas,#111); }
  `],
})
export class ThemingDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  name = signal<'xen' | 'lg'>('xen')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, {
      resizeToWindow: false,
      theme: xenTheme,
    })
    editor.chrome.setControls({ position: 'top-right', orientation: 'horizontal' })
    loadDemo(editor)
  }

  setTheme(next: 'xen' | 'lg'): void {
    const editor = this.graph.editor
    if (!editor) return
    this.name.set(next)
    editor.setTheme(next === 'xen' ? xenTheme : liquidGlassTheme)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
