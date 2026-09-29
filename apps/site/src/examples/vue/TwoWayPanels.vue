<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { XenolithPanel, XenolithButton, useEditor, useEditorEvent, useSelection, useGraphJSON } from '@xenolithengine/graph-vue'
import type { WidgetSpec } from '@xenolithengine/graph-editor'

const editor = useEditor()
const selection = useSelection()
const json = useGraphJSON()
const bump = ref(0)
useEditorEvent('widget:changed', () => { bump.value++ })

const nodeId = computed(() => selection.value[0] ?? null)
const node = computed(() => {
  void bump.value
  const id = nodeId.value
  return id && editor.value ? editor.value.getNode(id) : undefined
})
const widgets = computed(() => (node.value?.widgets ?? []).filter((w) => w.key !== undefined))

function valueOf(id: string): unknown {
  void bump.value
  const nid = nodeId.value
  return nid && editor.value ? editor.value.getWidgetValue(nid, id) : undefined
}
function setValue(w: WidgetSpec, value: unknown): void {
  const nid = nodeId.value
  if (!nid || !editor.value) return
  editor.value.setWidgetValue(nid, w.id, value)
  bump.value++
}
function numBound(w: WidgetSpec, key: 'min' | 'max' | 'step', fallback: number): number {
  return key in w && typeof (w as Record<string, unknown>)[key] === 'number'
    ? (w as Record<string, number>)[key]!
    : fallback
}
function comboOptions(w: WidgetSpec): { value: string; label: string }[] {
  if (w.type !== 'combo') return []
  return w.values.map((o) => typeof o === 'string'
    ? { value: o, label: o }
    : { value: String(o.value), label: o.label })
}

const text = ref('')
const err = ref(false)
const focused = ref(false)
watch(json, (doc) => {
  if (doc && !focused.value) { text.value = JSON.stringify(doc, null, 2); err.value = false }
})
function apply(): void {
  const e = editor.value
  if (!e) return
  try {
    e.loadJSON(JSON.parse(text.value))
    e.view.fitView({ padding: 48, maxZoom: 1 })
    focused.value = false
    err.value = false
  } catch { err.value = true }
}
</script>

<template>
  <XenolithPanel position="top-left">
    <div style="width:340px;height:calc(100vh - 280px);min-height:220px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <XenolithButton :active="true" @click="apply">Apply JSON →</XenolithButton>
        <span v-if="err" style="color:#e06c5b;font-size:12px;">Invalid JSON</span>
      </div>
      <p style="margin:0;font-size:11.5px;color:var(--xeno-muted);">useGraphJSON() → the whole graph as state</p>
      <textarea
        :value="text"
        spellcheck="false"
        style="flex:1;resize:none;font:12px ui-monospace,monospace;background:var(--xeno-canvas);color:var(--xeno-text);border:1px solid var(--xeno-border);border-radius:6px;padding:8px;"
        @focus="focused = true"
        @blur="focused = false"
        @input="text = ($event.target as HTMLTextAreaElement).value"
      />
    </div>
  </XenolithPanel>

  <XenolithPanel position="top-right">
    <div style="width:232px;max-height:calc(100% - 24px);overflow-y:auto;">
      <h3 style="margin:0 0 6px;font-size:13px;">Inspector</h3>
      <p style="margin:0 0 8px;font-size:11.5px;color:var(--xeno-muted);">useSelection() → widgets</p>
      <p v-if="!node" style="color:var(--xeno-muted);">Select a node.</p>
      <p v-else-if="widgets.length === 0" style="color:var(--xeno-muted);">No editable widgets.</p>
      <label v-for="w in widgets" :key="String(w.id)" style="display:flex;flex-direction:column;gap:4px;margin:0 0 8px;font-size:12px;">
        <span>{{ w.label }}</span>
        <input v-if="w.type === 'slider' || w.type === 'number'" type="range"
          :min="numBound(w, 'min', 0)" :max="numBound(w, 'max', 1)"
          :step="w.type === 'slider' ? numBound(w, 'step', 0.01) : numBound(w, 'step', 1)"
          :value="Number(valueOf(String(w.id))) || 0"
          @input="setValue(w, ($event.target as HTMLInputElement).valueAsNumber)" />
        <input v-else-if="w.type === 'text'" type="text" :value="String(valueOf(String(w.id)) ?? '')"
          @input="setValue(w, ($event.target as HTMLInputElement).value)" />
        <input v-else-if="w.type === 'toggle'" type="checkbox" :checked="Boolean(valueOf(String(w.id)))"
          @change="setValue(w, ($event.target as HTMLInputElement).checked)" />
        <input v-else-if="w.type === 'color'" type="color" :value="String(valueOf(String(w.id)) ?? '#000000')"
          @input="setValue(w, ($event.target as HTMLInputElement).value)" />
        <select v-else-if="w.type === 'combo'" :value="String(valueOf(String(w.id)))"
          @change="setValue(w, ($event.target as HTMLSelectElement).value)">
          <option v-for="o in comboOptions(w)" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <em v-if="w.type === 'slider' || w.type === 'number'">{{ String(valueOf(String(w.id))) }}</em>
      </label>
    </div>
  </XenolithPanel>
</template>
