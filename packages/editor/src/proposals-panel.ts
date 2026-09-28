// F1 — Review UI for the agent-proposal queue (C-Bet1b / ADR 0007). The queue itself is
// transport-level (`mcp.ts`); this is its human face: a bottom-left panel listing pending
// agent operations and a badge that surfaces while the queue is non-empty. Approving routes
// through `queue.approve()` — the WHOLE batch lands as one undoable transaction; rejecting
// discards. The panel never mutates the graph itself, so it stays outside the command bus.
//
// Honest-identity rule: `clientId` is transport-provided and NOT authenticated (see the audit
// security notes in mcp.ts). The DOM labels it as such — a review UI must not lend the id an
// authority it does not have.

import type { ProposalApproveResult, ProposalQueue } from './mcp.js'

/** Cheap PREDICTED effect per tool — derived from the tool name only. The real deltas are
 *  measured at approval (audit entries); proposals re-resolve against the current graph, so
 *  anything stronger here would be a lie. */
const EFFECT_BY_TOOL: Record<string, string> = {
  add_node: '+ node',
  instantiate_recipe: '+ nodes',
  remove_node: '− node',
  connect_pins: '+ edge',
  disconnect_edge: '− edge',
  create_macro: 'group',
  expand_macro: 'group',
  collapse_macro: 'group',
  auto_layout: 'layout',
  set_widget_value: 'config',
  set_category_palette: 'style',
  set_theme: 'style',
  register_node_schema: 'schema',
  dive_into_template: 'view',
  dive_out: 'view',
}

export interface ProposalsPanelOpts {
  /** Editor's DOM overlay root — panel and badge mount here as children. */
  overlayRoot: HTMLElement
  /** The queue to review (`editor.mcpProposals`). */
  queue: ProposalQueue
  onApprove?: (result: ProposalApproveResult) => void
  onReject?: () => void
}

export class ProposalsPanel {
  readonly #opts: ProposalsPanelOpts
  #panel: HTMLDivElement | null = null
  #list: HTMLDivElement | null = null
  #count: HTMLSpanElement | null = null
  #badge: HTMLButtonElement | null = null
  #open = false
  #prevSize = 0
  #unsub: () => void

  constructor(opts: ProposalsPanelOpts) {
    this.#opts = opts
    this.#unsub = opts.queue.onChange(() => this.#sync())
  }

