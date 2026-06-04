<script setup lang="ts">
// Vue island router for /learn/<id> pages. Mirrors TutorialReactChapter.tsx — lazy-loads the
// per-chapter SFC, remounts on the `xeno:reset` event.
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'

const MAP: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  '01-mount':            defineAsyncComponent(() => import('./vue/Chapter01.vue')),
  '02-register-schema':  defineAsyncComponent(() => import('./vue/Chapter02.vue')),
  '03-connect-edges':    defineAsyncComponent(() => import('./vue/Chapter03.vue')),
  '04-widgets':          defineAsyncComponent(() => import('./vue/Chapter04.vue')),
  '05-events':           defineAsyncComponent(() => import('./vue/Chapter05.vue')),
  '06-save-load':        defineAsyncComponent(() => import('./vue/Chapter06.vue')),
  '07-run-graph':        defineAsyncComponent(() => import('./vue/Chapter07.vue')),
  '08-make-it-yours':    defineAsyncComponent(() => import('./vue/Chapter08.vue')),
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
