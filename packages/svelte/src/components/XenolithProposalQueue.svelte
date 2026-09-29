<script lang="ts">
  import { getXenolithEditorContext } from '../context.js'

  const editor = getXenolithEditorContext()

  // Declarative wrapper over the core agent-proposal review panel (F1 / ADR 0007): mounted →
  // visible, unmounted → hidden. No propose-mode MCP session ever connected → a silent no-op
  // (showProposals returns false). Custom review UIs use editor.mcpProposals directly.
  $effect(() => {
    const e = $editor
    if (!e) return
    e.chrome.showProposals()
    return () => e.chrome.hideProposals()
  })
</script>
