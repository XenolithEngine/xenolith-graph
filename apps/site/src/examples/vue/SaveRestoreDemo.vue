<script setup lang="ts">
// Vue SFC — save & restore. Framework-agnostic helpers (download/upload/autosave/restore) live in
// the shared package; this SFC is just the Vue-specific glue: emit `@ready` for one-time setup,
// host the panel as a child component (uses `useEditor` inside).
import { XenolithGraph } from '@xenolith/vue'
import { initSaveRestore } from '@xenolith/demo/save-restore'
import SavePanel from './SavePanel.vue'
</script>

<template>
  <div class="app" style="position:absolute;inset:0;">
    <XenolithGraph class="xeno" :resize-to-window="false" @ready="initSaveRestore">
      <SavePanel />
    </XenolithGraph>
  </div>
</template>
