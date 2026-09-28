// H1 — Ctrl+F search over EXISTING graph nodes (the insert palette searches TYPES to spawn;
// this finds what you already built — on a 58k-node graph there is no living without it).
// Pure DOM overlay like the insert palette: mounts into the editor's overlayRoot, styles from
// the theme's --xeno-* vars, no framework coupling. Filtering runs the SAME semantics as the
// MCP find_nodes tool (title/type substring) plus a 50-row display cap.

import type { FoundNode, FindNodesQuery } from './find-nodes.js'

const MAX_ROWS = 50

export interface SearchPaletteOpts {
  overlayRoot: HTMLElement
  /** Run the query (same semantics as the MCP find_nodes tool + type match). */
  find: (query: FindNodesQuery) => FoundNode[]
  /** A result was chosen (Enter / click) — the editor selects + centers the node. */
  onPick: (nodeId: string) => void
  onClose?: () => void
}

export class SearchPalette {
  readonly #opts: SearchPaletteOpts
  #panel: HTMLDivElement | null = null
  #input: HTMLInputElement | null = null
  #list: HTMLDivElement | null = null
  #rows: HTMLDivElement[] = []
  #results: FoundNode[] = []
  #active = 0
  #open = false

  constructor(opts: SearchPaletteOpts) {
    this.#opts = opts
  }

  get isOpen(): boolean { return this.#open }

  open(): void {
    this.#open = true
    if (!this.#panel) this.#build()
    this.#panel!.style.display = ''
    this.#input!.value = ''
    this.#refilter()
    this.#input!.focus()
  }

  close(): void {
    if (!this.#open) return
    this.#open = false
    this.#panel!.style.display = 'none'
    this.#opts.onClose?.()
  }

  dispose(): void {
    this.#panel?.remove()
    this.#panel = null
    this.#input = null
    this.#list = null
    this.#rows = []
    this.#open = false
  }

  // ────────────────────────────────────────────────────────────────────────────────────────────

  #build(): void {
    const p = document.createElement('div')
    p.setAttribute('data-xeno-search', '')
    p.setAttribute('data-xeno-panel', '')
    p.style.cssText = [
      'position:absolute', 'top:12px', 'left:50%', 'transform:translateX(-50%)', 'z-index:25',
      'width:420px', 'max-height:46vh',
      'display:flex', 'flex-direction:column', 'gap:6px',
      'background:var(--xeno-panel, #1d1d1d)',
      'border:1px solid var(--xeno-border, #2a2a2a)', 'border-radius:12px',
      'color:var(--xeno-text, #cfcfcf)',
      'font:13px/1.4 Inter, system-ui, sans-serif',
      'box-shadow:0 10px 32px rgba(0,0,0,0.4)',
      'pointer-events:auto',
    ].join(';')

    const input = document.createElement('input')
    input.setAttribute('data-xeno-search-input', '')
    input.type = 'text'
    input.placeholder = 'Search nodes… (title or type)'
    input.style.cssText = [
      'margin:10px 12px 0', 'padding:8px 10px',
      'background:var(--xeno-elevated, #232323)',
      'border:1px solid var(--xeno-border, #2a2a2a)', 'border-radius:8px',
      'color:var(--xeno-text, #cfcfcf)', 'font:inherit', 'outline:none',
    ].join(';')
    input.addEventListener('input', () => this.#refilter())
    input.addEventListener('keydown', (e) => this.#onKeyDown(e as KeyboardEvent))

    const list = document.createElement('div')
    list.setAttribute('data-xeno-search-list', '')
    list.style.cssText = 'display:flex; flex-direction:column; gap:2px; overflow-y:auto; padding:0 12px 10px;'

    p.append(input, list)
    this.#opts.overlayRoot.appendChild(p)
    this.#panel = p
    this.#input = input
    this.#list = list
  }

  #refilter(): void {
    if (!this.#list) return
    const q = this.#input!.value.trim()
    const all = this.#opts.find({ titleContains: q })
    // Type match is a human convenience the MCP tool expresses via {type} — fold it in so one
    // box does both (title OR type substring).
    const byType = q ? this.#opts.find({ type: q }) : []
    const seen = new Set(all.map((n) => n.id))
    const merged = [...all, ...byType.filter((n) => !seen.has(n.id))]
    this.#results = merged.slice(0, MAX_ROWS)
    this.#active = 0
    this.#rows = this.#results.map((n, i) => this.#row(n, i))
    if (this.#rows.length === 0) {
      const empty = document.createElement('div')
      empty.setAttribute('data-xeno-search-empty', '')
      empty.textContent = q ? `No nodes matching “${q}”` : 'Type to search the graph'
      empty.style.cssText = 'opacity:0.6; padding:6px 2px;'
      this.#list.replaceChildren(empty)
    } else {
      this.#list.replaceChildren(...this.#rows)
      this.#highlight()
    }
  }

  #row(n: FoundNode, index: number): HTMLDivElement {
    const row = document.createElement('div')
    row.setAttribute('data-xeno-search-result', '')
    row.setAttribute('data-node-id', n.id)
    const label = document.createElement('span')
    label.textContent = n.title ?? n.type
    label.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;'
    const type = document.createElement('span')
    type.textContent = n.type
    type.style.cssText = 'flex:none; opacity:0.55; font-size:11.5px;'
    row.append(label, type)
    row.style.cssText = [
      'display:flex', 'align-items:baseline', 'gap:8px',
      'padding:6px 8px', 'border-radius:8px', 'cursor:pointer',
      'background:var(--xeno-elevated, #232323)',
    ].join(';')
    const pick = (): void => { this.#pick(n.id) }
    row.addEventListener('click', pick)
    row.addEventListener('mouseenter', () => { this.#active = index; this.#highlight() })
    return row
  }

  #highlight(): void {
    for (const [i, row] of this.#rows.entries()) {
      row.style.outline = i === this.#active ? '1px solid var(--xeno-accent, #d8b45a)' : 'none'
    }
    // jsdom has no scrollIntoView — optional call keeps the unit suite runnable.
    this.#rows[this.#active]?.scrollIntoView?.({ block: 'nearest' })
  }

  #onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.#active = Math.min(this.#active + 1, this.#rows.length - 1); this.#highlight(); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.#active = Math.max(this.#active - 1, 0); this.#highlight(); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      const hit = this.#results[this.#active]
      if (hit) this.#pick(hit.id)
    }
  }

  #pick(nodeId: string): void {
    this.close()
    this.#opts.onPick(nodeId)
  }
}
