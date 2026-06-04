<script setup lang="ts">
// Vue SFC — typed event callbacks wired to component state. `@ready` runs the one-time scene
// setup; `<EventsPanel>` is a child component that uses `useEditorEvent` for live subscriptions.
import { XenolithGraph } from '@xenolithengine/graph-vue'
import { loadDemo } from '@xenolithengine/demo/scene'
import EventsPanel from './EventsPanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="loadDemo">
      <EventsPanel />
    </XenolithGraph>
  </div>
</template>
