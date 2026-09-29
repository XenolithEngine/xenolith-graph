import { createEditorBinding, type EditorBinding, type XenolithProps } from '@xenolithengine/graph-adapter-core'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { readAttributes, FORWARDED_EVENTS } from './attrs.js'

// SSR guard: `class … extends HTMLElement` evaluates the base at MODULE scope, which throws
// `HTMLElement is not defined` in non-DOM environments (Next.js server bundle, bare node).
// Fall back to a plain base there — `register()` already no-ops without `customElements`, so
// the class is only ever DEFINED against a real DOM. Keeps the package import-safe for SSR.
const ElementBase: typeof HTMLElement = typeof HTMLElement === 'undefined'
  ? (class {} as unknown as typeof HTMLElement)
  : HTMLElement

/** `<xenolith-graph>` — the universal adapter. Declarative attributes (`minimap`, `fit-on-load`,
 *  `disable-grid`, `resize-to-window`, `snap`) and JS properties (`theme`, `graph`,
 *  `zoomBounds`, `isValidConnection`) feed the editor; every public editor event (all 25,
 *  derived from `EDITOR_EVENT_NAMES`) is re-emitted off the element as a same-named CustomEvent,
 *  and `ready` (detail: the `XenolithEditor`) fires once after mount — the imperative handle
 *  (`el.editor`) never needs polling. Works in any framework that speaks DOM (Angular, Vue,
 *  Svelte, Lit, Astro, vanilla).
 *
 *  Attribute sources and JS-property sources are tracked separately and re-merged on every
 *  change, so removing an attribute actually clears the prop (no stale merge). */
export class XenolithGraphElement extends ElementBase {
  static get observedAttributes(): string[] {
    return ['minimap', 'fit-on-load', 'disable-grid', 'resize-to-window', 'snap']
  }

  #binding: EditorBinding | null = null
  #attrProps: Partial<XenolithProps> = {}
  #jsProps: Partial<XenolithProps> = {}
  #offs: Array<() => void> = []
  #mounting = false

  set theme(v: XenolithProps['theme']) { this.#patch({ theme: v }) }
  get theme(): XenolithProps['theme'] { return this.#jsProps.theme }
  set graph(v: unknown) { this.#patch({ graph: v }) }
  get graph(): unknown { return this.#jsProps.graph }
  set zoomBounds(v: XenolithProps['zoomBounds']) { this.#patch({ zoomBounds: v }) }
  get zoomBounds(): XenolithProps['zoomBounds'] { return this.#jsProps.zoomBounds }
  set isValidConnection(v: XenolithProps['isValidConnection']) { this.#patch({ isValidConnection: v }) }
  get isValidConnection(): XenolithProps['isValidConnection'] { return this.#jsProps.isValidConnection }

  /** The live editor instance, or null before mount / after teardown. */
  get editor(): XenolithEditor | null { return this.#binding?.editor ?? null }

  connectedCallback(): void {
    this.#attrProps = readAttributes(this)
    void this.#mount()
  }

  disconnectedCallback(): void {
    for (const off of this.#offs) off()
    this.#offs = []
    this.#binding?.destroy()
    this.#binding = null
  }

  attributeChangedCallback(): void {
    // Recompute the whole attribute slice — a removed attribute must not linger from the
    // previous read (presence-based parse → absent key drops out of the merge).
    this.#attrProps = readAttributes(this)
    this.#sync()
  }

  async #mount(): Promise<void> {
    if (this.#mounting || this.#binding) return
    this.#mounting = true
    let binding: EditorBinding
    try {
      binding = await createEditorBinding(this, this.#merged())
    } finally {
      this.#mounting = false
    }
    if (!this.isConnected) { binding.destroy(); return } // detached while awaiting init
    this.#binding = binding
    for (const name of FORWARDED_EVENTS) {
      this.#offs.push(
        binding.on(name, (detail) =>
          this.dispatchEvent(new CustomEvent(name, { detail, bubbles: false })),
        ),
      )
    }
    this.dispatchEvent(new CustomEvent('ready', { detail: binding.editor }))
  }

  #merged(): XenolithProps {
    return { ...this.#attrProps, ...this.#jsProps }
  }

  #sync(): void {
    this.#binding?.setProps(this.#merged())
  }

  #patch(partial: Partial<XenolithProps>): void {
    this.#jsProps = { ...this.#jsProps, ...partial }
    this.#sync()
  }
}
