<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { XenolithPanel, XenolithButton, useEditor } from '@xenolithengine/graph-vue'

type Status = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

const SAMPLE_PROMPTS = [
  'Build a simple linear pipeline: Source → Sample → Filter → Cache → Transform → Resolve. Use list_node_types first, then add_node without coordinates, connect pins by label, finally call auto_layout.',
  'Show me every available node type, one of each, fan them out from a single Source. End with auto_layout LR.',
  'Make a branching pipeline: Source feeds two parallel branches (Filter + Sample), both converge into Validate, then Resolve. Call auto_layout when done.',
  'First call list_node_types to see what is available, then design something that uses at least 8 node types and looks visually interesting after auto_layout.',
]
const URL_KEY = 'xeno.mcp.url'
const DEFAULT_URL = 'ws://127.0.0.1:7777?token=devtoken'

const editor = useEditor()
const url = ref(localStorage.getItem(URL_KEY) ?? DEFAULT_URL)
const status = ref<Status>('idle')
const err = ref<string | null>(null)
const log = ref<string[]>([])
let disconnect: (() => void) | null = null

const stamp = (): string => new Date().toLocaleTimeString()
function append(line: string): void {
  log.value = [...log.value.slice(-29), `${stamp()} ${line}`]
}
const labelFor = (s: Status): string => ({ idle: 'idle', connecting: 'connecting…', open: 'connected', closed: 'closed', error: 'error' })[s]
function dotColor(s: Status): string {
  if (s === 'open') return '#3ddc97'
  if (s === 'connecting') return '#fcb400'
  if (s === 'error') return '#e25b5b'
  return '#666'
}

async function connect(): Promise<void> {
  const live = editor.value
  if (!live) return
  localStorage.setItem(URL_KEY, url.value)
  err.value = null
  status.value = 'connecting'
  append(`connect ${url.value}`)
  try {
    disconnect = await live.connectMCP(url.value, {
      onStatus: (s) => { status.value = s; append(`status: ${s}`) },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    status.value = 'error'
    err.value = message
    append(`error: ${message}`)
  }
}

function hangUp(): void {
  disconnect?.()
  disconnect = null
  status.value = 'closed'
  append('disconnected')
}

function clearGraph(): void {
  editor.value?.loadJSON({ version: 'xenolith.v1', nodes: [], edges: [] })
  append('graph cleared')
}

function copyPrompt(text: string): void {
  void navigator.clipboard.writeText(text)
}

onUnmounted(() => { disconnect?.(); disconnect = null })
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="display:flex;flex-direction:column;gap:8px;max-width:360px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span :style="{ width:'8px', height:'8px', borderRadius:'8px', background:dotColor(status), boxShadow: status === 'open' ? '0 0 8px #3ddc9788' : 'none' }" />
        <strong style="font-size:12px;">MCP {{ labelFor(status) }}</strong>
      </div>
      <input
        v-model="url"
        :disabled="status === 'open' || status === 'connecting'"
        placeholder="ws://127.0.0.1:7777?token=…"
        style="font:inherit;font-size:11px;padding:6px 8px;border-radius:6px;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);"
      />
      <div style="display:flex;gap:6px;">
        <XenolithButton v-if="status !== 'open'" :active="true" :disabled="status === 'connecting'" style="flex:1" @click="connect">
          {{ status === 'connecting' ? 'Connecting…' : 'Connect' }}
        </XenolithButton>
        <XenolithButton v-else style="flex:1" @click="hangUp">Disconnect</XenolithButton>
        <XenolithButton @click="clearGraph">Clear graph</XenolithButton>
      </div>
      <div v-if="err" style="font-size:11px;color:#e25b5b;white-space:pre-wrap;">{{ err }}</div>
      <details style="font-size:11px;color:var(--xeno-muted);">
        <summary style="cursor:pointer;">Sample prompts (click to copy)</summary>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
          <button
            v-for="(prompt, i) in SAMPLE_PROMPTS"
            :key="i"
            type="button"
            style="text-align:left;font:inherit;font-size:11px;line-height:1.35;padding:6px 8px;border-radius:6px;cursor:pointer;background:var(--xeno-bg);color:var(--xeno-text);border:1px solid var(--xeno-border);"
            @click="copyPrompt(prompt)"
          >{{ prompt }}</button>
          <em>Click to copy, then paste into Claude / Cursor chat.</em>
        </div>
      </details>
    </div>
  </XenolithPanel>

  <XenolithPanel position="bottom-left">
    <div style="min-width:280px;max-width:360px;max-height:200px;overflow:auto;">
      <div style="font-size:10px;color:var(--xeno-muted);margin-bottom:4px;">Log</div>
      <div v-if="log.length === 0" style="font-size:11px;color:var(--xeno-muted);">Empty — connect and ask the AI to build something.</div>
      <div v-for="(line, i) in log" :key="i" style="font-family:ui-monospace,monospace;font-size:10px;">{{ line }}</div>
    </div>
  </XenolithPanel>
</template>
