<script lang="ts">
  import type { Component } from 'svelte'
  import type { Writable } from 'svelte/store'

  // Internal: renders the consumer's widget component with props streaming from a store the
  // svelteWidget bridge updates in place — mount once, mutate props, never remount.
  let { component, ctx }: { component: Component<Record<string, any>>; ctx: Writable<Record<string, any>> } = $props()
</script>

<svelte:component this={component} {...$ctx} />
