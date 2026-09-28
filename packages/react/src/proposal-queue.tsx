'use client'
import { useEffect } from 'react'
import { useXenolithEditor } from './context.js'

/**
 * Declarative wrapper over the core agent-proposal review panel (F1 / ADR 0007). Mounting opens
 * `editor.chrome.showProposals()` — the panel + badge are rendered by the CORE in `overlayRoot`
 * (shared by every framework, themed via `--xeno-*`), so this component renders no DOM of its
 * own. No propose-mode MCP session ever connected → `showProposals()` is a no-op and mounting
 * stays visually silent. Hosts wanting a fully custom review UI use `editor.mcpProposals`
 * directly and never mount this.
 */
export function XenolithProposalQueue(): null {
  const editor = useXenolithEditor()
  useEffect(() => {
    if (!editor) return
    editor.chrome.showProposals()
    return () => { editor.chrome.hideProposals() }
  }, [editor])
  return null
}
