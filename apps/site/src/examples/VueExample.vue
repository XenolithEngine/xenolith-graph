<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'

// Vue equivalent of ReactExample. Lazy-loaded SFC per example id; remounts on `xeno:reset`.
const MAP: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  mount:                defineAsyncComponent(() => import('./vue/MountDemo.vue')),
  events:               defineAsyncComponent(() => import('./vue/EventsDemo.vue')),
  'save-restore':       defineAsyncComponent(() => import('./vue/SaveRestoreDemo.vue')),
  'properties-sidebar': defineAsyncComponent(() => import('./vue/PropertiesSidebarDemo.vue')),
  'palette-sidebar':    defineAsyncComponent(() => import('./vue/PaletteSidebarDemo.vue')),
}

const props = defineProps<{ id: string }>()

const Cmp = computed(() => MAP[props.id] ?? null)
const nonce = ref(0)

function onReset(e: Event): void {
  const detail = (e as CustomEvent<{ id?: string }>).detail
  if (!detail?.id || detail.id === props.id) nonce.value++
}

onMounted(() => document.addEventListener('xeno:reset', onReset))
onUnmounted(() => document.removeEventListener('xeno:reset', onReset))
</script>

<template>
  <div :key="nonce" class="app" style="position:absolute;inset:0;display:flex;height:auto;">
    <component :is="Cmp" v-if="Cmp" />
  </div>
</template>
