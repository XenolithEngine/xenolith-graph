<script setup lang="ts">
import { ref, watch } from 'vue'
import type { WidgetProps } from '@xenolithengine/graph-vue'

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Fig', 'Grape', 'Kiwi', 'Lemon', 'Mango', 'Orange', 'Peach', 'Pear', 'Plum', 'Raspberry', 'Strawberry', 'Watermelon']
function fakeSearch(q: string): Promise<string[]> {
  return new Promise((res) => setTimeout(() => res(FRUITS.filter((f) => f.toLowerCase().includes(q.toLowerCase())).slice(0, 6)), 350))
}

const props = defineProps<WidgetProps>()
const q = ref('')
const open = ref(false)
const loading = ref(false)
const opts = ref<string[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

watch([q, open], () => {
  clearTimeout(timer)
  if (!open.value) return
  loading.value = true
  timer = setTimeout(() => {
    void fakeSearch(q.value).then((rows) => { opts.value = rows; loading.value = false })
  }, 250)
})

function focus(): void { open.value = true; q.value = '' }
function blur(): void { setTimeout(() => { open.value = false }, 150) }
function pick(name: string): void { props.setValue(name); open.value = false }
function onQuery(event: Event): void { q.value = (event.target as HTMLInputElement).value }
</script>

<template>
  <div style="position:relative;width:100%;height:100%;">
    <input
      placeholder="Search fruit…"
      :value="open ? q : String(value ?? '')"
      style="width:100%;box-sizing:border-box;font:inherit;font-size:12px;padding:4px 6px;border-radius:6px;border:1px solid var(--xeno-border);background:var(--xeno-bg);color:var(--xeno-text);"
      @focus="focus"
      @blur="blur"
      @input="onQuery"
    />
    <div v-if="open" style="position:absolute;left:0;right:0;top:100%;z-index:5;margin-top:2px;background:var(--xeno-panel);border:1px solid var(--xeno-border);border-radius:6px;overflow:hidden;">
      <div v-if="loading" style="padding:4px 8px;font-size:12px;color:var(--xeno-muted);">Searching…</div>
      <div v-else-if="opts.length === 0" style="padding:4px 8px;font-size:12px;color:var(--xeno-muted);">No matches</div>
      <div
        v-for="name in opts"
        :key="name"
        style="padding:4px 8px;font-size:12px;cursor:pointer;color:var(--xeno-text);"
        @mousedown.prevent="pick(name)"
      >{{ name }}</div>
    </div>
  </div>
</template>
