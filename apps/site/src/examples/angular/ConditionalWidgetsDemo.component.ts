// Angular — method/auth are signals. setWidgetValue makes displayOptions.show re-evaluate.
import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core'
import { XenolithGraphService } from '@xenolithengine/graph-angular'
import { setupConditionalWidgets, CONDITIONAL_WIDGETS_NODE_ID } from '@xenolithengine/demo/conditional-widgets'

type Method = 'GET' | 'POST' | 'PUT'
type Auth = 'none' | 'basic' | 'bearer'

@Component({
  selector: 'conditional-widgets-demo',
  standalone: true,
  providers: [XenolithGraphService],
  template: `
    <div style="position:absolute;inset:0;">
      <div #host class="xeno" style="position:absolute;inset:0;"></div>
      <div class="card">
        <span>method</span>
        <select [value]="method()" (change)="onMethod($event)">
          <option>GET</option><option>POST</option><option>PUT</option>
        </select>
        <span class="gap">auth</span>
        <select [value]="auth()" (change)="onAuth($event)">
          <option>none</option><option>basic</option><option>bearer</option>
        </select>
      </div>
    </div>
  `,
  styles: [`
    .card { position:absolute; top:12px; left:12px; z-index:5; display:flex; gap:8px; align-items:center;
      padding:8px; background:var(--xeno-panel,#1d1d1d); border:1px solid var(--xeno-border,#333);
      border-radius:10px; color:var(--xeno-text,#cfcfcf); font:12px system-ui,sans-serif; }
    .gap { margin-left:8px; }
    select { font:inherit; font-size:12px; padding:3px 6px; border-radius:4px;
      border:1px solid var(--xeno-border,#333); background:transparent; color:inherit; }
  `],
})
export class ConditionalWidgetsDemoComponent implements AfterViewInit, OnDestroy {
  private graph = inject(XenolithGraphService)
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host')
  method = signal<Method>('GET')
  auth = signal<Auth>('none')

  async ngAfterViewInit(): Promise<void> {
    const editor = await this.graph.mount(this.host().nativeElement, { resizeToWindow: false })
    setupConditionalWidgets(editor)
  }

  onMethod(ev: Event): void {
    const next = (ev.target as HTMLSelectElement).value as Method
    this.method.set(next)
    this.graph.editor?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'method', next)
  }

  onAuth(ev: Event): void {
    const next = (ev.target as HTMLSelectElement).value as Auth
    this.auth.set(next)
    this.graph.editor?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'auth', next)
  }

  ngOnDestroy(): void { this.graph.destroy() }
}
