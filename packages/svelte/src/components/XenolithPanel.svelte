<script lang="ts">
  import type { Snippet } from 'svelte'
  import { getXenolithEditorContext } from '../context.js'

  type Pos = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  interface Props { position?: Pos; bare?: boolean; children?: Snippet }

  let { position = 'top-left', bare = false, children }: Props = $props()

  const POS: Record<Pos, string> = {
    'top-left':      'top:12px;left:12px',
    'top-center':    'top:12px;left:50%;transform:translateX(-50%)',
    'top-right':     'top:12px;right:12px',
    'bottom-left':   'bottom:12px;left:12px',
    'bottom-center': 'bottom:12px;left:50%;transform:translateX(-50%)',
    'bottom-right':  'bottom:12px;right:12px',
  }

  const CHROME = 'background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:10px;padding:10px;color:var(--xeno-text);box-shadow:0 6px 24px rgba(0,0,0,0.35);font-family:system-ui,sans-serif;font-size:13px'

  const editor = getXenolithEditorContext()

  // Svelte has no Teleport — an action reparents the panel into the editor's overlay layer so it
  // lives "in" the graph and inherits the theme's --xeno-* vars.
  function portal(node: HTMLElement, target: HTMLElement | null): { update(t: HTMLElement | null): void; destroy(): void } {
    const attach = (t: HTMLElement | null): void => { if (t && node.parentElement !== t) t.appendChild(node) }
    attach(target)
    return { update: attach, destroy: () => node.remove() }
  }
</script>

{#if $editor}
  <div
    use:portal={$editor.chrome.overlayRoot}
    data-xeno-panel=""
    style={`position:absolute;pointer-events:auto;${POS[position]}${bare ? '' : `;${CHROME}`}`}
  >
    {@render children?.()}
  </div>
{/if}
