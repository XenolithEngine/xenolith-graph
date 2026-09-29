<script setup lang="ts">
// Vue — method/auth are panel state. setWidgetValue makes displayOptions.show re-evaluate.
import { ref } from 'vue'
import { XenolithGraph, XenolithPanel } from '@xenolithengine/graph-vue'
import type { XenolithEditor } from '@xenolithengine/graph-editor'
import { setupConditionalWidgets, CONDITIONAL_WIDGETS_NODE_ID } from '@xenolithengine/demo/conditional-widgets'

type Method = 'GET' | 'POST' | 'PUT'
type Auth = 'none' | 'basic' | 'bearer'

const editor = ref<XenolithEditor | null>(null)
const method = ref<Method>('GET')
const auth = ref<Auth>('none')

function onReady(e: XenolithEditor): void {
  editor.value = e
  setupConditionalWidgets(e)
}
function onMethod(ev: Event): void {
  const next = (ev.target as HTMLSelectElement).value as Method
  method.value = next
  editor.value?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'method', next)
}
function onAuth(ev: Event): void {
  const next = (ev.target as HTMLSelectElement).value as Auth
  auth.value = next
  editor.value?.setWidgetValue(CONDITIONAL_WIDGETS_NODE_ID, 'auth', next)
}
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="onReady">
      <XenolithPanel position="top-left">
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:12px;">method</span>
          <select :value="method" style="font:inherit;font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--xeno-border);background:transparent;color:var(--xeno-text);" @change="onMethod">
            <option>GET</option><option>POST</option><option>PUT</option>
          </select>
          <span style="font-size:12px;margin-left:8px;">auth</span>
          <select :value="auth" style="font:inherit;font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--xeno-border);background:transparent;color:var(--xeno-text);" @change="onAuth">
            <option>none</option><option>basic</option><option>bearer</option>
          </select>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