  isOpen(): boolean { return this.#open }

  open(): void {
    this.#open = true
    this.#ensurePanel()
    this.#renderList()
    this.#sync()
  }

  close(): void {
    this.#open = false
    if (this.#panel) this.#panel.style.display = 'none'
    this.#sync()
  }

  dispose(): void {
    this.#unsub()
    this.#panel?.remove()
    this.#badge?.remove()
    this.#panel = null
    this.#badge = null
    this.#list = null
    this.#count = null
    this.#open = false
  }

  // ────────────────────────────────────────────────────────────────────────────────────────────

  #sync(): void {
    const size = this.#opts.queue.size
    // The queue emptying from ANY path (panel action, host code, a second connection in auto
    // mode approving) leaves nothing to review — an open panel would show a stale list. Only
    // the TRANSITION non-empty → empty closes; opening onto an already-empty queue is a legal
    // "waiting for the agent" state and must stay open.
    if (this.#prevSize > 0 && size === 0 && this.#open) this.close()
    this.#prevSize = size
    if (size > 0 && !this.#badge) this.#ensureBadge()
    if (this.#badge) {
      const show = size > 0 && !this.#open
      // data-hidden is the test/e2e hook; display:none is what actually hides it — the badge
      // styles don't key off the attribute, so the attribute alone leaves a ghost pill visible.
      if (show) {
        this.#badge.removeAttribute('data-hidden')
        this.#badge.style.display = ''
      } else {
        this.#badge.setAttribute('data-hidden', '')
        this.#badge.style.display = 'none'
      }
      const label = this.#badge.querySelector('[data-xeno-proposals-badge-count]')
      if (label) label.textContent = String(size)
    }
    if (this.#open && this.#list) this.#renderList()
  }

  #renderList(): void {
    if (!this.#list || !this.#count) return
    const entries = this.#opts.queue.entries()
    this.#count.textContent = `${entries.length} pending`
    this.#list.replaceChildren(...entries.map((e) => this.#row(e.id, e.tool, e.clientId, e.summary)))
  }

  #row(id: number, tool: string, clientId: string, summary: string): HTMLDivElement {
    const row = document.createElement('div')
    row.setAttribute('data-xeno-proposal-entry', '')
    row.setAttribute('data-entry-id', String(id))
    row.setAttribute('data-entry-tool', tool)
    row.style.cssText = [
      'display:flex', 'align-items:baseline', 'gap:8px',
      'padding:7px 8px', 'border-radius:8px',
      'background:var(--xeno-elevated, #232323)',
      'font:12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
      'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
    ].join(';')

    const effect = document.createElement('span')
    effect.setAttribute('data-xeno-proposal-effect', '')
    effect.textContent = EFFECT_BY_TOOL[tool] ?? 'op'
    effect.style.cssText = 'flex:none; color:var(--xeno-accent, #d8b45a); min-width:52px;'

    const client = document.createElement('span')
    client.setAttribute('data-xeno-proposal-client', '')
    client.textContent = clientId
    client.title = 'transport-provided identity — NOT authenticated'
    client.style.cssText = 'flex:none; opacity:0.65;'

    const text = document.createElement('span')
    text.textContent = summary
    text.style.cssText = 'overflow:hidden; text-overflow:ellipsis;'

    const reject = document.createElement('button')
    reject.setAttribute('data-xeno-proposal-reject', '')
    reject.type = 'button'
    reject.title = 'Discard this proposal'
    reject.textContent = '✕'
    reject.style.cssText = this.#btnStyle(false) + 'padding:2px 7px;flex:none;'
    reject.addEventListener('click', () => {
      this.#opts.queue.reject([id])
      this.#opts.onReject?.()
    })

    row.append(effect, client, text, reject)
    return row
  }

  #ensurePanel(): void {
    if (this.#panel) {
      this.#panel.style.display = ''
      return
    }
    const p = document.createElement('div')
    p.setAttribute('data-xeno-proposals-panel', '')
    p.setAttribute('data-xeno-panel', '')
    p.style.cssText = [
      'position:absolute', 'left:12px', 'bottom:12px', 'z-index:20',
      'width:380px', 'max-height:56vh',
      'display:flex', 'flex-direction:column', 'gap:8px',
      'background:var(--xeno-panel, #1d1d1d)',
      'border:1px solid var(--xeno-border, #2a2a2a)', 'border-radius:12px',
      'color:var(--xeno-text, #cfcfcf)',
      'font:13px/1.4 Inter, system-ui, sans-serif',
      'box-shadow:0 10px 32px rgba(0,0,0,0.4)',
      'pointer-events:auto',
    ].join(';')

    const header = document.createElement('div')
    header.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px 12px 0;'
    const title = document.createElement('strong')
    title.textContent = 'Agent proposals'
    title.style.cssText = 'flex:none;'
    this.#count = document.createElement('span')
    this.#count.setAttribute('data-xeno-proposals-count', '')
    this.#count.style.cssText = 'flex:1; opacity:0.7;'
    const close = document.createElement('button')
    close.setAttribute('data-xeno-proposals-close', '')
    close.type = 'button'
    close.textContent = '✕'
    close.title = 'Hide the review panel'
    close.style.cssText = this.#btnStyle(false) + 'padding:4px 9px;'
    close.addEventListener('click', () => this.close())
    header.append(title, this.#count, close)

    this.#list = document.createElement('div')
    this.#list.setAttribute('data-xeno-proposals-list', '')
    this.#list.style.cssText = [
      'display:flex', 'flex-direction:column', 'gap:4px',
      'overflow-y:auto', 'padding:0 12px',
    ].join(';')

    const note = document.createElement('div')
    note.textContent = 'Approving applies the whole batch as ONE undo step. Client identity is transport-provided, not authenticated.'
    note.style.cssText = 'padding:0 12px; opacity:0.55; font-size:11.5px;'

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex; gap:8px; padding:0 12px 12px;'
    const approve = document.createElement('button')
    approve.setAttribute('data-xeno-proposals-approve', '')
    approve.type = 'button'
    approve.textContent = 'Approve all'
    approve.style.cssText = this.#btnStyle(true) + 'flex:1;padding:8px 0;'
    approve.addEventListener('click', () => {
      const result = this.#opts.queue.approve()
      this.#opts.onApprove?.(result)
    })
    const reject = document.createElement('button')
    reject.setAttribute('data-xeno-proposals-reject', '')
    reject.type = 'button'
    reject.textContent = 'Reject all'
    reject.style.cssText = this.#btnStyle(false) + 'flex:1;padding:8px 0;'
    reject.addEventListener('click', () => {
      this.#opts.queue.reject()
      this.#opts.onReject?.()
    })
    actions.append(approve, reject)

    p.append(header, this.#list, note, actions)
    this.#opts.overlayRoot.appendChild(p)
    this.#panel = p
  }

  #ensureBadge(): void {
    if (this.#badge) return
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('data-xeno-proposals-badge', '')
    b.setAttribute('data-hidden', '')
    b.style.cssText = [
      'position:absolute', 'left:12px', 'bottom:12px', 'z-index:19',
      'display:flex', 'align-items:center', 'gap:8px',
      'padding:8px 14px', 'border-radius:10px', 'cursor:pointer',
      'background:var(--xeno-panel, #1d1d1d)',
      'border:1px solid var(--xeno-accent, #d8b45a)',
      'color:var(--xeno-text, #cfcfcf)',
      'font:13px/1 Inter, system-ui, sans-serif',
      'box-shadow:0 6px 24px rgba(0,0,0,0.35)',
      'pointer-events:auto',
    ].join(';')
    const mark = document.createElement('span')
    mark.textContent = '⟡'
    mark.style.cssText = 'color:var(--xeno-accent, #d8b45a);'
    const label = document.createElement('span')
    label.textContent = 'agent proposals — review'
    const count = document.createElement('span')
    count.setAttribute('data-xeno-proposals-badge-count', '')
    count.style.cssText = [
      'background:var(--xeno-accent, #d8b45a)', 'color:var(--xeno-canvas, #111)',
      'border-radius:8px', 'padding:2px 7px', 'font-weight:700',
    ].join(';')
    b.append(mark, label, count)
    b.addEventListener('click', () => this.open())
    this.#opts.overlayRoot.appendChild(b)
    this.#badge = b
  }

  #btnStyle(accent: boolean): string {
    return [
      `border:1px solid ${accent ? 'var(--xeno-accent, #d8b45a)' : 'var(--xeno-border, #2a2a2a)'}`,
      `background:${accent ? 'var(--xeno-accent, #d8b45a)' : 'var(--xeno-elevated, #232323)'}`,
      `color:${accent ? 'var(--xeno-canvas, #111)' : 'var(--xeno-text, #cfcfcf)'}`,
      'border-radius:8px', 'font:inherit', 'cursor:pointer',
    ].join(';')
  }
}
