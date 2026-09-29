<script setup lang="ts">
// Vue — theme is a watched prop. Flip it and the graph plus the panel restyle together.
import { computed, ref } from 'vue'
import { XenolithGraph, XenolithControls, XenolithPanel, XenolithButton } from '@xenolithengine/graph-vue'
import { xenTheme } from '@xenolithengine/graph-render-pixi'
import { liquidGlassTheme } from '@xenolithengine/graph-theme-liquid-glass'
import { loadDemo } from '@xenolithengine/demo/scene'

const name = ref<'xen' | 'lg'>('xen')
const theme = computed(() => (name.value === 'xen' ? xenTheme : liquidGlassTheme))
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :theme="theme" :resize-to-window="false" @ready="loadDemo">
      <XenolithControls position="top-right" orientation="horizontal" />
      <XenolithPanel position="top-left">
        <div style="display:flex;gap:6px;">
          <XenolithButton :active="name === 'xen'" @click="name = 'xen'">Xen</XenolithButton>
          <XenolithButton :active="name === 'lg'" @click="name = 'lg'">Liquid Glass</XenolithButton>
        </div>
      </XenolithPanel>
    </XenolithGraph>
  </div>
</template>
